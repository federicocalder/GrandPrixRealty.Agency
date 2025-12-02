// ============================================
// Saved Searches Hook - React
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type {
  SavedSearch,
  CreateSearchInput,
  AlertChannel,
  AlertFrequency,
} from '../../types/portal';

interface SavedSearchesState {
  searches: SavedSearch[];
  loading: boolean;
  error: string | null;
}

export function useSavedSearches(projectId?: string, userId?: string) {
  const [state, setState] = useState<SavedSearchesState>({
    searches: [],
    loading: true,
    error: null,
  });

  // Fetch saved searches for project
  const fetchSearches = useCallback(async () => {
    if (!projectId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        searches: (data || []) as SavedSearch[],
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch searches';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [projectId]);

  // Save a search
  const saveSearch = useCallback(async (input: Omit<CreateSearchInput, 'project_id'>) => {
    if (!projectId || !userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          project_id: projectId,
          user_id: userId,
          name: input.name,
          filters_json: input.filters_json,
          alert_enabled: input.alert_enabled || false,
          alert_channel: input.alert_channel || 'email',
          alert_frequency: input.alert_frequency || 'daily',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSearches();
      return data as SavedSearch;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save search';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [projectId, userId, fetchSearches]);

  // Update a saved search
  const updateSearch = useCallback(async (
    searchId: string,
    updates: {
      name?: string;
      filters_json?: Record<string, unknown>;
      alert_enabled?: boolean;
      alert_channel?: AlertChannel;
      alert_frequency?: AlertFrequency;
    }
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .update(updates)
        .eq('id', searchId)
        .select()
        .single();

      if (error) throw error;

      await fetchSearches();
      return data as SavedSearch;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update search';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchSearches]);

  // Delete a saved search
  const deleteSearch = useCallback(async (searchId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      await fetchSearches();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete search';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchSearches]);

  // Toggle alert for a search
  const toggleAlert = useCallback(async (searchId: string, enabled: boolean) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ alert_enabled: enabled })
        .eq('id', searchId);

      if (error) throw error;

      await fetchSearches();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle alert';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchSearches]);

  // Get a single saved search
  const getSearch = useCallback((searchId: string) => {
    return state.searches.find((s) => s.id === searchId);
  }, [state.searches]);

  // Run a saved search (return filters for use with listings API)
  const runSearch = useCallback((searchId: string) => {
    const search = state.searches.find((s) => s.id === searchId);
    if (!search) return null;

    return search.filters_json;
  }, [state.searches]);

  // Initialize
  useEffect(() => {
    if (projectId) {
      fetchSearches();
    } else {
      setState({
        searches: [],
        loading: false,
        error: null,
      });
    }
  }, [projectId, fetchSearches]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    searches: state.searches,
    loading: state.loading,
    error: state.error,

    // Methods
    fetchSearches,
    saveSearch,
    updateSearch,
    deleteSearch,
    toggleAlert,
    getSearch,
    runSearch,
    clearError,
  };
}
