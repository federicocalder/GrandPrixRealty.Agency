// ============================================
// Portal Page - Main Container
// Grand Prix Realty
// ============================================

import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, useProject, useSavedProperties, useMessaging } from '../../hooks/portal';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { LoginPage } from './LoginPage';
import { OverviewPage } from './OverviewPage';
import { SavedHomesPage } from './SavedHomesPage';
import type { StageKey, ReactionType } from '../../types/portal';

// Placeholder pages for future implementation
function SavedSearchesPage() {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3df] p-12 text-center">
      <div className="w-16 h-16 bg-[#f8f7f4] rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 className="font-cinzel text-xl font-semibold text-[#1a1a1a] mb-2">
        Saved Searches Coming Soon
      </h3>
      <p className="text-[#6b6b6b]">
        Save your search filters and get alerts when new homes match your criteria.
      </p>
    </div>
  );
}

function MessagesPage() {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3df] p-12 text-center">
      <div className="w-16 h-16 bg-[#f8f7f4] rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="font-cinzel text-xl font-semibold text-[#1a1a1a] mb-2">
        Messages Coming Soon
      </h3>
      <p className="text-[#6b6b6b]">
        Chat with your agent, loan officer, and team members about properties.
      </p>
    </div>
  );
}

function DocumentsPage() {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3df] p-12 text-center">
      <div className="w-16 h-16 bg-[#f8f7f4] rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <h3 className="font-cinzel text-xl font-semibold text-[#1a1a1a] mb-2">
        Documents Coming Soon
      </h3>
      <p className="text-[#6b6b6b]">
        Upload and organize your pre-approval letters, contracts, and closing documents.
      </p>
    </div>
  );
}

export function PortalPage() {
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth();
  const {
    currentProject,
    fetchProjectDetails,
    getOrCreateDefaultProject,
    toggleStage,
    loading: projectLoading,
  } = useProject(user?.id);
  const {
    properties,
    loading: propertiesLoading,
    toggleFavorite,
    removeProperty,
    setReaction,
  } = useSavedProperties(currentProject?.id, user?.id);
  const { conversations, loading: messagesLoading } = useMessaging(currentProject?.id, user?.id);

  const [initialized, setInitialized] = useState(false);

  // Initialize project on auth
  useEffect(() => {
    const initProject = async () => {
      if (user && !initialized) {
        try {
          const project = await getOrCreateDefaultProject();
          if (project) {
            await fetchProjectDetails(project.id);
          }
          setInitialized(true);
        } catch (error) {
          console.error('Failed to initialize project:', error);
          setInitialized(true);
        }
      }
    };

    if (isAuthenticated && !initialized) {
      initProject();
    }
  }, [user, isAuthenticated, initialized, getOrCreateDefaultProject, fetchProjectDetails]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#e5e3df] border-t-[#1a1a1a] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b6b]">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Handler functions
  const handleToggleStage = async (stageKey: StageKey, completed: boolean) => {
    if (!currentProject) return;
    try {
      await toggleStage(currentProject.id, stageKey, completed);
    } catch (error) {
      console.error('Failed to toggle stage:', error);
    }
  };

  const handleToggleFavorite = async (propertyId: string, isFavorite: boolean) => {
    try {
      await toggleFavorite(propertyId, isFavorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleRemoveProperty = async (propertyId: string) => {
    try {
      await removeProperty(propertyId);
    } catch (error) {
      console.error('Failed to remove property:', error);
    }
  };

  const handleSetReaction = async (propertyId: string, reaction: ReactionType) => {
    try {
      await setReaction(propertyId, reaction);
    } catch (error) {
      console.error('Failed to set reaction:', error);
    }
  };

  const isLoading = projectLoading || propertiesLoading || messagesLoading || !initialized;

  return (
    <PortalLayout project={currentProject} profile={profile}>
      <Routes>
        <Route
          index
          element={
            <OverviewPage
              project={currentProject}
              savedProperties={properties}
              conversations={conversations}
              documentsCount={0}
              loading={isLoading}
              onToggleStage={handleToggleStage}
            />
          }
        />
        <Route
          path="saved-homes"
          element={
            <SavedHomesPage
              properties={properties}
              loading={propertiesLoading}
              onToggleFavorite={handleToggleFavorite}
              onRemoveProperty={handleRemoveProperty}
              onSetReaction={handleSetReaction}
              userId={user?.id}
            />
          }
        />
        <Route path="saved-searches" element={<SavedSearchesPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalLayout>
  );
}
