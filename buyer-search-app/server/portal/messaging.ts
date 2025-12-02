// ============================================
// Messaging Helpers - Server Side
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Conversation,
  ConversationWithMessages,
  Message,
  MessageWithSender,
  SendMessageInput,
  MessageType,
} from '../../src/types/portal.js';

// ============================================
// CONVERSATIONS
// ============================================

/**
 * Get or create a conversation for a project/listing
 * If listingKey is null, it's the general project chat
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  listingKey: string | null = null,
  title?: string
): Promise<Conversation> {
  // Try to find existing conversation
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('project_id', projectId);

  if (listingKey) {
    query = query.eq('listing_key', listingKey);
  } else {
    query = query.is('listing_key', null);
  }

  const { data: existing, error: fetchError } = await query.single();

  if (existing && !fetchError) {
    return existing as Conversation;
  }

  // Create new conversation
  const { data: newConvo, error: createError } = await supabase
    .from('conversations')
    .insert({
      project_id: projectId,
      listing_key: listingKey,
      title: title || (listingKey ? `Discussion: ${listingKey}` : 'Project Chat'),
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create conversation: ${createError.message}`);
  }

  // Add the creator as a member
  await supabase.from('conversation_members').insert({
    conversation_id: newConvo.id,
    user_id: userId,
    notifications_enabled: true,
  });

  return newConvo as Conversation;
}

/**
 * Get conversation with messages
 */
export async function getConversationWithMessages(
  supabase: SupabaseClient,
  conversationId: string,
  messageLimit = 50,
  messageOffset = 0
): Promise<ConversationWithMessages | null> {
  // Get conversation with members
  const { data: convo, error: convoError } = await supabase
    .from('conversations')
    .select(`
      *,
      members:conversation_members(
        *,
        user:user_profiles(*)
      )
    `)
    .eq('id', conversationId)
    .single();

  if (convoError) {
    if (convoError.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch conversation: ${convoError.message}`);
  }

  // Get messages separately for pagination
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select(`
      *,
      sender:user_profiles(*)
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(messageOffset, messageOffset + messageLimit - 1);

  if (msgError) {
    throw new Error(`Failed to fetch messages: ${msgError.message}`);
  }

  return {
    ...convo,
    messages: (messages || []).reverse() as MessageWithSender[],
  } as ConversationWithMessages;
}

/**
 * Get all conversations for a project
 */
export async function getProjectConversations(
  supabase: SupabaseClient,
  projectId: string
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('project_id', projectId)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  return (data || []) as Conversation[];
}

/**
 * Get conversations for a user across all projects
 */
export async function getUserConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select(`
      conversation_id,
      conversations(*)
    `)
    .eq('user_id', userId)
    .not('conversations', 'is', null)
    .order('conversations(last_message_at)', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch user conversations: ${error.message}`);
  }

  return (data?.map((d) => d.conversations).filter(Boolean) || []) as Conversation[];
}

// ============================================
// MESSAGES
// ============================================

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  supabase: SupabaseClient,
  userId: string,
  input: SendMessageInput
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversation_id,
      sender_id: userId,
      body: input.body,
      message_type: input.message_type || 'text',
      metadata: input.metadata || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return data as Message;
}

/**
 * Edit a message
 */
export async function editMessage(
  supabase: SupabaseClient,
  messageId: string,
  newBody: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .update({
      body: newBody,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to edit message: ${error.message}`);
  }

  return data as Message;
}

/**
 * Soft delete a message
 */
export async function deleteMessage(
  supabase: SupabaseClient,
  messageId: string
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

/**
 * Get messages for a conversation (paginated)
 */
export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 50,
  before?: string // Message ID to fetch before (for pagination)
): Promise<MessageWithSender[]> {
  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:user_profiles(*)
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    // Get the timestamp of the "before" message
    const { data: beforeMsg } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', before)
      .single();

    if (beforeMsg) {
      query = query.lt('created_at', beforeMsg.created_at);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  // Reverse to get chronological order
  return ((data || []) as MessageWithSender[]).reverse();
}

// ============================================
// CONVERSATION MEMBERS
// ============================================

/**
 * Add a member to a conversation
 */
export async function addConversationMember(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('conversation_members').insert({
    conversation_id: conversationId,
    user_id: userId,
    notifications_enabled: true,
  });

  if (error && error.code !== '23505') {
    // Ignore duplicate
    throw new Error(`Failed to add conversation member: ${error.message}`);
  }
}

/**
 * Update last read timestamp
 */
export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to mark conversation read: ${error.message}`);
  }
}

/**
 * Toggle notifications for a conversation
 */
export async function toggleConversationNotifications(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('conversation_members')
    .update({ notifications_enabled: enabled })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to toggle notifications: ${error.message}`);
  }
}

/**
 * Get unread count for a user in a conversation
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<number> {
  // Get member's last read timestamp
  const { data: member, error: memberError } = await supabase
    .from('conversation_members')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  if (memberError) {
    return 0;
  }

  // Count messages after last read
  let query = supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('deleted_at', null);

  if (member?.last_read_at) {
    query = query.gt('created_at', member.last_read_at);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count || 0;
}

/**
 * Send a system message (for automated notifications)
 */
export async function sendSystemMessage(
  supabase: SupabaseClient,
  conversationId: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<Message> {
  // System messages use a special sender_id (first admin or null handling)
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: '00000000-0000-0000-0000-000000000000', // System user placeholder
      body,
      message_type: 'system' as MessageType,
      metadata,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to send system message: ${error.message}`);
  }

  return data as Message;
}
