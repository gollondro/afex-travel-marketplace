/**
 * API Client for AFEX Travel Marketplace
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new APIError(
      response.status,
      data.code || 'UNKNOWN_ERROR',
      data.error || data.message || 'An error occurred',
      data.details
    );
  }

  return data as T;
}

// ==================
// Auth API
// ==================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agency';
  status: string;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export const authAPI = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  register: (data: { email: string; password: string; name: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: data,
    }),

  me: (token: string) =>
    request<{ user: User }>('/api/auth/me', { token }),

  refresh: (token: string) =>
    request<{ token: string }>('/api/auth/refresh', {
      method: 'POST',
      token,
    }),
};

// ==================
// Programs API
// ==================

export interface Program {
  id: string;
  agency_id: string;
  name: string;
  description: string;
  destination: string;
  duration: string;
  price_clp: number;
  image_url: string | null;
  agency_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramsResponse {
  programs: Program[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const programsAPI = {
  getAll: (params?: { destination?: string; max_price?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.destination) query.set('destination', params.destination);
    if (params?.max_price) query.set('max_price', String(params.max_price));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return request<ProgramsResponse>(`/api/programs?${query}`);
  },

  getById: (id: string) =>
    request<{ program: Program }>(`/api/programs/${id}`),

  getDestinations: () =>
    request<{ destinations: string[] }>('/api/programs/destinations'),

  getMyPrograms: (token: string) =>
    request<{ programs: Program[]; total: number }>('/api/programs/agency/me', { token }),

  create: (token: string, data: Omit<Program, 'id' | 'agency_id' | 'created_at' | 'updated_at'>) =>
    request<{ message: string; program: Program }>('/api/programs', {
      method: 'POST',
      body: data,
      token,
    }),

  update: (token: string, id: string, data: Partial<Program>) =>
    request<{ message: string; program: Program }>(`/api/programs/${id}`, {
      method: 'PUT',
      body: data,
      token,
    }),

  delete: (token: string, id: string) =>
    request<{ message: string }>(`/api/programs/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// ==================
// Orders API
// ==================

export interface Order {
  id: string;
  program_id: string;
  agency_id: string;
  customer_name: string;
  customer_email: string;
  program_name: string;
  program_destination: string;
  total_clp: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  agency_name?: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount_clp: number;
  status: 'created' | 'succeeded' | 'failed';
  provider: string;
  idempotency_key?: string;
}

export interface CreateOrderResponse {
  message: string;
  order: Order;
  payment: Payment;
}

export const ordersAPI = {
  create: (data: { program_id: string; customer_name: string; customer_email: string }) =>
    request<CreateOrderResponse>('/api/orders', {
      method: 'POST',
      body: data,
    }),

  getById: (id: string) =>
    request<{ order: Order & { program?: Program }; payment: Payment | null }>(`/api/orders/${id}`),

  getMyOrders: (token: string, params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return request<{
      orders: Order[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      summary: { pending: number; paid: number; cancelled: number; total_revenue: number };
    }>(`/api/orders/agency/me?${query}`, { token });
  },

  getAllOrders: (token: string, params?: { status?: string; agency_id?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.agency_id) query.set('agency_id', params.agency_id);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return request<{
      orders: Order[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      summary: { pending: number; paid: number; cancelled: number; total_revenue: number };
    }>(`/api/orders/admin/all?${query}`, { token });
  },

  cancel: (token: string, id: string) =>
    request<{ message: string; order: Order }>(`/api/orders/${id}/cancel`, {
      method: 'POST',
      token,
    }),
};

// ==================
// Payments API
// ==================

export const paymentsAPI = {
  process: (order_id: string) =>
    request<{
      message: string;
      payment: Payment;
      order: { id: string; status: string; paid_at: string };
    }>('/api/payments/process', {
      method: 'POST',
      body: { order_id },
    }),

  getByOrderId: (orderId: string) =>
    request<{ payments: Payment[] }>(`/api/payments/order/${orderId}`),
};

// ==================
// Users API
// ==================

export interface Agency {
  id: string;
  email: string;
  name: string;
  role: 'agency';
  status: string;
  created_at: string;
}

export const usersAPI = {
  getAgencies: (token: string) =>
    request<{ agencies: Agency[]; total: number }>('/api/users/agencies', { token }),

  getAgency: (token: string, id: string) =>
    request<{
      agency: Agency;
      stats: { programs_count: number; orders_count: number; total_sales: number };
    }>(`/api/users/agencies/${id}`, { token }),

  getProfile: (token: string) =>
    request<{ user: User; stats: Record<string, number> }>('/api/users/profile', { token }),
};

export { APIError };
