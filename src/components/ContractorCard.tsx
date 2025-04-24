import React from 'react';
import { TrendingUp, TrendingDown, ChevronUp, ChevronDown, Edit } from 'lucide-react';
import { Contractor, ChangeOrder, Invoice } from '../lib/types';

interface ContractorCardProps {
  contractor: Contractor;
  changeOrders: ChangeOrder[];
  invoices: Invoice[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditContractor: () => void;
  onDeleteContractor: () => void;
  onEditChangeOrder: (order: ChangeOrder) => void;
  onDeleteChangeOrder: (order: ChangeOrder) => void;
  onAddChangeOrder: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onAddInvoice: () => void;
}

export function ContractorCard({
  contractor,
  changeOrders,
  invoices,
  isExpanded,
  onToggleExpand,
  onEditContractor,
  onDeleteContractor,
  onEditChangeOrder,
  onDeleteChangeOrder,
  onAddChangeOrder,
  onEditInvoice,
  onDeleteInvoice,
  onAddInvoice
}: ContractorCardProps) {
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateMetrics = () => {
    const contractorChangeOrders = changeOrders
      .filter(co => co.contractor_id === contractor.id)
      .reduce((sum, co) => sum + (co.contractor_amount || 0), 0);

    const totalContractValue = contractor.contract_value + contractorChangeOrders;

    const contractorInvoices = invoices
      .filter(inv => inv.contractor_id === contractor.id)
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const remainingBalance = totalContractValue - contractorInvoices;

    return {
      originalContractValue: contractor.contract_value,
      totalChangeOrders: contractorChangeOrders,
      totalContractValue,
      totalInvoices: contractorInvoices,
      remainingBalance
    };
  };

  const metrics = calculateMetrics();
  const contractorInvoices = invoices.filter(inv => inv.contractor_id === contractor.id);
  const contractorChangeOrders = changeOrders.filter(co => co.contractor_id === contractor.id);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Contractor Summary */}
      <div className="p-4 sm:p-6 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col xs:flex-row xs:items-center gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{contractor.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditContractor();
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Edit className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                metrics.remainingBalance < 0 ? 'bg-red-100 text-red-800' :
                metrics.remainingBalance === 0 ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              } inline-flex items-center self-start xs:self-auto`}>
                {metrics.remainingBalance < 0 ? 'Over Budget' :
                 metrics.remainingBalance === 0 ? 'Completed' :
                 'Active'}
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-500 space-y-1">
              {contractor.email && <div className="truncate">{contractor.email}</div>}
              {contractor.phone && <div className="truncate">{contractor.phone}</div>}
              {contractor.description && (
                <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                  {contractor.description}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <div className="flex-none">
              <p className="text-xs font-medium text-gray-500 mb-1">Total Contract</p>
              <p className="text-base font-semibold text-gray-900">
                ${metrics.totalContractValue.toLocaleString()}
              </p>
            </div>
            <div className="flex-none">
              <p className="text-xs font-medium text-gray-500 mb-1">Remaining</p>
              <p className={`text-base font-semibold ${
                metrics.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${Math.abs(metrics.remainingBalance).toLocaleString()}
                {metrics.remainingBalance < 0 ? ' over' : ' remaining'}
              </p>
            </div>
            <button
              onClick={onToggleExpand}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors self-start"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6 bg-white">
          {/* Change Orders */}
          {contractorChangeOrders.length > 0 && (
            <div className="overflow-hidden">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Change Orders</h4>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Project Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Contractor Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contractorChangeOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {order.description}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          ${order.project_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          ${order.contractor_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => onEditChangeOrder(order)}
                            className="text-sm text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteChangeOrder(order)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoices */}
          {contractorInvoices.length > 0 && (
            <div className="overflow-hidden">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Invoices</h4>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contractorInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 max-w-md">
                          <div className="truncate">
                            {invoice.description}
                            {invoice.amount < 0 && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Credit
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          ${Math.abs(invoice.amount).toLocaleString()}
                          {invoice.amount < 0 && ' (Credit)'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => onEditInvoice(invoice)}
                            className="text-sm text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteInvoice(invoice)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              onClick={onAddChangeOrder}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Change Order
            </button>
            <button
              onClick={onAddInvoice}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
            >
              Add Invoice
            </button>
            <button
              onClick={onDeleteContractor}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}