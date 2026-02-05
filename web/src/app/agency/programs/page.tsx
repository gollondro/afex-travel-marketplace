'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, Edit2, Trash2, X, MapPin, Clock, DollarSign, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { programsAPI, Program } from '@/lib/api';
import { formatCLP, formatDate } from '@/lib/utils';
import { Card, Button, Input, Textarea, Spinner, Alert, EmptyState } from '@/components/ui';

interface ProgramFormData {
  name: string;
  description: string;
  destination: string;
  duration: string;
  price_clp: string;
  image_url: string;
}

const initialFormData: ProgramFormData = {
  name: '',
  description: '',
  destination: '',
  duration: '',
  price_clp: '',
  image_url: '',
};

export default function AgencyProgramsPage() {
  const { token } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState<ProgramFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadPrograms();
    }
  }, [token]);

  async function loadPrograms() {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const response = await programsAPI.getMyPrograms(token);
      setPrograms(response.programs);
    } catch (err: any) {
      setError(err.message || 'Error al cargar programas');
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingProgram(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  }

  function openEditModal(program: Program) {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      description: program.description,
      destination: program.destination,
      duration: program.duration,
      price_clp: String(program.price_clp),
      image_url: program.image_url || '',
    });
    setFormErrors({});
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProgram(null);
    setFormData(initialFormData);
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    }
    if (!formData.description.trim()) {
      errors.description = 'La descripción es requerida';
    } else if (formData.description.length < 10) {
      errors.description = 'La descripción debe tener al menos 10 caracteres';
    }
    if (!formData.destination.trim()) {
      errors.destination = 'El destino es requerido';
    }
    if (!formData.duration.trim()) {
      errors.duration = 'La duración es requerida';
    }
    if (!formData.price_clp.trim()) {
      errors.price_clp = 'El precio es requerido';
    } else if (isNaN(Number(formData.price_clp)) || Number(formData.price_clp) <= 0) {
      errors.price_clp = 'Ingresa un precio válido';
    }
    if (formData.image_url && !formData.image_url.startsWith('http')) {
      errors.image_url = 'La URL de imagen debe ser válida';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateForm() || !token) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const data = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        destination: formData.destination.trim(),
        duration: formData.duration.trim(),
        price_clp: parseInt(formData.price_clp),
        image_url: formData.image_url.trim() || null,
      };

      if (editingProgram) {
        await programsAPI.update(token, editingProgram.id, data);
        setSuccess('Programa actualizado exitosamente');
      } else {
        await programsAPI.create(token, data);
        setSuccess('Programa creado exitosamente');
      }

      closeModal();
      loadPrograms();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el programa');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(programId: string) {
    if (!token) return;

    try {
      setIsSubmitting(true);
      await programsAPI.delete(token, programId);
      setPrograms(programs.filter(p => p.id !== programId));
      setDeleteConfirm(null);
      setSuccess('Programa eliminado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el programa');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Programas</h1>
          <p className="text-gray-600 mt-1">
            Gestiona los programas turísticos de tu agencia
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-5 h-5 mr-1" />
          Nuevo Programa
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-6">
          {success}
        </Alert>
      )}

      {/* Programs List */}
      {programs.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<MapPin className="w-12 h-12" />}
            title="No tienes programas"
            description="Crea tu primer programa turístico para empezar a vender"
            action={
              <Button onClick={openCreateModal}>
                <Plus className="w-5 h-5 mr-1" />
                Crear programa
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {programs.map((program) => (
            <Card key={program.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Image */}
                <div className="w-full md:w-32 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  {program.image_url ? (
                    <img
                      src={program.image_url}
                      alt={program.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {program.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {program.description}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {program.destination}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {program.duration}
                    </span>
                    <span className="flex items-center font-medium text-blue-600">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {formatCLP(program.price_clp)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(program)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  {deleteConfirm === program.id ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(program.id)}
                        isLoading={isSubmitting}
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(program.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingProgram ? 'Editar Programa' : 'Nuevo Programa'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nombre del programa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={formErrors.name}
                  placeholder="Ej: Torres del Paine Aventura"
                />

                <Textarea
                  label="Descripción"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  error={formErrors.description}
                  placeholder="Describe el programa en detalle..."
                  rows={4}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Destino"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    error={formErrors.destination}
                    placeholder="Ej: Torres del Paine, Chile"
                  />

                  <Input
                    label="Duración"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    error={formErrors.duration}
                    placeholder="Ej: 5 días / 4 noches"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Precio (CLP)"
                    type="number"
                    value={formData.price_clp}
                    onChange={(e) => setFormData({ ...formData, price_clp: e.target.value })}
                    error={formErrors.price_clp}
                    placeholder="890000"
                  />

                  <Input
                    label="URL de imagen (opcional)"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    error={formErrors.image_url}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    {editingProgram ? 'Guardar cambios' : 'Crear programa'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
