import { supabase } from './supabase';
import { Project } from './types';

export async function createProject(project: Partial<Project>) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to create a project');
  }

  const { data, error } = await supabase
    .from('projects')
    .insert([{
      name: project.name,
      description: project.description,
      status: project.status,
      contract_value: project.contract_value,
      archived: false,
      user_id: user.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjects(includeArchived = false) {
  const query = supabase
    .from('projects')
    .select('*');

  if (!includeArchived) {
    query.eq('archived', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function archiveProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ archived: true })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unarchiveProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ archived: false })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}