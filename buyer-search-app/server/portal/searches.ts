// ============================================
// Saved Searches Helpers - Server Side
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  SavedSearch,
  CreateSearchInput,
  AlertChannel,
  AlertFrequency,
} from '../../src/types/portal.js';

// ============================================
// SAVED SEARCHES
// ============================================

/**
 * Save a search configuration
 */
export async function saveSearch(
  supabase: SupabaseClient,
  userId: string,
  input: CreateSearchInput
): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      project_id: input.project_id,
      user_id: userId,
      name: input.name,
      filters_json: input.filters_json,
      alert_enabled: input.alert_enabled || false,
      alert_channel: input.alert_channel || 'email',
      alert_frequency: input.alert_frequency || 'daily',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save search: ${error.message}`);
  }

  return data as SavedSearch;
}

/**
 * Get saved searches for a project
 */
export async function getProjectSearches(
  supabase: SupabaseClient,
  projectId: string
): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch searches: ${error.message}`);
  }

  return (data || []) as SavedSearch[];
}

/**
 * Get a single saved search
 */
export async function getSavedSearch(
  supabase: SupabaseClient,
  searchId: string
): Promise<SavedSearch | null> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('id', searchId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch search: ${error.message}`);
  }

  return data as SavedSearch;
}

/**
 * Update a saved search
 */
export async function updateSavedSearch(
  supabase: SupabaseClient,
  searchId: string,
  updates: {
    name?: string;
    filters_json?: Record<string, unknown>;
    alert_enabled?: boolean;
    alert_channel?: AlertChannel;
    alert_frequency?: AlertFrequency;
  }
): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from('saved_searches')
    .update(updates)
    .eq('id', searchId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update search: ${error.message}`);
  }

  return data as SavedSearch;
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(
  supabase: SupabaseClient,
  searchId: string
): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', searchId);

  if (error) {
    throw new Error(`Failed to delete search: ${error.message}`);
  }
}

/**
 * Toggle alert for a saved search
 */
export async function toggleSearchAlert(
  supabase: SupabaseClient,
  searchId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .update({ alert_enabled: enabled })
    .eq('id', searchId);

  if (error) {
    throw new Error(`Failed to toggle alert: ${error.message}`);
  }
}

/**
 * Update search run metadata (called after running search for alerts)
 */
export async function updateSearchRunMetadata(
  supabase: SupabaseClient,
  searchId: string,
  resultsCount: number
): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .update({
      last_run_at: new Date().toISOString(),
      last_results_count: resultsCount,
    })
    .eq('id', searchId);

  if (error) {
    throw new Error(`Failed to update search metadata: ${error.message}`);
  }
}

/**
 * Get all searches with alerts enabled (for background job)
 */
export async function getSearchesWithAlerts(
  supabase: SupabaseClient,
  frequency?: AlertFrequency
): Promise<SavedSearch[]> {
  let query = supabase
    .from('saved_searches')
    .select('*')
    .eq('alert_enabled', true);

  if (frequency) {
    query = query.eq('alert_frequency', frequency);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch alert searches: ${error.message}`);
  }

  return (data || []) as SavedSearch[];
}
