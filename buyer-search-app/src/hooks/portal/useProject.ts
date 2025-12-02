// ============================================
// Project Hook - React
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type {
  BuyerProject,
  ProjectWithMembers,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectMemberRole,
  StageKey,
} from '../../types/portal';

interface ProjectState {
  projects: BuyerProject[];
  currentProject: ProjectWithMembers | null;
  loading: boolean;
  error: string | null;
}

export function useProject(userId?: string) {
  const [state, setState] = useState<ProjectState>({
    projects: [],
    currentProject: null,
    loading: true,
    error: null,
  });

  // Fetch all projects for user
  const fetchProjects = useCallback(async () => {
    if (!userId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Get owned projects
      const { data: owned, error: ownedError } = await supabase
        .from('buyer_projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Get projects where user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, buyer_projects(*)')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Combine and dedupe
      const ownedIds = new Set(owned?.map((p) => p.id));
      const uniqueMemberProjects = (memberProjects || [])
        .map((m) => {
          // Supabase returns the joined table data directly
          const project = m.buyer_projects;
          if (!project || Array.isArray(project)) return null;
          return project as unknown as BuyerProject;
        })
        .filter((p): p is BuyerProject => p !== null && !ownedIds.has(p.id));

      setState((prev) => ({
        ...prev,
        projects: [...(owned || []), ...uniqueMemberProjects],
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch projects';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [userId]);

  // Fetch single project with details
  const fetchProjectDetails = useCallback(async (projectId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('buyer_projects')
        .select(`
          *,
          owner:user_profiles!owner_id(*),
          members:project_members(
            *,
            user:user_profiles(*)
          ),
          stages:project_stages(*)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        currentProject: data as ProjectWithMembers,
        loading: false,
      }));

      return data as ProjectWithMembers;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch project';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  // Get or create default project
  const getOrCreateDefaultProject = useCallback(async () => {
    if (!userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Check for existing
      const { data: existing, error: fetchError } = await supabase
        .from('buyer_projects')
        .select('*')
        .eq('owner_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (existing && !fetchError) {
        setState((prev) => ({ ...prev, loading: false }));
        return existing as BuyerProject;
      }

      // Create default
      const { data: newProject, error: createError } = await supabase
        .from('buyer_projects')
        .insert({
          owner_id: userId,
          name: 'My Home Search',
          project_type: 'primary',
          status: 'active',
          target_state: 'NV',
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchProjects();
      return newProject as BuyerProject;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [userId, fetchProjects]);

  // Create new project
  const createProject = useCallback(async (input: CreateProjectInput) => {
    if (!userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('buyer_projects')
        .insert({
          owner_id: userId,
          name: input.name || 'My Home Search',
          project_type: input.project_type || 'primary',
          status: 'active',
          target_city: input.target_city,
          target_state: input.target_state || 'NV',
          budget_min: input.budget_min,
          budget_max: input.budget_max,
          target_beds: input.target_beds,
          target_baths: input.target_baths,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProjects();
      return data as BuyerProject;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [userId, fetchProjects]);

  // Update project
  const updateProject = useCallback(async (projectId: string, input: UpdateProjectInput) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('buyer_projects')
        .update(input)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      await fetchProjects();
      if (state.currentProject?.id === projectId) {
        await fetchProjectDetails(projectId);
      }

      return data as BuyerProject;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update project';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchProjects, fetchProjectDetails, state.currentProject?.id]);

  // Add member
  const addMember = useCallback(async (
    projectId: string,
    email: string,
    role: ProjectMemberRole
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        invited_email: email,
        role_in_project: role,
        permissions: { can_view: true, can_edit: false, can_message: true },
      });

      if (error) throw error;

      if (state.currentProject?.id === projectId) {
        await fetchProjectDetails(projectId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add member';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchProjectDetails, state.currentProject?.id]);

  // Remove member
  const removeMember = useCallback(async (projectId: string, memberId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)
        .eq('project_id', projectId);

      if (error) throw error;

      if (state.currentProject?.id === projectId) {
        await fetchProjectDetails(projectId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove member';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchProjectDetails, state.currentProject?.id]);

  // Toggle stage completion
  const toggleStage = useCallback(async (
    projectId: string,
    stageKey: StageKey,
    completed: boolean
  ) => {
    if (!userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('project_stages')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? userId : null,
        })
        .eq('project_id', projectId)
        .eq('stage_key', stageKey);

      if (error) throw error;

      if (state.currentProject?.id === projectId) {
        await fetchProjectDetails(projectId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle stage';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [userId, fetchProjectDetails, state.currentProject?.id]);

  // Initialize
  useEffect(() => {
    if (userId) {
      fetchProjects();
    } else {
      setState({
        projects: [],
        currentProject: null,
        loading: false,
        error: null,
      });
    }
  }, [userId, fetchProjects]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    projects: state.projects,
    currentProject: state.currentProject,
    loading: state.loading,
    error: state.error,

    // Methods
    fetchProjects,
    fetchProjectDetails,
    getOrCreateDefaultProject,
    createProject,
    updateProject,
    addMember,
    removeMember,
    toggleStage,
    clearError,
  };
}
