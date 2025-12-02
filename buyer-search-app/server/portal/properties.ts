// ============================================
// Saved Properties Helpers - Server Side
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  SavedProperty,
  SavedPropertyWithDetails,
  ListingSnapshot,
  SavePropertyInput,
  CreateNoteInput,
  ReactionType,
} from '../../src/types/portal.js';

// ============================================
// SAVED PROPERTIES
// ============================================

/**
 * Save a property to a project
 */
export async function saveProperty(
  supabase: SupabaseClient,
  userId: string,
  input: SavePropertyInput
): Promise<SavedProperty> {
  const { data, error } = await supabase
    .from('saved_properties')
    .insert({
      project_id: input.project_id,
      user_id: userId,
      listing_key: input.listing_key,
      listing_id: input.listing_id,
      is_favorite: input.is_favorite || false,
      listing_snapshot_json: input.listing_snapshot || null,
      snapshot_updated_at: input.listing_snapshot ? new Date().toISOString() : null,
      price_at_save: input.listing_snapshot?.price || null,
      status_at_save: input.listing_snapshot?.status || null,
    })
    .select()
    .single();

  if (error) {
    // Check if it's a duplicate
    if (error.code === '23505') {
      throw new Error('Property already saved to this project');
    }
    throw new Error(`Failed to save property: ${error.message}`);
  }

  return data as SavedProperty;
}

/**
 * Remove a saved property
 */
export async function removeProperty(
  supabase: SupabaseClient,
  savedPropertyId: string
): Promise<void> {
  const { error } = await supabase
    .from('saved_properties')
    .delete()
    .eq('id', savedPropertyId);

  if (error) {
    throw new Error(`Failed to remove property: ${error.message}`);
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  supabase: SupabaseClient,
  savedPropertyId: string,
  isFavorite: boolean
): Promise<void> {
  const { error } = await supabase
    .from('saved_properties')
    .update({ is_favorite: isFavorite })
    .eq('id', savedPropertyId);

  if (error) {
    throw new Error(`Failed to toggle favorite: ${error.message}`);
  }
}

/**
 * Get saved properties for a project
 */
export async function getProjectProperties(
  supabase: SupabaseClient,
  projectId: string
): Promise<SavedPropertyWithDetails[]> {
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

  if (error) {
    throw new Error(`Failed to fetch properties: ${error.message}`);
  }

  return (data || []) as SavedPropertyWithDetails[];
}

/**
 * Get favorites only
 */
export async function getProjectFavorites(
  supabase: SupabaseClient,
  projectId: string
): Promise<SavedProperty[]> {
  const { data, error } = await supabase
    .from('saved_properties')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_favorite', true)
    .order('saved_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch favorites: ${error.message}`);
  }

  return (data || []) as SavedProperty[];
}

/**
 * Update listing snapshot (for syncing with live MLS data)
 */
export async function updateListingSnapshot(
  supabase: SupabaseClient,
  savedPropertyId: string,
  snapshot: ListingSnapshot
): Promise<void> {
  const { error } = await supabase
    .from('saved_properties')
    .update({
      listing_snapshot_json: snapshot,
      snapshot_updated_at: new Date().toISOString(),
    })
    .eq('id', savedPropertyId);

  if (error) {
    throw new Error(`Failed to update snapshot: ${error.message}`);
  }
}

/**
 * Check if a listing is already saved to a project
 */
export async function isPropertySaved(
  supabase: SupabaseClient,
  projectId: string,
  listingKey: string
): Promise<SavedProperty | null> {
  const { data, error } = await supabase
    .from('saved_properties')
    .select('*')
    .eq('project_id', projectId)
    .eq('listing_key', listingKey)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to check property: ${error.message}`);
  }

  return data as SavedProperty | null;
}

// ============================================
// PROPERTY NOTES
// ============================================

/**
 * Add a note to a saved property
 */
export async function addPropertyNote(
  supabase: SupabaseClient,
  userId: string,
  input: CreateNoteInput
): Promise<void> {
  const { error } = await supabase.from('property_notes').insert({
    saved_property_id: input.saved_property_id,
    user_id: userId,
    note_text: input.note_text,
    is_private: input.is_private || false,
  });

  if (error) {
    throw new Error(`Failed to add note: ${error.message}`);
  }
}

/**
 * Update a note
 */
export async function updatePropertyNote(
  supabase: SupabaseClient,
  noteId: string,
  noteText: string
): Promise<void> {
  const { error } = await supabase
    .from('property_notes')
    .update({ note_text: noteText })
    .eq('id', noteId);

  if (error) {
    throw new Error(`Failed to update note: ${error.message}`);
  }
}

/**
 * Delete a note
 */
export async function deletePropertyNote(
  supabase: SupabaseClient,
  noteId: string
): Promise<void> {
  const { error } = await supabase
    .from('property_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    throw new Error(`Failed to delete note: ${error.message}`);
  }
}

// ============================================
// PROPERTY REACTIONS
// ============================================

/**
 * Set or update a reaction on a property
 */
export async function setPropertyReaction(
  supabase: SupabaseClient,
  savedPropertyId: string,
  userId: string,
  reaction: ReactionType
): Promise<void> {
  const { error } = await supabase
    .from('property_reactions')
    .upsert(
      {
        saved_property_id: savedPropertyId,
        user_id: userId,
        reaction,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'saved_property_id,user_id',
      }
    );

  if (error) {
    throw new Error(`Failed to set reaction: ${error.message}`);
  }
}

/**
 * Remove a reaction
 */
export async function removePropertyReaction(
  supabase: SupabaseClient,
  savedPropertyId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('property_reactions')
    .delete()
    .eq('saved_property_id', savedPropertyId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to remove reaction: ${error.message}`);
  }
}

/**
 * Get reaction summary for a property
 */
export async function getPropertyReactionSummary(
  supabase: SupabaseClient,
  savedPropertyId: string
): Promise<{ love: number; pass: number; considering: number }> {
  const { data, error } = await supabase
    .from('property_reactions')
    .select('reaction')
    .eq('saved_property_id', savedPropertyId);

  if (error) {
    throw new Error(`Failed to get reactions: ${error.message}`);
  }

  const summary = { love: 0, pass: 0, considering: 0 };
  data?.forEach((r) => {
    if (r.reaction in summary) {
      summary[r.reaction as keyof typeof summary]++;
    }
  });

  return summary;
}
