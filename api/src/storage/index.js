/**
 * JSON Storage Module - Robust File-based Persistence
 * 
 * Features:
 * - Atomic writes (write to .tmp, then rename)
 * - In-process mutex for serialized writes
 * - File locking with proper-lockfile
 * - In-memory caching with auto-reload
 * - Index support for fast queries
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import lockfile from 'proper-lockfile';
import { nanoid } from 'nanoid';

// Simple in-process mutex
class Mutex {
  constructor() {
    this.locked = false;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.locked = false;
    }
  }
}

// Storage class for each collection
class Collection {
  constructor(name, dataDir, indexes = []) {
    this.name = name;
    this.filePath = path.join(dataDir, `${name}.json`);
    this.mutex = new Mutex();
    this.cache = null;
    this.lastModified = null;
    this.indexFields = indexes;
    this.indexes = {};
    
    // Ensure file exists
    if (!existsSync(this.filePath)) {
      this._writeFileSync([]);
    }
  }

 _writeFileSync(data) {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // Build indexes for fast lookups
  _buildIndexes(data) {
    this.indexes = {};
    for (const field of this.indexFields) {
      this.indexes[field] = new Map();
    }
    
    for (const item of data) {
      for (const field of this.indexFields) {
        const value = item[field];
        if (value !== undefined) {
          if (!this.indexes[field].has(value)) {
            this.indexes[field].set(value, []);
          }
          this.indexes[field].get(value).push(item);
        }
      }
    }
  }

  // Update indexes when data changes
  _updateIndex(item, action = 'add') {
    for (const field of this.indexFields) {
      const value = item[field];
      if (value !== undefined) {
        if (action === 'add') {
          if (!this.indexes[field].has(value)) {
            this.indexes[field].set(value, []);
          }
          this.indexes[field].get(value).push(item);
        } else if (action === 'remove') {
          const list = this.indexes[field].get(value);
          if (list) {
            const idx = list.findIndex(i => i.id === item.id);
            if (idx !== -1) list.splice(idx, 1);
          }
        }
      }
    }
  }

  // Load data with caching
  async load() {
    await this.mutex.acquire();
    try {
      const stat = await fs.stat(this.filePath);
      const mtime = stat.mtimeMs;
      
      if (this.cache && this.lastModified === mtime) {
        return [...this.cache];
      }
      
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.cache = JSON.parse(content);
      this.lastModified = mtime;
      this._buildIndexes(this.cache);
      
      return [...this.cache];
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.cache = [];
        this._buildIndexes([]);
        return [];
      }
      throw error;
    } finally {
      this.mutex.release();
    }
  }

  // Atomic write with locking
  async save(data) {
    await this.mutex.acquire();
    let release = null;
    
    try {
      // Acquire file lock
      try {
        release = await lockfile.lock(this.filePath, { 
          retries: 5, 
          stale: 10000 
        });
      } catch (e) {
        // If file doesn't exist or locking fails, proceed with write
        console.warn(`Lock warning for ${this.name}:`, e.message);
      }
      
      // Write to temp file first
      const tmpPath = `${this.filePath}.tmp`;
      await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      
      // Atomic rename
      await fs.rename(tmpPath, this.filePath);
      
      // Update cache
      this.cache = data;
      const stat = await fs.stat(this.filePath);
      this.lastModified = stat.mtimeMs;
      this._buildIndexes(data);
      
    } finally {
      if (release) {
        await release();
      }
      this.mutex.release();
    }
  }

  // Query by indexed field
  async findByIndex(field, value) {
    await this.load(); // Ensure indexes are fresh
    return this.indexes[field]?.get(value) || [];
  }

  // CRUD Operations
  async findAll() {
    return this.load();
  }

  async findById(id) {
    const data = await this.load();
    return data.find(item => item.id === id) || null;
  }

  async findOne(predicate) {
    const data = await this.load();
    return data.find(predicate) || null;
  }

  async findMany(predicate) {
    const data = await this.load();
    return data.filter(predicate);
  }

  async create(item) {
    const data = await this.load();
    const newItem = {
      id: nanoid(12),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.push(newItem);
    await this.save(data);
    return newItem;
  }

  async update(id, updates) {
    const data = await this.load();
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    const oldItem = data[index];
    data[index] = {
      ...oldItem,
      ...updates,
      id: oldItem.id, // Prevent id change
      created_at: oldItem.created_at, // Prevent creation date change
      updated_at: new Date().toISOString()
    };
    
    await this.save(data);
    return data[index];
  }

  async delete(id) {
    const data = await this.load();
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    data.splice(index, 1);
    await this.save(data);
    return true;
  }

  async upsert(predicate, item) {
    const data = await this.load();
    const existing = data.find(predicate);
    
    if (existing) {
      return this.update(existing.id, item);
    } else {
      return this.create(item);
    }
  }
}

// Storage Manager
class Storage {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.collections = {};
    
    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }

  // Initialize all collections
  init() {
    this.collections = {
      users: new Collection('users', this.dataDir, ['email', 'role']),
      programs: new Collection('programs', this.dataDir, ['agency_id', 'destination']),
      orders: new Collection('orders', this.dataDir, ['agency_id', 'status', 'customer_email']),
      payments: new Collection('payments', this.dataDir, ['order_id', 'status', 'idempotency_key'])
    };
    
    console.log(`📁 Storage initialized at: ${this.dataDir}`);
    return this;
  }

  // Get collection
  get(name) {
    if (!this.collections[name]) {
      throw new Error(`Collection ${name} not found`);
    }
    return this.collections[name];
  }

  // Shorthand accessors
  get users() { return this.get('users'); }
  get programs() { return this.get('programs'); }
  get orders() { return this.get('orders'); }
  get payments() { return this.get('payments'); }
}

// Singleton instance
let storageInstance = null;

export function initStorage(dataDir) {
  storageInstance = new Storage(dataDir).init();
  return storageInstance;
}

export function getStorage() {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initStorage first.');
  }
  return storageInstance;
}

export { Storage, Collection };
