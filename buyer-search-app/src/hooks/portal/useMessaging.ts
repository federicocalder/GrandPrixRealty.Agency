// ============================================
// Messaging Hook - React with Realtime
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import type {
  Conversation,
  ConversationWithMessages,
  Message,
  MessageWithSender,
} from '../../types/portal';

interface MessagingState {
  conversations: Conversation[];
  currentConversation: ConversationWithMessages | null;
  loading: boolean;
  error: string | null;
  unreadCounts: Record<string, number>;
}

export function useMessaging(projectId?: string, userId?: string) {
  const [state, setState] = useState<MessagingState>({
    conversations: [],
    currentConversation: null,
    loading: true,
    error: null,
    unreadCounts: {},
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch conversations for project
  const fetchConversations = useCallback(async () => {
    if (!projectId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', projectId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        conversations: (data || []) as Conversation[],
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch conversations';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [projectId]);

  // Fetch conversation with messages
  const fetchConversationWithMessages = useCallback(async (
    conversationId: string,
    messageLimit = 50
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
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

      if (convoError) throw convoError;

      // Get messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles(*)
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(messageLimit);

      if (msgError) throw msgError;

      const conversation: ConversationWithMessages = {
        ...convo,
        messages: ((messages || []) as MessageWithSender[]).reverse(),
      };

      setState((prev) => ({
        ...prev,
        currentConversation: conversation,
        loading: false,
      }));

      return conversation;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch conversation';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  // Get or create conversation
  const getOrCreateConversation = useCallback(async (
    listingKey: string | null = null,
    title?: string
  ) => {
    if (!projectId || !userId) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Try to find existing
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('project_id', projectId);

      if (listingKey) {
        query = query.eq('listing_key', listingKey);
      } else {
        query = query.is('listing_key', null);
      }

      const { data: existing } = await query.single();

      if (existing) {
        setState((prev) => ({ ...prev, loading: false }));
        return existing as Conversation;
      }

      // Create new
      const { data: newConvo, error: createError } = await supabase
        .from('conversations')
        .insert({
          project_id: projectId,
          listing_key: listingKey,
          title: title || (listingKey ? `Discussion: ${listingKey}` : 'Project Chat'),
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add creator as member
      await supabase.from('conversation_members').insert({
        conversation_id: newConvo.id,
        user_id: userId,
        notifications_enabled: true,
      });

      await fetchConversations();
      return newConvo as Conversation;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create conversation';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [projectId, userId, fetchConversations]);

  // Send message
  const sendMessage = useCallback(async (conversationId: string, body: string) => {
    if (!userId) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body,
          message_type: 'text',
        })
        .select(`
          *,
          sender:user_profiles(*)
        `)
        .single();

      if (error) throw error;

      // Optimistic update
      if (state.currentConversation?.id === conversationId) {
        setState((prev) => ({
          ...prev,
          currentConversation: prev.currentConversation
            ? {
                ...prev.currentConversation,
                messages: [...prev.currentConversation.messages, data as MessageWithSender],
              }
            : null,
        }));
      }

      return data as Message;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      setState((prev) => ({ ...prev, error: message }));
      throw error;
    }
  }, [userId, state.currentConversation?.id]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newBody: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          body: newBody,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setState((prev) => ({
        ...prev,
        currentConversation: prev.currentConversation
          ? {
              ...prev.currentConversation,
              messages: prev.currentConversation.messages.map((m) =>
                m.id === messageId ? { ...m, body: newBody, edited_at: new Date().toISOString() } : m
              ),
            }
          : null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to edit message';
      setState((prev) => ({ ...prev, error: message }));
      throw error;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setState((prev) => ({
        ...prev,
        currentConversation: prev.currentConversation
          ? {
              ...prev.currentConversation,
              messages: prev.currentConversation.messages.filter((m) => m.id !== messageId),
            }
          : null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete message';
      setState((prev) => ({ ...prev, error: message }));
      throw error;
    }
  }, []);

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!userId) return;

    try {
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      setState((prev) => ({
        ...prev,
        unreadCounts: {
          ...prev.unreadCounts,
          [conversationId]: 0,
        },
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [userId]);

  // Load more messages
  const loadMoreMessages = useCallback(async (beforeMessageId: string) => {
    if (!state.currentConversation) return;

    try {
      // Get the timestamp of the "before" message
      const beforeMessage = state.currentConversation.messages.find((m) => m.id === beforeMessageId);
      if (!beforeMessage) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles(*)
        `)
        .eq('conversation_id', state.currentConversation.id)
        .is('deleted_at', null)
        .lt('created_at', beforeMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const olderMessages = ((data || []) as MessageWithSender[]).reverse();

      setState((prev) => ({
        ...prev,
        currentConversation: prev.currentConversation
          ? {
              ...prev.currentConversation,
              messages: [...olderMessages, ...prev.currentConversation.messages],
            }
          : null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load messages';
      setState((prev) => ({ ...prev, error: message }));
    }
  }, [state.currentConversation]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!state.currentConversation?.id) return;

    const channel = supabase
      .channel(`messages:${state.currentConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${state.currentConversation.id}`,
        },
        async (payload) => {
          // Fetch sender info
          const { data: sender } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage: MessageWithSender = {
            ...(payload.new as Message),
            sender,
          };

          // Don't add if it's our own message (already added optimistically)
          if (payload.new.sender_id === userId) return;

          setState((prev) => ({
            ...prev,
            currentConversation: prev.currentConversation
              ? {
                  ...prev.currentConversation,
                  messages: [...prev.currentConversation.messages, newMessage],
                }
              : null,
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${state.currentConversation.id}`,
        },
        (payload) => {
          setState((prev) => ({
            ...prev,
            currentConversation: prev.currentConversation
              ? {
                  ...prev.currentConversation,
                  messages: prev.currentConversation.messages.map((m) =>
                    m.id === payload.new.id ? { ...m, ...payload.new } : m
                  ),
                }
              : null,
          }));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [state.currentConversation?.id, userId]);

  // Initialize
  useEffect(() => {
    if (projectId) {
      fetchConversations();
    } else {
      setState({
        conversations: [],
        currentConversation: null,
        loading: false,
        error: null,
        unreadCounts: {},
      });
    }
  }, [projectId, fetchConversations]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearCurrentConversation = useCallback(() => {
    setState((prev) => ({ ...prev, currentConversation: null }));
  }, []);

  return {
    // State
    conversations: state.conversations,
    currentConversation: state.currentConversation,
    loading: state.loading,
    error: state.error,
    unreadCounts: state.unreadCounts,

    // Methods
    fetchConversations,
    fetchConversationWithMessages,
    getOrCreateConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    loadMoreMessages,
    clearError,
    clearCurrentConversation,
  };
}
