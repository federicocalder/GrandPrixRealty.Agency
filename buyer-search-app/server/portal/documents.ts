// ============================================
// Document Helpers - Server Side
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Document,
  DocumentType,
  UploadDocumentInput,
  DOCUMENT_CATEGORIES,
} from '../../src/types/portal.js';

// ============================================
// DOCUMENTS
// ============================================

/**
 * Upload a document record (file already uploaded to storage)
 */
export async function createDocumentRecord(
  supabase: SupabaseClient,
  userId: string,
  input: UploadDocumentInput
): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      project_id: input.project_id,
      listing_key: input.listing_key || null,
      document_type: input.document_type,
      file_name: input.file_name,
      file_url: input.file_url,
      file_size: input.file_size || null,
      mime_type: input.mime_type || null,
      description: input.description || null,
      uploaded_by: userId,
      is_private: input.is_private || false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create document record: ${error.message}`);
  }

  return data as Document;
}

/**
 * Get documents for a project
 */
export async function getProjectDocuments(
  supabase: SupabaseClient,
  projectId: string,
  documentType?: DocumentType
): Promise<Document[]> {
  let query = supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .is('listing_key', null) // Project-level docs only
    .order('uploaded_at', { ascending: false });

  if (documentType) {
    query = query.eq('document_type', documentType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return (data || []) as Document[];
}

/**
 * Get documents for a specific listing
 */
export async function getListingDocuments(
  supabase: SupabaseClient,
  projectId: string,
  listingKey: string
): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('listing_key', listingKey)
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch listing documents: ${error.message}`);
  }

  return (data || []) as Document[];
}

/**
 * Get all documents for a project (including listing-specific)
 */
export async function getAllProjectDocuments(
  supabase: SupabaseClient,
  projectId: string
): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch all documents: ${error.message}`);
  }

  return (data || []) as Document[];
}

/**
 * Get documents by category (uses DOCUMENT_CATEGORIES mapping)
 */
export async function getDocumentsByCategory(
  supabase: SupabaseClient,
  projectId: string,
  category: keyof typeof DOCUMENT_CATEGORIES
): Promise<Document[]> {
  const types = DOCUMENT_CATEGORIES[category];
  if (!types) {
    return [];
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .in('document_type', types)
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch documents by category: ${error.message}`);
  }

  return (data || []) as Document[];
}

/**
 * Update document metadata
 */
export async function updateDocument(
  supabase: SupabaseClient,
  documentId: string,
  updates: {
    document_type?: DocumentType;
    description?: string;
    is_private?: boolean;
  }
): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }

  return data as Document;
}

/**
 * Delete a document (record only - storage file should be deleted separately)
 */
export async function deleteDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Get a single document
 */
export async function getDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch document: ${error.message}`);
  }

  return data as Document;
}

// ============================================
// STORAGE HELPERS
// ============================================

/**
 * Upload a file to Supabase Storage and create document record
 */
export async function uploadDocument(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  file: File,
  documentType: DocumentType,
  options?: {
    listingKey?: string;
    description?: string;
    isPrivate?: boolean;
  }
): Promise<Document> {
  const bucket = 'documents';
  const fileName = `${projectId}/${Date.now()}_${file.name}`;

  // Upload file to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

  // Create document record
  return createDocumentRecord(supabase, userId, {
    project_id: projectId,
    listing_key: options?.listingKey,
    document_type: documentType,
    file_name: file.name,
    file_url: urlData.publicUrl,
    file_size: file.size,
    mime_type: file.type,
    description: options?.description,
    is_private: options?.isPrivate,
  });
}

/**
 * Delete a document including storage file
 */
export async function deleteDocumentWithFile(
  supabase: SupabaseClient,
  documentId: string
): Promise<void> {
  // Get document to find file path
  const doc = await getDocument(supabase, documentId);
  if (!doc) {
    throw new Error('Document not found');
  }

  // Extract file path from URL
  const url = new URL(doc.file_url);
  const pathParts = url.pathname.split('/storage/v1/object/public/documents/');
  const filePath = pathParts[1];

  if (filePath) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
      // Continue to delete record even if storage delete fails
    }
  }

  // Delete document record
  await deleteDocument(supabase, documentId);
}
