import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ChangeOrder } from '../lib/types';

interface EditChangeOrderModalProps {
  changeOrder?: ChangeOrder;
  isOpen: boolean;
  onClose: () => void;
  onSave: (changeOrder: Partial<ChangeOrder>) => void;
  mode: 'edit' | 'create';
}

export function EditChangeOrderModal({
  changeOrder,
  isOpen,
  onClose,
  onSave,
  mode
}: EditChangeOrderModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    project_amount: '',
    contractor_amount: '',
    status: 'pending'
  });

  // Update form data when change order changes or modal opens
  useEffect(() => {
    if (changeOrder && isOpen) {
      setFormData({
        description: changeOrder.description,
        project_amount: changeOrder.project_amount.toString(),
        contractor_amount: changeOrder.contractor_amount.toString(),
        status: changeOrder.status
      });
    } else if (!changeOrder && isOpen) {
      // Reset form for new change order
      setFormData({
        description: '',
        project_amount: '',
        contractor_amount: '',
        status: 'pending'
      });
    }
  }, [changeOrder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      project_amount: parseFloat(formData.project_amount),
      contractor_amount: parseFloat(formData.contractor_amount)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {mode === 'edit' ? 'Edit Change Order' : 'Add Change Order'}
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
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 h-32 resize-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.project_amount}
              onChange={(e) => setFormData({ ...formData, project_amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              placeholder="0.00"
            />
            <p className="mt-1 text-sm text-gray-500">
              This amount will affect the overall project contract value
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.contractor_amount}
              onChange={(e) => setFormData({ ...formData, contractor_amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              placeholder="0.00"
            />
            <p className="mt-1 text-sm text-gray-500">
              This amount will affect the contractor's contract value
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
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
              {mode === 'edit' ? 'Save Changes' : 'Add Change Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}