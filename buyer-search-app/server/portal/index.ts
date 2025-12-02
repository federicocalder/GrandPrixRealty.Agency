// ============================================
// Portal Helpers - Main Export
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

// Supabase clients
export { supabaseAdmin, createUserClient } from './supabaseAdmin.js';

// Project operations
export {
  getOrCreateDefaultProject,
  getUserProjects,
  getProjectWithDetails,
  createProject,
  updateProject,
  addProjectMember,
  removeProjectMember,
  updateMemberPermissions,
  toggleStageCompletion,
  updateStageNotes,
} from './projects.js';

// Property operations
export {
  saveProperty,
  removeProperty,
  toggleFavorite,
  getProjectProperties,
  getProjectFavorites,
  updateListingSnapshot,
  isPropertySaved,
  addPropertyNote,
  updatePropertyNote,
  deletePropertyNote,
  setPropertyReaction,
  removePropertyReaction,
  getPropertyReactionSummary,
} from './properties.js';

// Search operations
export {
  saveSearch,
  getProjectSearches,
  getSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  toggleSearchAlert,
  updateSearchRunMetadata,
  getSearchesWithAlerts,
} from './searches.js';

// Messaging operations
export {
  getOrCreateConversation,
  getConversationWithMessages,
  getProjectConversations,
  getUserConversations,
  sendMessage,
  editMessage,
  deleteMessage,
  getMessages,
  addConversationMember,
  markConversationRead,
  toggleConversationNotifications,
  getUnreadCount,
  sendSystemMessage,
} from './messaging.js';

// Document operations
export {
  createDocumentRecord,
  getProjectDocuments,
  getListingDocuments,
  getAllProjectDocuments,
  getDocumentsByCategory,
  updateDocument,
  deleteDocument,
  getDocument,
  uploadDocument,
  deleteDocumentWithFile,
} from './documents.js';

// Activity logging
export {
  logActivity,
  getProjectActivity,
  getUserActivity,
  getEntityActivity,
  getRecentActivity,
  activityLoggers,
} from './activity.js';
export type { ActivityType, EntityType } from './activity.js';
