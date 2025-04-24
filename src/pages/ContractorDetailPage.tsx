import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, Mail, Building2, Calendar, DollarSign, Clock, AlertCircle, X, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { EditContractorModal } from '../components/EditContractorModal';
import { EditInvoiceModal } from '../components/EditInvoiceModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { Contractor, Invoice, ChangeOrder } from '../lib/types';

function ContractorDetailPage() {
  const { contractorId } = useParams<{ contractorId: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'projects'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceDeleteConfirmOpen, setIsInvoiceDeleteConfirmOpen] = useState(false);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContractor();
  }, [contractorId]);

  const loadContractor = async () => {
    if (!contractorId) return;

    try {
      setLoading(true);
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', contractorId)
        .single();

      if (contractorError) throw contractorError;
      setContractor(contractorData);

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          project:projects(*)
        `)
        .eq('contractor_id', contractorId);

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData);

      const { data: changeOrdersData, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('contractor_id', contractorId);

      if (changeOrdersError) throw changeOrdersError;
      setChangeOrders(changeOrdersData);

      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading contractor:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditContractor = async (data: Partial<Contractor>) => {
    if (!contractorId) return;

    try {
      const { error } = await supabase
        .from('contractors')
        .update(data)
        .eq('id', contractorId);

      if (error) throw error;
      await loadContractor();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating contractor:', err);
    }
  };

  const handleDeleteContractor = async () => {
    if (!contractorId) return;

    try {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', contractorId);

      if (error) throw error;
      setIsDeleteConfirmOpen(false);
      // Navigate back to projects page or wherever appropriate
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting contractor:', err);
    }
  };

  const handleEditInvoice = async (data: Partial<Invoice>) => {
    if (!selectedInvoice?.id) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_number: data.invoice_number,
          description: data.description,
          amount: data.amount,
          file_url: data.file_url,
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;
      await loadContractor();
      setIsInvoiceModalOpen(false);
      setSelectedInvoice(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating invoice:', err);
    }
  };

  const handleAddInvoice = async (data: Partial<Invoice>) => {
    if (!contractor?.id) return;

    try {
      // Creates a new invoice for the contractor
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);

      if (projectError) throw projectError;
      
      const projectId = projectData && projectData.length > 0 ? projectData[0].id : null;

      if (!projectId) {
        setError('No project found for this invoice. Please add a project first.');
        return;
      }

      const { error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: data.invoice_number,
          description: data.description,
          amount: data.amount,
          contractor_id: contractor.id,
          project_id: projectId,
          file_url: data.file_url,
          status: 'pending',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        }]);

      if (error) throw error;
      await loadContractor();
      setIsInvoiceModalOpen(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding invoice:', err);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice?.id) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', selectedInvoice.id);

      if (error) throw error;
      await loadContractor();
      setIsInvoiceDeleteConfirmOpen(false);
      setSelectedInvoice(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting invoice:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusStyle = getStatusColor;

  const calculateContractorMetrics = () => {
    if (!contractor) return null;

    // Calculate total change orders amount
    const totalChangeOrders = changeOrders.reduce((sum, co) => 
      sum + (co.contractor_amount || 0), 0);
    
    // Calculate total contract value (original + change orders)
    const totalContractValue = contractor.contract_value + totalChangeOrders;
    
    // Calculate total invoices
    const totalInvoices = invoices.reduce((sum, inv) => 
      sum + (inv.amount || 0), 0);
    
    // Calculate remaining balance (total contract value - invoices)
    const remainingBalance = totalContractValue - totalInvoices;

    return {
      originalContractValue: contractor.contract_value,
      totalChangeOrders,
      totalContractValue,
      totalInvoices,
      remainingBalance
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Contractor not found</h2>
        <p className="mt-2 text-gray-600">The contractor you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    );
  }

  const metrics = calculateContractorMetrics();

  return (
    <div className="space-y-6">
      <EditContractorModal
        contractor={contractor}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditContractor}
        mode="edit"
      />

      <EditInvoiceModal
        invoice={selectedInvoice}
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSave={selectedInvoice ? handleEditInvoice : handleAddInvoice}
        mode={selectedInvoice ? 'edit' : 'create'}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteContractor}
        title="Delete Contractor"
        message="Are you sure you want to delete this contractor? This action cannot be undone."
      />

      <ConfirmDialog
        isOpen={isInvoiceDeleteConfirmOpen}
        onClose={() => {
          setIsInvoiceDeleteConfirmOpen(false);
          setSelectedInvoice(null);
        }}
        onConfirm={handleDeleteInvoice}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contractor Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contractor.name}</h1>
            <div className="mt-2 space-y-2">
              {contractor.email && (
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <a href={`mailto:${contractor.email}`} className="hover:text-blue-600">
                    {contractor.email}
                  </a>
                </div>
              )}
              {contractor.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <a href={`tel:${contractor.phone}`} className="hover:text-blue-600">
                    {contractor.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Details
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Financial Overview */}
        {metrics && (
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-1">Original Contract</p>
              <p className="text-xl font-semibold text-gray-900">
                ${metrics.originalContractValue.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-1">Change Orders</p>
              <p className="text-xl font-semibold text-gray-900">
                ${metrics.totalChangeOrders.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {changeOrders.length} change order{changeOrders.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Invoices</p>
              <p className="text-xl font-semibold text-gray-900">
                ${metrics.totalInvoices.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-1">Remaining Balance</p>
              <div className="flex items-center">
                <p className={`text-xl font-semibold ${metrics.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(metrics.remainingBalance).toLocaleString()}
                  {metrics.remainingBalance < 0 ? ' over' : ' remaining'}
                </p>
                {metrics.remainingBalance >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600 ml-2" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 ml-2" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Total Contract Value Banner */}
        {metrics && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Total Contract Value</h3>
                <p className="text-sm text-blue-600">Original contract plus all change orders</p>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${metrics.totalContractValue.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`${
              activeTab === 'invoices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`${
              activeTab === 'projects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Projects
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'overview' && (
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {/* Show recent change orders */}
              {changeOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Change Order: {order.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${order.contractor_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              ))}
              {/* Show recent invoices */}
              {invoices.slice(0, 3).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number} - {invoice.project?.name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {invoice.description}
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        ${invoice.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">All Invoices</h2>
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Invoice
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attachment
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link to={`/projects/${invoice.project_id}`} className="hover:text-blue-600">
                          {invoice.project?.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                        <div className="truncate">
                          {invoice.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${invoice.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.file_url ? (
                          <a 
                            href={invoice.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            <span>View</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setIsInvoiceDeleteConfirmOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
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

        {activeTab === 'projects' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Projects</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {invoices.map(invoice => invoice.project).filter((project, index, self) => 
                project && self.findIndex(p => p?.id === project?.id) === index
              ).map(project => project && (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContractorDetailPage;