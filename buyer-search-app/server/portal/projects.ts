// ============================================
// Project Helpers - Server Side
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  BuyerProject,
  ProjectWithMembers,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectMemberRole,
  StageKey,
} from '../../src/types/portal.js';

// ============================================
// PROJECT CRUD
// ============================================

/**
 * Get or create default project for a buyer
 * Every buyer gets one "My Home Search" project automatically
 */
export async function getOrCreateDefaultProject(
  supabase: SupabaseClient,
  userId: string
): Promise<BuyerProject> {
  // Check for existing active project
  const { data: existing, error: fetchError } = await supabase
    .from('buyer_projects')
    .select('*')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (existing && !fetchError) {
    return existing as BuyerProject;
  }

  // Create default project
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

  if (createError) {
    throw new Error(`Failed to create default project: ${createError.message}`);
  }

  return newProject as BuyerProject;
}

/**
 * Get all projects for a user (owned or member of)
 */
export async function getUserProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<BuyerProject[]> {
  // Get owned projects
  const { data: owned, error: ownedError } = await supabase
    .from('buyer_projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (ownedError) {
    throw new Error(`Failed to fetch owned projects: ${ownedError.message}`);
  }

  // Get projects where user is a member
  const { data: memberProjects, error: memberError } = await supabase
    .from('project_members')
    .select('project_id, buyer_projects(*)')
    .eq('user_id', userId)
    .not('buyer_projects', 'is', null);

  if (memberError) {
    throw new Error(`Failed to fetch member projects: ${memberError.message}`);
  }

  // Combine and dedupe
  const memberProjectData = memberProjects
    ?.map((m) => m.buyer_projects)
    .filter(Boolean) as BuyerProject[];

  const ownedIds = new Set(owned?.map((p) => p.id));
  const uniqueMemberProjects = memberProjectData?.filter((p) => !ownedIds.has(p.id)) || [];

  return [...(owned || []), ...uniqueMemberProjects];
}

/**
 * Get a single project with full details (members, stages)
 */
export async function getProjectWithDetails(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectWithMembers | null> {
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

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return data as ProjectWithMembers;
}

/**
 * Create a new project
 */
export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectInput
): Promise<BuyerProject> {
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

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data as BuyerProject;
}

/**
 * Update a project
 */
export async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  input: UpdateProjectInput
): Promise<BuyerProject> {
  const { data, error } = await supabase
    .from('buyer_projects')
    .update(input)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data as BuyerProject;
}

// ============================================
// PROJECT MEMBERS
// ============================================

/**
 * Add a member to a project
 */
export async function addProjectMember(
  supabase: SupabaseClient,
  projectId: string,
  userId: string | null,
  email: string | null,
  role: ProjectMemberRole,
  permissions = { can_view: true, can_edit: false, can_message: true }
): Promise<void> {
  const { error } = await supabase.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    invited_email: email,
    role_in_project: role,
    permissions,
    joined_at: userId ? new Date().toISOString() : null,
  });

  if (error) {
    throw new Error(`Failed to add project member: ${error.message}`);
  }
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(
  supabase: SupabaseClient,
  projectId: string,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to remove project member: ${error.message}`);
  }
}

/**
 * Update member permissions
 */
export async function updateMemberPermissions(
  supabase: SupabaseClient,
  memberId: string,
  permissions: { can_view?: boolean; can_edit?: boolean; can_message?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ permissions })
    .eq('id', memberId);

  if (error) {
    throw new Error(`Failed to update member permissions: ${error.message}`);
  }
}

// ============================================
// PROJECT STAGES
// ============================================

/**
 * Toggle stage completion
 */
export async function toggleStageCompletion(
  supabase: SupabaseClient,
  projectId: string,
  stageKey: StageKey,
  userId: string,
  completed: boolean
): Promise<void> {
  const updateData: Record<string, unknown> = {
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    completed_by: completed ? userId : null,
  };

  const { error } = await supabase
    .from('project_stages')
    .update(updateData)
    .eq('project_id', projectId)
    .eq('stage_key', stageKey);

  if (error) {
    throw new Error(`Failed to toggle stage: ${error.message}`);
  }
}

/**
 * Add notes to a stage
 */
export async function updateStageNotes(
  supabase: SupabaseClient,
  projectId: string,
  stageKey: StageKey,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from('project_stages')
    .update({ notes })
    .eq('project_id', projectId)
    .eq('stage_key', stageKey);

  if (error) {
    throw new Error(`Failed to update stage notes: ${error.message}`);
  }
}
