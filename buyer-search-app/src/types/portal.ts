// ============================================
// PHASE 3: Buyer Portal TypeScript Types
// Grand Prix Realty
// ============================================

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type UserRole = 'buyer' | 'agent' | 'loan_officer' | 'escrow' | 'admin';

export type ProjectType = 'primary' | 'investment' | 'second_home' | 'relocation';

export type ProjectStatus = 'active' | 'completed' | 'archived' | 'on_hold';

export type ProjectMemberRole = 'buyer' | 'co_borrower' | 'agent' | 'loan_officer' | 'escrow' | 'other';

export type StageKey =
  | 'search'
  | 'preapproval'
  | 'showings'
  | 'offers'
  | 'under_contract'
  | 'inspection'
  | 'appraisal'
  | 'final_walkthrough'
  | 'closing';

export type AlertChannel = 'email' | 'sms' | 'both' | 'push';

export type AlertFrequency = 'instant' | 'daily' | 'weekly';

export type ReactionType = 'love' | 'pass' | 'considering';

export type MessageType = 'text' | 'image' | 'file' | 'system';

export type DocumentType =
  | 'id'
  | 'bank_statement'
  | 'w2'
  | 'paystub'
  | 'tax_return'
  | 'preapproval_letter'
  | 'proof_of_funds'
  | 'inspection'
  | 'appraisal'
  | 'survey'
  | 'purchase_agreement'
  | 'addendum'
  | 'counteroffer'
  | 'title_commitment'
  | 'title_insurance'
  | 'deed'
  | 'closing_disclosure'
  | 'settlement_statement'
  | 'other';

// ============================================
// DATABASE MODELS
// ============================================

export interface UserProfile {
  id: string; // UUID, matches auth.users.id
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface BuyerProject {
  id: string;
  owner_id: string;
  name: string;
  project_type: ProjectType;
  status: ProjectStatus;
  target_city: string | null;
  target_state: string | null;
  budget_min: number | null;
  budget_max: number | null;
  target_beds: number | null;
  target_baths: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  role_in_project: ProjectMemberRole;
  invited_email: string | null;
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_message: boolean;
  };
  joined_at: string | null;
  created_at: string;
}

export interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  role_in_project: ProjectMemberRole;
  token: string;
  invited_by: string;
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface ProjectStage {
  id: string;
  project_id: string;
  stage_key: StageKey;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  assigned_agent_id: string | null;
  assigned_loan_officer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedSearch {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  filters_json: Record<string, unknown>; // Trestle filter payload
  alert_enabled: boolean;
  alert_channel: AlertChannel;
  alert_frequency: AlertFrequency;
  last_run_at: string | null;
  last_results_count: number | null;
  created_at: string;
  updated_at: string;
}

// Snapshot of listing data stored when property is saved
export interface ListingSnapshot {
  listing_key: string;
  listing_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  year_built: number | null;
  property_type: string;
  status: string;
  photo_url: string | null;
  days_on_market: number | null;
}

export interface SavedProperty {
  id: string;
  project_id: string;
  user_id: string;
  listing_key: string;
  listing_id: string;
  is_favorite: boolean;
  listing_snapshot_json: ListingSnapshot | null;
  snapshot_updated_at: string | null;
  price_at_save: number | null;
  status_at_save: string | null;
  saved_at: string;
}

export interface PropertyNote {
  id: string;
  saved_property_id: string;
  user_id: string;
  note_text: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyReaction {
  id: string;
  saved_property_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  listing_key: string | null; // NULL = general project chat
  title: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  notifications_enabled: boolean;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  message_type: MessageType;
  metadata: Record<string, unknown> | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  listing_key: string | null;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string;
  is_private: boolean;
  uploaded_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string | null;
  user_id: string | null;
  activity_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================
// EXTENDED TYPES (with joins)
// ============================================

export interface ProjectWithMembers extends BuyerProject {
  owner: UserProfile;
  members: (ProjectMember & { user: UserProfile | null })[];
  stages: ProjectStage[];
}

export interface SavedPropertyWithDetails extends SavedProperty {
  notes: PropertyNote[];
  reactions: PropertyReaction[];
  user: UserProfile;
}

export interface ConversationWithMessages extends Conversation {
  members: (ConversationMember & { user: UserProfile })[];
  messages: (Message & { sender: UserProfile })[];
  unread_count?: number;
}

export interface MessageWithSender extends Message {
  sender: UserProfile;
}

// ============================================
// INPUT TYPES (for creating/updating)
// ============================================

export interface CreateProjectInput {
  name?: string;
  project_type?: ProjectType;
  target_city?: string;
  target_state?: string;
  budget_min?: number;
  budget_max?: number;
  target_beds?: number;
  target_baths?: number;
  notes?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: ProjectStatus;
}

export interface InviteMemberInput {
  email: string;
  role_in_project: ProjectMemberRole;
  message?: string;
}

export interface SavePropertyInput {
  project_id: string;
  listing_key: string;
  listing_id: string;
  is_favorite?: boolean;
  listing_snapshot?: ListingSnapshot;
}

export interface CreateSearchInput {
  project_id: string;
  name: string;
  filters_json: Record<string, unknown>;
  alert_enabled?: boolean;
  alert_channel?: AlertChannel;
  alert_frequency?: AlertFrequency;
}

export interface CreateNoteInput {
  saved_property_id: string;
  note_text: string;
  is_private?: boolean;
}

export interface SendMessageInput {
  conversation_id: string;
  body: string;
  message_type?: MessageType;
  metadata?: Record<string, unknown>;
}

export interface UploadDocumentInput {
  project_id: string;
  listing_key?: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  is_private?: boolean;
}

// ============================================
// STAGE DISPLAY INFO
// ============================================

export const STAGE_INFO: Record<StageKey, { label: string; description: string; icon: string }> = {
  search: {
    label: 'Home Search',
    description: 'Finding your perfect home',
    icon: '🔍',
  },
  preapproval: {
    label: 'Pre-Approval',
    description: 'Get pre-approved for a mortgage',
    icon: '💰',
  },
  showings: {
    label: 'Showings',
    description: 'Tour homes in person',
    icon: '🏠',
  },
  offers: {
    label: 'Making Offers',
    description: 'Submit offers on homes you love',
    icon: '📝',
  },
  under_contract: {
    label: 'Under Contract',
    description: 'Offer accepted, starting due diligence',
    icon: '🤝',
  },
  inspection: {
    label: 'Inspection',
    description: 'Home inspection and negotiations',
    icon: '🔧',
  },
  appraisal: {
    label: 'Appraisal',
    description: 'Lender appraisal of property value',
    icon: '📊',
  },
  final_walkthrough: {
    label: 'Final Walkthrough',
    description: 'Last look before closing',
    icon: '👀',
  },
  closing: {
    label: 'Closing',
    description: 'Sign papers and get the keys!',
    icon: '🔑',
  },
};

// ============================================
// DOCUMENT CATEGORIES
// ============================================

export const DOCUMENT_CATEGORIES: Record<string, DocumentType[]> = {
  'Identity & Income': ['id', 'bank_statement', 'w2', 'paystub', 'tax_return'],
  'Pre-Approval': ['preapproval_letter', 'proof_of_funds'],
  'Property Reports': ['inspection', 'appraisal', 'survey'],
  'Purchase Contract': ['purchase_agreement', 'addendum', 'counteroffer'],
  'Title & Closing': ['title_commitment', 'title_insurance', 'deed', 'closing_disclosure', 'settlement_statement'],
  'Other': ['other'],
};
