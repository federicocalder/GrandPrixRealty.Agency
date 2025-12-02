// ============================================
// Activity Log Helpers - Server Side
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityLog } from '../../src/types/portal.js';

// ============================================
// ACTIVITY TYPES
// ============================================

export type ActivityType =
  // Project activities
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'member_invited'
  | 'member_joined'
  | 'member_removed'
  | 'stage_completed'
  | 'stage_uncompleted'
  // Property activities
  | 'property_saved'
  | 'property_removed'
  | 'property_favorited'
  | 'property_unfavorited'
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'reaction_added'
  | 'reaction_changed'
  | 'reaction_removed'
  // Search activities
  | 'search_saved'
  | 'search_updated'
  | 'search_deleted'
  | 'alert_enabled'
  | 'alert_disabled'
  // Message activities
  | 'conversation_created'
  | 'message_sent'
  | 'message_edited'
  | 'message_deleted'
  // Document activities
  | 'document_uploaded'
  | 'document_updated'
  | 'document_deleted'
  // Auth activities
  | 'user_signed_up'
  | 'user_signed_in'
  | 'user_signed_out'
  | 'profile_updated';

export type EntityType =
  | 'project'
  | 'member'
  | 'stage'
  | 'property'
  | 'note'
  | 'reaction'
  | 'search'
  | 'conversation'
  | 'message'
  | 'document'
  | 'user';

// ============================================
// LOGGING FUNCTIONS
// ============================================

/**
 * Log an activity
 */
export async function logActivity(
  supabase: SupabaseClient,
  params: {
    projectId?: string;
    userId?: string;
    activityType: ActivityType;
    entityType?: EntityType;
    entityId?: string;
    payload?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  const { error } = await supabase.from('activity_log').insert({
    project_id: params.projectId || null,
    user_id: params.userId || null,
    activity_type: params.activityType,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
    payload: params.payload || null,
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
  });

  if (error) {
    // Don't throw - activity logging should never break main flow
    console.error('Failed to log activity:', error.message);
  }
}

/**
 * Get activity log for a project
 */
export async function getProjectActivity(
  supabase: SupabaseClient,
  projectId: string,
  limit = 50,
  offset = 0
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch activity: ${error.message}`);
  }

  return (data || []) as ActivityLog[];
}

/**
 * Get activity log for a user
 */
export async function getUserActivity(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
  offset = 0
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch user activity: ${error.message}`);
  }

  return (data || []) as ActivityLog[];
}

/**
 * Get activity for a specific entity
 */
export async function getEntityActivity(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string,
  limit = 50
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch entity activity: ${error.message}`);
  }

  return (data || []) as ActivityLog[];
}

/**
 * Get recent activity across all projects (for admin dashboard)
 */
export async function getRecentActivity(
  supabase: SupabaseClient,
  limit = 100,
  activityTypes?: ActivityType[]
): Promise<ActivityLog[]> {
  let query = supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (activityTypes && activityTypes.length > 0) {
    query = query.in('activity_type', activityTypes);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch recent activity: ${error.message}`);
  }

  return (data || []) as ActivityLog[];
}

// ============================================
// CONVENIENCE LOGGERS
// ============================================

export const activityLoggers = {
  // Project
  projectCreated: (supabase: SupabaseClient, userId: string, projectId: string, name: string) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'project_created',
      entityType: 'project',
      entityId: projectId,
      payload: { name },
    }),

  memberInvited: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    email: string,
    role: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'member_invited',
      entityType: 'member',
      payload: { email, role },
    }),

  stageCompleted: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    stageKey: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'stage_completed',
      entityType: 'stage',
      entityId: stageKey,
    }),

  // Property
  propertySaved: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    listingKey: string,
    listingId: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'property_saved',
      entityType: 'property',
      entityId: listingKey,
      payload: { listingId },
    }),

  propertyFavorited: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    listingKey: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'property_favorited',
      entityType: 'property',
      entityId: listingKey,
    }),

  noteAdded: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    propertyId: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'note_added',
      entityType: 'note',
      entityId: propertyId,
    }),

  reactionAdded: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    propertyId: string,
    reaction: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'reaction_added',
      entityType: 'reaction',
      entityId: propertyId,
      payload: { reaction },
    }),

  // Search
  searchSaved: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    searchId: string,
    name: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'search_saved',
      entityType: 'search',
      entityId: searchId,
      payload: { name },
    }),

  // Message
  messageSent: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    conversationId: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'message_sent',
      entityType: 'message',
      entityId: conversationId,
    }),

  // Document
  documentUploaded: (
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    documentId: string,
    documentType: string
  ) =>
    logActivity(supabase, {
      projectId,
      userId,
      activityType: 'document_uploaded',
      entityType: 'document',
      entityId: documentId,
      payload: { documentType },
    }),
};
