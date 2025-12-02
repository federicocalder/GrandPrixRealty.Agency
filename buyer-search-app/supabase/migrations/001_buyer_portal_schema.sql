-- ============================================
-- PHASE 3: Buyer Portal MVP - Database Schema
-- Grand Prix Realty
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USER PROFILES
-- Links to Supabase auth.users
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'agent', 'loan_officer', 'escrow', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. BUYER PROJECTS
-- Each buyer can have multiple home purchase projects
-- ============================================
CREATE TABLE IF NOT EXISTS buyer_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Home Search',
  project_type TEXT NOT NULL DEFAULT 'primary' CHECK (project_type IN ('primary', 'investment', 'second_home', 'relocation')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),
  target_city TEXT,
  target_state TEXT DEFAULT 'NV',
  budget_min INTEGER,
  budget_max INTEGER,
  target_beds INTEGER,
  target_baths INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by owner
CREATE INDEX IF NOT EXISTS idx_buyer_projects_owner ON buyer_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_buyer_projects_status ON buyer_projects(status);

-- ============================================
-- 3. PROJECT MEMBERS
-- Attach agents, LOs, escrow officers, co-borrowers to projects
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES buyer_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL CHECK (role_in_project IN ('buyer', 'co_borrower', 'agent', 'loan_officer', 'escrow', 'other')),
  invited_email TEXT, -- For users not yet registered
  permissions JSONB DEFAULT '{"can_view": true, "can_edit": false, "can_message": true}'::jsonb,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Either user_id or invited_email must be set
  CONSTRAINT member_identity CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL),
  -- Unique member per project
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- ============================================
-- 4. PROJECT INVITATIONS
-- For inviting pros who haven't signed up yet
-- ============================================
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES buyer_projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_in_project TEXT NOT NULL CHECK (role_in_project IN ('co_borrower', 'agent', 'loan_officer', 'escrow', 'other')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES user_profiles(id),
  message TEXT, -- Optional personal message
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);

-- ============================================
-- 5. PROJECT STAGES
-- Track progress through the home buying journey
-- ============================================
CREATE TABLE IF NOT EXISTS project_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES buyer_projects(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL CHECK (stage_key IN ('search', 'preapproval', 'showings', 'offers', 'under_contract', 'inspection', 'appraisal', 'final_walkthrough', 'closing')),
  sort_order INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id),
  assigned_agent_id UUID REFERENCES user_profiles(id),
  assigned_loan_officer_id UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One stage per type per project
  CONSTRAINT unique_project_stage UNIQUE (project_id, stage_key)
);

CREATE INDEX IF NOT EXISTS idx_project_stages_project ON project_stages(project_id);

-- Default stages with sort order
CREATE OR REPLACE FUNCTION create_default_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_stages (project_id, stage_key, sort_order) VALUES
    (NEW.id, 'search', 1),
    (NEW.id, 'preapproval', 2),
    (NEW.id, 'showings', 3),
    (NEW.id, 'offers', 4),
    (NEW.id, 'under_contract', 5),
    (NEW.id, 'inspection', 6),
    (NEW.id, 'appraisal', 7),
    (NEW.id, 'final_walkthrough', 8),
    (NEW.id, 'closing', 9);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_project_created ON buyer_projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON buyer_projects
  FOR EACH ROW EXECUTE FUNCTION create_default_stages();

-- ============================================
-- 6. SAVED SEARCHES
-- Store filter configurations for alerts
-- ============================================
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES buyer_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters_json JSONB NOT NULL, -- Trestle filter payload
  alert_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  alert_channel TEXT DEFAULT 'email' CHECK (alert_channel IN ('email', 'sms', 'both', 'push')),
  alert_frequency TEXT DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
  last_run_at TIMESTAMPTZ,
  last_results_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_project ON saved_searches(project_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alerts ON saved_searches(alert_enabled) WHERE alert_enabled = TRUE;

-- ============================================
-- 7. SAVED PROPERTIES
-- Favorited/saved listings with snapshot
-- ============================================
CREATE TABLE IF NOT EXISTS saved_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES buyer_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  listing_key TEXT NOT NULL, -- Trestle ListingKey
  listing_id TEXT NOT NULL, -- MLS number for display
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

  -- Snapshot of listing data at save time
  listing_snapshot_json JSONB, -- Core fields: price, address, beds, baths, sqft, photo, status
  snapshot_updated_at TIMESTAMPTZ,

  -- Track if listing changed since saved
  price_at_save INTEGER,
  status_at_save TEXT,

  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One save per listing per project
  CONSTRAINT unique_saved_property UNIQUE (project_id, listing_key)
);

CREATE INDEX IF NOT EXISTS idx_saved_properties_project ON saved_properties(project_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_user ON saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_listing ON saved_properties(listing_key);
CREATE INDEX IF NOT EXISTS idx_saved_properties_favorites ON saved_properties(is_favorite) WHERE is_favorite = TRUE;

-- ============================================
-- 8. PROPERTY NOTES
-- Notes/comments on saved properties
-- ============================================
CREATE TABLE IF NOT EXISTS property_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  saved_property_id UUID NOT NULL REFERENCES saved_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE, -- Private = only visible to author
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_notes_property ON property_notes(saved_property_id);
CREATE INDEX IF NOT EXISTS idx_property_notes_user ON property_notes(user_id);

-- ============================================
-- 9. PROPERTY REACTIONS
-- Love / Pass / Considering reactions
-- ============================================
CREATE TABLE IF NOT EXISTS property_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  saved_property_id UUID NOT NULL REFERENCES saved_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('love', 'pass', 'considering')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One reaction per user per property
  CONSTRAINT unique_user_reaction UNIQUE (saved_property_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_property_reactions_property ON property_reactions(saved_property_id);
CREATE INDEX IF NOT EXISTS idx_property_reactions_user ON property_reactions(user_id);

-- ============================================
-- 10. CONVERSATIONS
-- Chat threads (per property or general project)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES buyer_projects(id) ON DELETE CASCADE,
  listing_key TEXT, -- NULL = general project chat
  title TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_key);

-- ============================================
-- 11. CONVERSATION MEMBERS
-- Who's in each conversation
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_conversation_member UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);

-- ============================================
-- 12. MESSAGES
-- Individual chat messages
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB, -- For attachments, mentions, etc.
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- 13. DOCUMENTS
-- Uploaded files (financing, inspection, closing docs)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES buyer_projects(id) ON DELETE CASCADE,
  listing_key TEXT, -- NULL = general project document
  document_type TEXT NOT NULL CHECK (document_type IN (
    'id', 'bank_statement', 'w2', 'paystub', 'tax_return',
    'preapproval_letter', 'proof_of_funds',
    'inspection', 'appraisal', 'survey',
    'purchase_agreement', 'addendum', 'counteroffer',
    'title_commitment', 'title_insurance', 'deed',
    'closing_disclosure', 'settlement_statement',
    'other'
  )),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage path
  file_size INTEGER, -- bytes
  mime_type TEXT,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
  is_private BOOLEAN NOT NULL DEFAULT FALSE, -- Private = only visible to uploader + admins
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_listing ON documents(listing_key);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploaded_by);

-- ============================================
-- 14. ACTIVITY LOG
-- Track all user actions for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES buyer_projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  entity_type TEXT, -- 'property', 'search', 'document', 'message', etc.
  entity_id TEXT, -- ID of the related entity
  payload JSONB, -- Additional details
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================
-- 15. UPDATED_AT TRIGGER FUNCTION
-- Automatically update updated_at on row changes
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'user_profiles', 'buyer_projects', 'project_stages',
      'saved_searches', 'property_notes', 'property_reactions'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================
-- DONE! Schema created successfully.
-- ============================================
