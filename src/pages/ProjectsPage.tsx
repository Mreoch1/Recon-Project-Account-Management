import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, TrendingUp, TrendingDown, Archive, RefreshCw } from 'lucide-react';
import { Project } from '../lib/types';
import { createProject, getProjects, archiveProject, unarchiveProject } from '../lib/database';
import { EditProjectModal } from '../components/EditProjectModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectMetrics, setProjectMetrics] = useState<Record<string, any>>({});

  useEffect(() => {
    loadProjects();
  }, [showArchived]);

  async function loadProjects() {
    try {
      setIsLoading(true);
      
      // First, handle auto-archiving of completed projects
      const { data: allProjects, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) throw projectsError;

      // Update archive status based on project status
      for (const project of allProjects) {
        const shouldBeArchived = project.status === 'completed';
        if (project.archived !== shouldBeArchived) {
          const { error } = await supabase
            .from('projects')
            .update({ archived: shouldBeArchived })
            .eq('id', project.id);
          
          if (error) throw error;
        }
      }

      // Now fetch the filtered projects based on archive status
      const { data: projectsData, error: filteredError } = await supabase
        .from('projects')
        .select('*')
        .eq('archived', showArchived);

      if (filteredError) throw filteredError;

      // Fetch change orders for all projects
      const { data: changeOrdersData, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select('*');

      if (changeOrdersError) throw changeOrdersError;

      // Fetch invoices for all projects
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*');

      if (invoicesError) throw invoicesError;

      // Calculate metrics for each project
      const metrics: Record<string, any> = {};
      projectsData.forEach(project => {
        const projectChangeOrders = changeOrdersData.filter(co => co.project_id === project.id);
        const projectInvoices = invoicesData.filter(inv => inv.project_id === project.id);

        const totalChangeOrders = projectChangeOrders.reduce((sum, co) => sum + (co.project_amount || 0), 0);
        const totalValue = project.contract_value + totalChangeOrders;
        const invoicesTotal = projectInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const profit = totalValue - invoicesTotal;
        const profitPercentage = totalValue > 0 ? (profit / totalValue) * 100 : 0;

        metrics[project.id] = {
          originalValue: project.contract_value,
          totalValue,
          invoicesTotal,
          profit,
          profitPercentage,
          totalChangeOrders
        };
      });

      setProjects(projectsData);
      setProjectMetrics(metrics);
      setError(null);
    } catch (err) {
      setError('Failed to load projects. Please try again.');
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreateProject = async (projectData: Partial<Project>) => {
    try {
      const newProject = await createProject(projectData);
      await loadProjects(); // Reload all projects to get fresh data
      setIsModalOpen(false);
    } catch (err) {
      setError('Failed to create project. Please try again.');
      console.error('Error creating project:', err);
    }
  };

  const handleArchiveProject = async () => {
    if (!selectedProject) return;

    try {
      if (selectedProject.archived) {
        await unarchiveProject(selectedProject.id);
      } else {
        await archiveProject(selectedProject.id);
      }
      await loadProjects();
      setIsArchiveConfirmOpen(false);
      setSelectedProject(null);
    } catch (err) {
      setError(`Failed to ${selectedProject.archived ? 'unarchive' : 'archive'} project. Please try again.`);
      console.error('Error archiving/unarchiving project:', err);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center self-start px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
          >
            {showArchived ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Show Active
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Show Archived
              </>
            )}
          </button>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <EditProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateProject}
        mode="create"
      />

      <ConfirmDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => {
          setIsArchiveConfirmOpen(false);
          setSelectedProject(null);
        }}
        onConfirm={handleArchiveProject}
        title={selectedProject?.archived ? 'Unarchive Project' : 'Archive Project'}
        message={`Are you sure you want to ${selectedProject?.archived ? 'unarchive' : 'archive'} this project?`}
        confirmText={selectedProject?.archived ? 'Unarchive' : 'Archive'}
      />

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Archive className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">
            {showArchived
              ? 'No archived projects found.'
              : 'Get started by creating a new project.'}
          </p>
          {!showArchived && (
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Project
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {projects.map((project) => {
              const metrics = projectMetrics[project.id] || {
                originalValue: project.contract_value,
                totalValue: project.contract_value,
                invoicesTotal: 0,
                profit: project.contract_value,
                profitPercentage: 100,
                totalChangeOrders: 0
              };

              return (
                <li key={project.id}>
                  <div className="block hover:bg-gray-50 transition-colors">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
                        <div className="flex flex-col gap-2">
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                          >
                            {project.name}
                          </Link>
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(project.status)}`}>
                              {project.status}
                            </span>
                            {project.archived && (
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <span className="text-sm text-gray-500">
                            Created {new Date(project.created_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setIsArchiveConfirmOpen(true);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {project.archived ? (
                              <RefreshCw className="h-5 w-5" />
                            ) : (
                              <Archive className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {project.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="p-3 bg-gray-50 rounded-lg flex flex-col">
                          <p className="text-xs font-medium text-gray-500">Original Contract</p>
                          <p className="text-sm sm:text-base font-semibold text-gray-900 mt-1">
                            ${metrics.originalValue.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg flex flex-col">
                          <p className="text-xs font-medium text-gray-500">With Change Orders</p>
                          <p className="text-sm sm:text-base font-semibold text-gray-900 mt-1">
                            ${metrics.totalValue.toLocaleString()}
                          </p>
                          {metrics.totalChangeOrders > 0 && (
                            <p className="text-xs text-gray-500">
                              (+${metrics.totalChangeOrders.toLocaleString()})
                            </p>
                          )}
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg flex flex-col">
                          <p className="text-xs font-medium text-gray-500">Total Invoices</p>
                          <p className="text-sm sm:text-base font-semibold text-gray-900 mt-1">
                            ${metrics.invoicesTotal.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg flex flex-col">
                          <p className="text-xs font-medium text-gray-500">Profit</p>
                          <div className="flex items-center">
                            <p className={`text-sm sm:text-base font-semibold mt-1 ${metrics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${Math.abs(metrics.profit).toLocaleString()}
                            </p>
                            {metrics.profit >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600 ml-1" />
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg flex flex-col">
                          <p className="text-xs font-medium text-gray-500">Profit Margin</p>
                          <div className="flex items-center">
                            <p className={`text-sm sm:text-base font-semibold mt-1 ${metrics.profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {metrics.profitPercentage.toFixed(1)}%
                            </p>
                            {metrics.profitPercentage >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600 ml-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;