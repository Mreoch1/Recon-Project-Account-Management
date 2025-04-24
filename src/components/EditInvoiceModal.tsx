import React, { useState, useEffect } from 'react';
import { X, CreditCard, Receipt } from 'lucide-react';
import { Invoice } from '../lib/types';

interface EditInvoiceModalProps {
  invoice?: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Partial<Invoice>) => void;
  mode: 'edit' | 'create';
}

export function EditInvoiceModal({
  invoice,
  isOpen,
  onClose,
  onSave,
  mode
}: EditInvoiceModalProps) {
  const [formData, setFormData] = useState({
    invoice_number: '',
    description: '',
    amount: '',
    isCredit: false
  });

  // Update form data when invoice changes or modal opens
  useEffect(() => {
    if (invoice && isOpen) {
      setFormData({
        invoice_number: invoice.invoice_number,
        description: invoice.description,
        amount: Math.abs(invoice.amount).toString(),
        isCredit: invoice.amount < 0
      });
    } else if (!invoice && isOpen) {
      // Reset form for new invoice
      setFormData({
        invoice_number: '',
        description: '',
        amount: '',
        isCredit: false
      });
    }
  }, [invoice, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = formData.amount === '' ? 0 : parseFloat(formData.amount);
    if (isNaN(amount)) return;
    
    // Only send the fields that exist in the database schema
    await onSave({
      invoice_number: formData.invoice_number,
      description: formData.description,
      amount: amount * (formData.isCredit ? -1 : 1)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {mode === 'edit' ? 'Edit Invoice' : 'Add Invoice'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!formData.isCredit}
                onChange={() => setFormData({ ...formData, isCredit: false })}
                className="h-4 w-4 text-blue-600"
              />
              <Receipt className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Regular Invoice</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formData.isCredit}
                onChange={() => setFormData({ ...formData, isCredit: true })}
                className="h-4 w-4 text-blue-600"
              />
              <CreditCard className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Credit Invoice</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              placeholder="Enter invoice number..."
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
              required
              placeholder="Enter invoice description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
              {formData.isCredit && <span className="text-sm text-gray-500 ml-2">(Enter positive amount)</span>}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              placeholder="0.00"
            />
            {formData.isCredit && (
              <p className="mt-1 text-sm text-gray-500">
                This will be recorded as a credit of -${parseFloat(formData.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
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
              {mode === 'edit' ? 'Save Changes' : 'Add Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}