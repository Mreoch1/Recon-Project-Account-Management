import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Contractor } from '../lib/types';

interface EditContractorModalProps {
  contractor?: Contractor;
  isOpen: boolean;
  onClose: () => void;
  onSave: (contractor: Partial<Contractor>) => void;
  mode: 'edit' | 'create';
}

export function EditContractorModal({
  contractor,
  isOpen,
  onClose,
  onSave,
  mode
}: EditContractorModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    contract_value: ''
  });

  // Update form data when contractor changes or modal opens
  useEffect(() => {
    if (contractor && isOpen) {
      setFormData({
        name: contractor.name,
        email: contractor.email || '',
        phone: contractor.phone || '',
        description: contractor.description || '',
        contract_value: contractor.contract_value.toString()
      });
    } else if (!contractor && isOpen) {
      // Reset form for new contractor
      setFormData({
        name: '',
        email: '',
        phone: '',
        description: '',
        contract_value: ''
      });
    }
  }, [contractor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      contract_value: parseFloat(formData.contract_value) || 0
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {mode === 'edit' ? 'Edit Contractor' : 'Add Contractor'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Value ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.contract_value}
              onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 h-32 resize-none"
              placeholder="Enter contractor description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              {mode === 'edit' ? 'Save Changes' : 'Add Contractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}