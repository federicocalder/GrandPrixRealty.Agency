// ============================================
// Saved Properties Hook - React
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type {
  SavedProperty,
  SavedPropertyWithDetails,
  ListingSnapshot,
  ReactionType,
} from '../../types/portal';

interface SavedPropertiesState {
  properties: SavedPropertyWithDetails[];
  favorites: SavedProperty[];
  loading: boolean;
  error: string | null;
}

export function useSavedProperties(projectId?: string, userId?: string) {
  const [state, setState] = useState<SavedPropertiesState>({
    properties: [],
    favorites: [],
    loading: true,
    error: null,
  });

  // Fetch saved properties for project
  const fetchProperties = useCallback(async () => {
    if (!projectId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('saved_properties')
        .select(`
          *,
          user:user_profiles(*),
          notes:property_notes(*),
          reactions:property_reactions(*)
        `)
        .eq('project_id', projectId)
        .order('saved_at', { ascending: false });

      if (error) throw error;

      const properties = (data || []) as SavedPropertyWithDetails[];
      const favorites = properties.filter((p) => p.is_favorite);

      setState((prev) => ({
        ...prev,
        properties,
        favorites,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch properties';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [projectId]);

  // Save a property
  const saveProperty = useCallback(async (
    listingKey: string,
    listingId: string,
    snapshot?: ListingSnapshot,
    isFavorite = false
  ) => {
    if (!projectId || !userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('saved_properties')
        .insert({
          project_id: projectId,
          user_id: userId,
          listing_key: listingKey,
          listing_id: listingId,
          is_favorite: isFavorite,
          listing_snapshot_json: snapshot || null,
          snapshot_updated_at: snapshot ? new Date().toISOString() : null,
          price_at_save: snapshot?.price || null,
          status_at_save: snapshot?.status || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Property already saved');
        }
        throw error;
      }

      await fetchProperties();
      return data as SavedProperty;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save property';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [projectId, userId, fetchProperties]);

  // Remove a saved property
  const removeProperty = useCallback(async (savedPropertyId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('id', savedPropertyId);

      if (error) throw error;

      await fetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove property';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchProperties]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (savedPropertyId: string, isFavorite: boolean) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('saved_properties')
        .update({ is_favorite: isFavorite })
        .eq('id', savedPropertyId);

      if (error) throw error;

      await fetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle favorite';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchProperties]);

  // Check if property is saved
  const isPropertySaved = useCallback((listingKey: string) => {
    return state.properties.some((p) => p.listing_key === listingKey);
  }, [state.properties]);

  // Get saved property by listing key
  const getSavedProperty = useCallback((listingKey: string) => {
    return state.properties.find((p) => p.listing_key === listingKey);
  }, [state.properties]);

  // Add note to property
  const addNote = useCallback(async (
    savedPropertyId: string,
    noteText: string,
    isPrivate = false
  ) => {
    if (!userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase.from('property_notes').insert({
        saved_property_id: savedPropertyId,
        user_id: userId,
        note_text: noteText,
        is_private: isPrivate,
      });

      if (error) throw error;

      await fetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add note';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [userId, fetchProperties]);

  // Update note
  const updateNote = useCallback(async (noteId: string, noteText: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('property_notes')
        .update({ note_text: noteText })
        .eq('id', noteId);

      if (error) throw error;

      await fetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update note';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchProperties]);

  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('property_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      await fetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete note';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [fetchProperties]);

  // Set reaction
  const setReaction = useCallback(async (savedPropertyId: string, reaction: ReactionType) => {
    if (!userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('property_reactions')
        .upsert(
          {
            saved_property_id: savedPropertyId,
            user_id: userId,
            reaction,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'saved_property_id,user_id' }
        );

      if (error) throw error;

      await fetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set reaction';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [userId, fetchProperties]);

  // Remove reaction
  const removeReaction = useCallback(async (savedPropertyId: string) => {
    if (!userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from('property_reactions')
        .delete()
        .eq('saved_property_id', savedPropertyId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchProperties();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove reaction';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [userId, fetchProperties]);

  // Get user's reaction for a property
  const getUserReaction = useCallback((savedPropertyId: string) => {
    const property = state.properties.find((p) => p.id === savedPropertyId);
    if (!property || !userId) return null;

    const reaction = property.reactions.find((r) => r.user_id === userId);
    return reaction?.reaction || null;
  }, [state.properties, userId]);

  // Initialize
  useEffect(() => {
    if (projectId) {
      fetchProperties();
    } else {
      setState({
        properties: [],
        favorites: [],
        loading: false,
        error: null,
      });
    }
  }, [projectId, fetchProperties]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    properties: state.properties,
    favorites: state.favorites,
    loading: state.loading,
    error: state.error,

    // Methods
    fetchProperties,
    saveProperty,
    removeProperty,
    toggleFavorite,
    isPropertySaved,
    getSavedProperty,
    addNote,
    updateNote,
    deleteNote,
    setReaction,
    removeReaction,
    getUserReaction,
    clearError,
  };
}
