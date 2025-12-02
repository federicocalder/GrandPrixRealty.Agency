-- ============================================
-- PHASE 3: Row Level Security Policies
-- Grand Prix Realty
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user is a member of a project
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM buyer_projects
    WHERE id = project_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is project owner
CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM buyer_projects
    WHERE id = project_uuid AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER_PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Users can read profiles of people in their projects
CREATE POLICY "Users can view project member profiles"
  ON user_profiles FOR SELECT
  USING (
    id IN (
      SELECT pm.user_id FROM project_members pm
      JOIN buyer_projects bp ON pm.project_id = bp.id
      WHERE bp.owner_id = auth.uid() OR pm.user_id = auth.uid()
    )
    OR id IN (
      SELECT owner_id FROM buyer_projects bp
      JOIN project_members pm ON pm.project_id = bp.id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- BUYER_PROJECTS POLICIES
-- ============================================

-- Users can view projects they own or are members of
CREATE POLICY "Users can view their projects"
  ON buyer_projects FOR SELECT
  USING (
    owner_id = auth.uid()
    OR is_project_member(id)
  );

-- Users can create their own projects
CREATE POLICY "Users can create projects"
  ON buyer_projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their projects
CREATE POLICY "Owners can update projects"
  ON buyer_projects FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can delete their projects
CREATE POLICY "Owners can delete projects"
  ON buyer_projects FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- PROJECT_MEMBERS POLICIES
-- ============================================

-- Project members can view other members
CREATE POLICY "Members can view project members"
  ON project_members FOR SELECT
  USING (is_project_member(project_id));

-- Project owners can add members
CREATE POLICY "Owners can add members"
  ON project_members FOR INSERT
  WITH CHECK (is_project_owner(project_id));

-- Project owners can update members
CREATE POLICY "Owners can update members"
  ON project_members FOR UPDATE
  USING (is_project_owner(project_id));

-- Project owners can remove members
CREATE POLICY "Owners can remove members"
  ON project_members FOR DELETE
  USING (is_project_owner(project_id));

-- ============================================
-- PROJECT_INVITATIONS POLICIES
-- ============================================

-- Project members can view invitations
CREATE POLICY "Members can view invitations"
  ON project_invitations FOR SELECT
  USING (is_project_member(project_id) OR email = auth.email());

-- Project owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON project_invitations FOR INSERT
  WITH CHECK (is_project_owner(project_id));

-- Invitees can update (accept) their invitations
CREATE POLICY "Invitees can accept invitations"
  ON project_invitations FOR UPDATE
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

-- Project owners can delete invitations
CREATE POLICY "Owners can delete invitations"
  ON project_invitations FOR DELETE
  USING (is_project_owner(project_id));

-- ============================================
-- PROJECT_STAGES POLICIES
-- ============================================

-- Project members can view stages
CREATE POLICY "Members can view stages"
  ON project_stages FOR SELECT
  USING (is_project_member(project_id));

-- Project members can update stages (mark complete, add notes)
CREATE POLICY "Members can update stages"
  ON project_stages FOR UPDATE
  USING (is_project_member(project_id));

-- ============================================
-- SAVED_SEARCHES POLICIES
-- ============================================

-- Users can view their own searches or project searches they're members of
CREATE POLICY "Users can view saved searches"
  ON saved_searches FOR SELECT
  USING (user_id = auth.uid() OR is_project_member(project_id));

-- Users can create searches in their projects
CREATE POLICY "Users can create searches"
  ON saved_searches FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_project_member(project_id));

-- Users can update their own searches
CREATE POLICY "Users can update own searches"
  ON saved_searches FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own searches
CREATE POLICY "Users can delete own searches"
  ON saved_searches FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- SAVED_PROPERTIES POLICIES
-- ============================================

-- Project members can view saved properties
CREATE POLICY "Members can view saved properties"
  ON saved_properties FOR SELECT
  USING (is_project_member(project_id));

-- Project members can save properties
CREATE POLICY "Members can save properties"
  ON saved_properties FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_project_member(project_id));

-- Users can update their own saved properties
CREATE POLICY "Users can update own saved properties"
  ON saved_properties FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own saved properties
CREATE POLICY "Users can delete own saved properties"
  ON saved_properties FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- PROPERTY_NOTES POLICIES
-- ============================================

-- Project members can view non-private notes, users can view their own private notes
CREATE POLICY "Users can view notes"
  ON property_notes FOR SELECT
  USING (
    (is_private = FALSE AND is_project_member(
      (SELECT project_id FROM saved_properties WHERE id = saved_property_id)
    ))
    OR user_id = auth.uid()
  );

-- Project members can create notes
CREATE POLICY "Members can create notes"
  ON property_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_project_member(
      (SELECT project_id FROM saved_properties WHERE id = saved_property_id)
    )
  );

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON property_notes FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON property_notes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- PROPERTY_REACTIONS POLICIES
-- ============================================

-- Project members can view reactions
CREATE POLICY "Members can view reactions"
  ON property_reactions FOR SELECT
  USING (
    is_project_member(
      (SELECT project_id FROM saved_properties WHERE id = saved_property_id)
    )
  );

-- Project members can add reactions
CREATE POLICY "Members can add reactions"
  ON property_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_project_member(
      (SELECT project_id FROM saved_properties WHERE id = saved_property_id)
    )
  );

-- Users can update their own reactions
CREATE POLICY "Users can update own reactions"
  ON property_reactions FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON property_reactions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================

-- Members can view project conversations
CREATE POLICY "Members can view conversations"
  ON conversations FOR SELECT
  USING (is_project_member(project_id));

-- Members can create conversations
CREATE POLICY "Members can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (is_project_member(project_id));

-- ============================================
-- CONVERSATION_MEMBERS POLICIES
-- ============================================

-- Conversation members can view other members
CREATE POLICY "Members can view conversation members"
  ON conversation_members FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
    )
  );

-- Project members can add users to conversations
CREATE POLICY "Members can add conversation members"
  ON conversation_members FOR INSERT
  WITH CHECK (
    is_project_member(
      (SELECT project_id FROM conversations WHERE id = conversation_id)
    )
  );

-- Users can update their own membership (notifications, last_read)
CREATE POLICY "Users can update own membership"
  ON conversation_members FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Conversation members can view messages
CREATE POLICY "Members can view messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
    )
  );

-- Conversation members can send messages
CREATE POLICY "Members can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
    )
  );

-- Users can edit their own messages
CREATE POLICY "Users can edit own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Users can delete (soft) their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (sender_id = auth.uid());

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================

-- Project members can view non-private documents, users can view their own private docs
CREATE POLICY "Users can view documents"
  ON documents FOR SELECT
  USING (
    (is_private = FALSE AND is_project_member(project_id))
    OR uploaded_by = auth.uid()
    OR is_admin()
  );

-- Project members can upload documents
CREATE POLICY "Members can upload documents"
  ON documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND is_project_member(project_id)
  );

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (uploaded_by = auth.uid());

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (uploaded_by = auth.uid());

-- ============================================
-- ACTIVITY_LOG POLICIES
-- ============================================

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- System can insert activity (via service role)
CREATE POLICY "System can log activity"
  ON activity_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- ENABLE REALTIME FOR MESSAGING
-- ============================================

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;

-- ============================================
-- DONE! RLS policies created successfully.
-- ============================================
