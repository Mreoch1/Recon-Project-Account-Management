import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertCircle, Search, Filter } from 'lucide-react';
import { EditProjectModal } from '../components/EditProjectModal';
import { EditChangeOrderModal } from '../components/EditChangeOrderModal';
import { EditInvoiceModal } from '../components/EditInvoiceModal';
import { EditContractorModal } from '../components/EditContractorModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ContractorCard } from '../components/ContractorCard';
import { AutoInvoiceUploader } from '../components/AutoInvoiceUploader';
import { supabase } from '../lib/supabase';
import { Project, Contractor, ChangeOrder, Invoice } from '../lib/types';

// Helper functions
const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'on-hold':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Data states
  const [project, setProject] = useState<Project | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'value'>('name');
  const [expandedContractors, setExpandedContractors] = useState<Set<string>>(new Set());

  // Modal states
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [isChangeOrderModalOpen, setIsChangeOrderModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  // Delete confirmation states
  const [isProjectDeleteConfirmOpen, setIsProjectDeleteConfirmOpen] = useState(false);
  const [isContractorDeleteConfirmOpen, setIsContractorDeleteConfirmOpen] = useState(false);
  const [isChangeOrderDeleteConfirmOpen, setIsChangeOrderDeleteConfirmOpen] = useState(false);
  const [isInvoiceDeleteConfirmOpen, setIsInvoiceDeleteConfirmOpen] = useState(false);
  
  // Selected item states for edit/delete
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [selectedChangeOrder, setSelectedChangeOrder] = useState<ChangeOrder | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New state for AutoInvoiceUploader
  const [showAiUploader, setShowAiUploader] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch project contractors
      const { data: contractorsData, error: contractorsError } = await supabase
        .from('project_contractors')
        .select(`
          contractor:contractors(*)
        `)
        .eq('project_id', projectId);

      if (contractorsError) throw contractorsError;
      setContractors(contractorsData.map(pc => pc.contractor));

      // Fetch change orders
      const { data: changeOrdersData, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId);

      if (changeOrdersError) throw changeOrdersError;
      setChangeOrders(changeOrdersData);

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId);

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData);

    } catch (err: any) {
      setError(err.message);
      console.error('Error loading project data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation functions
  const calculateContractorMetrics = (contractor: Contractor) => {
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

  const calculateFinancialMetrics = () => {
    const totalChangeOrders = changeOrders.reduce((sum, co) => 
      sum + (co.project_amount || 0), 0);
    const totalValue = (project?.contract_value || 0) + totalChangeOrders;
    const invoicesTotal = invoices.reduce((sum, inv) => 
      sum + (inv.amount || 0), 0);
    const profit = totalValue - invoicesTotal;
    const profitPercentage = totalValue > 0 
      ? (profit / totalValue) * 100 
      : 0;

    return {
      totalChangeOrders,
      totalValue,
      invoicesTotal,
      profit,
      profitPercentage
    };
  };

  // Filter and sort contractors
  const filteredContractors = contractors
    .filter(contractor => {
      const matchesSearch = 
        contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contractor.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contractor.phone?.toLowerCase().includes(searchTerm.toLowerCase()));

      if (statusFilter === 'all') return matchesSearch;

      const metrics = calculateContractorMetrics(contractor);
      switch (statusFilter) {
        case 'overdue':
          return matchesSearch && metrics.remainingBalance < 0;
        case 'active':
          return matchesSearch && metrics.remainingBalance > 0;
        case 'completed':
          return matchesSearch && metrics.remainingBalance === 0;
        default:
          return matchesSearch;
      }
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        const metricsA = calculateContractorMetrics(a);
        const metricsB = calculateContractorMetrics(b);
        return metricsB.totalContractValue - metricsA.totalContractValue;
      }
    });

  const toggleContractorExpanded = (contractorId: string) => {
    const newExpanded = new Set(expandedContractors);
    if (newExpanded.has(contractorId)) {
      newExpanded.delete(contractorId);
    } else {
      newExpanded.add(contractorId);
    }
    setExpandedContractors(newExpanded);
  };

  const handleAddContractor = async (data: Partial<Contractor>) => {
    if (!projectId) return;

    try {
      setError(null);

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        throw new Error('You must be signed in to add a contractor');
      }

      // First create the contractor
      const { data: newContractor, error: contractorError } = await supabase
        .from('contractors')
        .insert([{
          ...data,
          user_id: user.id
        }])
        .select()
        .single();

      if (contractorError) {
        if (contractorError.code === '23505') {
          throw new Error('A contractor with this email already exists');
        }
        throw contractorError;
      }

      if (!newContractor) {
        throw new Error('Failed to create contractor');
      }

      // Then create the project-contractor relationship
      const { error: relationError } = await supabase
        .from('project_contractors')
        .insert([{
          project_id: projectId,
          contractor_id: newContractor.id
        }]);

      if (relationError) {
        // If relation creation fails, clean up the contractor
        await supabase
          .from('contractors')
          .delete()
          .eq('id', newContractor.id);
        
        throw relationError;
      }

      await loadProjectData();
      setIsContractorModalOpen(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding contractor:', err);
    }
  };

  const handleEditContractor = async (data: Partial<Contractor>) => {
    if (!projectId || !selectedContractor?.id) return;

    try {
      setError(null);

      // First update the contractor
      const { error } = await supabase
        .from('contractors')
        .update(data)
        .eq('id', selectedContractor.id);

      if (error) throw error;

      await loadProjectData();
      setIsContractorModalOpen(false);
      setSelectedContractor(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating contractor:', err);
    }
  };

  const handleEditProject = async (data: Partial<Project>) => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', projectId);

      if (error) throw error;
      await loadProjectData();
      setIsProjectEditModalOpen(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating project:', err);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      navigate('/projects');
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting project:', err);
    }
  };

  const handleRemoveContractor = async () => {
    if (!projectId || !selectedContractor?.id) return;

    try {
      const { error } = await supabase
        .from('project_contractors')
        .delete()
        .eq('project_id', projectId)
        .eq('contractor_id', selectedContractor.id);

      if (error) throw error;
      await loadProjectData();
      setIsContractorDeleteConfirmOpen(false);
      setSelectedContractor(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error removing contractor:', err);
    }
  };

  const handleAddChangeOrder = async (data: Partial<ChangeOrder>) => {
    if (!projectId || !selectedContractor?.id) return;

    try {
      const { error } = await supabase
        .from('change_orders')
        .insert([{
          ...data,
          project_id: projectId,
          contractor_id: selectedContractor.id
        }]);

      if (error) throw error;
      await loadProjectData();
      setIsChangeOrderModalOpen(false);
      setSelectedContractor(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding change order:', err);
    }
  };

  const handleEditChangeOrder = async (data: Partial<ChangeOrder>) => {
    if (!selectedChangeOrder?.id) return;

    try {
      const { error } = await supabase
        .from('change_orders')
        .update(data)
        .eq('id', selectedChangeOrder.id);

      if (error) throw error;
      await loadProjectData();
      setIsChangeOrderModalOpen(false);
      setSelectedChangeOrder(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating change order:', err);
    }
  };

  const handleDeleteChangeOrder = async () => {
    if (!selectedChangeOrder?.id) return;

    try {
      const { error } = await supabase
        .from('change_orders')
        .delete()
        .eq('id', selectedChangeOrder.id);

      if (error) throw error;
      await loadProjectData();
      setIsChangeOrderDeleteConfirmOpen(false);
      setSelectedChangeOrder(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting change order:', err);
    }
  };

  const handleAddInvoice = async (data: Partial<Invoice>) => {
    if (!projectId || !selectedContractor?.id) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .insert([{
          ...data,
          project_id: projectId,
          contractor_id: selectedContractor.id
        }]);

      if (error) throw error;
      await loadProjectData();
      setIsInvoiceModalOpen(false);
      setSelectedContractor(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding invoice:', err);
    }
  };

  const handleEditInvoice = async (data: Partial<Invoice>) => {
    if (!selectedInvoice?.id) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update(data)
        .eq('id', selectedInvoice.id);

      if (error) throw error;
      await loadProjectData();
      setIsInvoiceModalOpen(false);
      setSelectedInvoice(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating invoice:', err);
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
      await loadProjectData();
      setIsInvoiceDeleteConfirmOpen(false);
      setSelectedInvoice(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting invoice:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Project not found</h2>
        <p className="mt-2 text-gray-600">The project you're looking for doesn't exist or you don't have access to it.</p>
        <Link
          to="/projects"
          className="mt-4 inline-block text-blue-600 hover:text-blue-500"
        >
          Return to projects
        </Link>
      </div>
    );
  }

  const metrics = calculateFinancialMetrics();

  // Check for over-billed contractors
  const overBilledContractors = contractors.map(contractor => {
    const metrics = calculateContractorMetrics(contractor);
    if (metrics.remainingBalance < 0) {
      return {
        contractor,
        amount: Math.abs(metrics.remainingBalance),
        invoices: invoices.filter(inv => inv.contractor_id === contractor.id)
      };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Over-billing Alert */}
      {overBilledContractors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Over-billing Alert</h3>
              <div className="mt-2 text-sm text-red-700">
                {overBilledContractors.map(({ contractor, amount, invoices }) => (
                  <div key={contractor.id} className="mb-2">
                    <p>
                      <span className="font-medium">{contractor.name}</span> has billed ${amount.toLocaleString()} over their contract value
                    </p>
                    <p className="text-xs mt-1">
                      Latest invoice: {invoices[invoices.length - 1]?.invoice_number} for ${invoices[invoices.length - 1]?.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditProjectModal
        project={project}
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSave={handleEditProject}
        mode="edit"
      />

      <EditContractorModal
        contractor={selectedContractor}
        isOpen={isContractorModalOpen}
        onClose={() => {
          setIsContractorModalOpen(false);
          setSelectedContractor(null);
        }}
        onSave={selectedContractor ? handleEditContractor : handleAddContractor}
        mode={selectedContractor ? 'edit' : 'create'}
      />

      <EditChangeOrderModal
        changeOrder={selectedChangeOrder}
        isOpen={isChangeOrderModalOpen}
        onClose={() => {
          setIsChangeOrderModalOpen(false);
          setSelectedChangeOrder(null);
        }}
        onSave={selectedChangeOrder ? handleEditChangeOrder : handleAddChangeOrder}
        mode={selectedChangeOrder ? 'edit' : 'create'}
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

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={isProjectDeleteConfirmOpen}
        onClose={() => setIsProjectDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
      />

      <ConfirmDialog
        isOpen={isContractorDeleteConfirmOpen}
        onClose={() => {
          setIsContractorDeleteConfirmOpen(false);
          setSelectedContractor(null);
        }}
        onConfirm={handleRemoveContractor}
        title="Remove Contractor"
        message="Are you sure you want to remove this contractor from the project? This action cannot be undone."
      />

      <ConfirmDialog
        isOpen={isChangeOrderDeleteConfirmOpen}
        onClose={() => {
          setIsChangeOrderDeleteConfirmOpen(false);
          setSelectedChangeOrder(null);
        }}
        onConfirm={handleDeleteChangeOrder}
        title="Delete Change Order"
        message="Are you sure you want to delete this change order? This action cannot be undone."
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

      {/* Project Header */}
      <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-2 text-gray-600 max-w-2xl">{project.description}</p>
            <div className="mt-4 flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(project.status)}`}>
                {project.status}
              </span>
              <span className="text-sm text-gray-500">
                Created {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsProjectEditModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Project
            </button>
            <button
              onClick={() => setIsProjectDeleteConfirmOpen(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 w-full">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Financial Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col">
              <p className="text-sm font-medium text-gray-500 mb-1">Original Contract</p>
              <p className="text-2xl font-bold text-gray-900">
                ${project.contract_value.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col">
              <p className="text-sm font-medium text-gray-500 mb-1">With Change Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                ${metrics.totalValue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                (+${metrics.totalChangeOrders.toLocaleString()} in changes)
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">
                ${metrics.invoicesTotal.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col">
              <p className="text-sm font-medium text-gray-500 mb-1">Current Profit</p>
              <div className="flex items-center mt-auto">
                <p className={`text-2xl font-bold ${metrics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(metrics.profit).toLocaleString()}
                </p>
                {metrics.profit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600 ml-2" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 ml-2" />
                )}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg flex flex-col">
              <p className="text-sm font-medium text-gray-500 mb-1">Profit Margin</p>
              <div className="flex items-center mt-auto">
                <p className={`text-2xl font-bold ${metrics.profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.profitPercentage.toFixed(1)}%
                </p>
                {metrics.profitPercentage >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600 ml-2" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 ml-2" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contractors Section */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Contractors</h2>
            <button
              onClick={() => setIsContractorModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Contractor
            </button>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contractors..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'value')}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="value">Sort by Value</option>
              </select>
            </div>
          </div>

          {/* Contractors List */}
          <div className="space-y-4">
            {filteredContractors.map((contractor) => (
              <ContractorCard
                key={contractor.id}
                contractor={contractor}
                changeOrders={changeOrders.filter(co => co.contractor_id === contractor.id)}
                invoices={invoices.filter(inv => inv.contractor_id === contractor.id)}
                isExpanded={expandedContractors.has(contractor.id)}
                onToggleExpand={() => toggleContractorExpanded(contractor.id)}
                onEditContractor={() => {
                  setSelectedContractor(contractor);
                  setIsContractorModalOpen(true);
                }}
                onDeleteContractor={() => {
                  setSelectedContractor(contractor);
                  setIsContractorDeleteConfirmOpen(true);
                }}
                onEditChangeOrder={(order) => {
                  setSelectedChangeOrder(order);
                  setIsChangeOrderModalOpen(true);
                }}
                onDeleteChangeOrder={(order) => {
                  setSelectedChangeOrder(order);
                  setIsChangeOrderDeleteConfirmOpen(true);
                }}
                onAddChangeOrder={() => {
                  setSelectedContractor(contractor);
                  setIsChangeOrderModalOpen(true);
                }}
                onEditInvoice={(invoice) => {
                  setSelectedInvoice(invoice);
                  setIsInvoiceModalOpen(true);
                }}
                onDeleteInvoice={(invoice) => {
                  setSelectedInvoice(invoice);
                  setIsInvoiceDeleteConfirmOpen(true);
                }}
                onAddInvoice={() => {
                  setSelectedContractor(contractor);
                  setIsInvoiceModalOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Invoices</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAiUploader(!showAiUploader)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                {showAiUploader ? 'Hide AI Uploader' : 'Use AI Invoice Processing'}
              </button>
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setIsInvoiceModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Invoice Manually
              </button>
            </div>
          </div>
          
          {showAiUploader && project && (
            <AutoInvoiceUploader 
              project={project} 
              onInvoiceCreated={() => {
                loadProjectData();
                setShowAiUploader(false);
              }} 
            />
          )}
          
          {/* Rest of the invoices list */}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetailPage;