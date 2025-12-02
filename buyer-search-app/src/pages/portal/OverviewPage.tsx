// ============================================
// Overview Page - Buyer Portal
// Grand Prix Realty
// ============================================

import type { ProjectWithMembers, SavedProperty, Conversation } from '../../types/portal';
import { STAGE_INFO, type StageKey } from '../../types/portal';

interface OverviewPageProps {
  project: ProjectWithMembers | null;
  savedProperties: SavedProperty[];
  conversations: Conversation[];
  documentsCount: number;
  loading: boolean;
  onToggleStage: (stageKey: StageKey, completed: boolean) => void;
}

export function OverviewPage({
  project,
  savedProperties,
  conversations,
  documentsCount,
  loading,
  onToggleStage,
}: OverviewPageProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#e5e3df] border-t-[#1a1a1a] rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate stage progress
  const stages = project?.stages || [];
  const completedStages = stages.filter((s) => s.completed).length;
  const totalStages = stages.length || 9;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  // Stats
  const savedCount = savedProperties.length;
  const favoritesCount = savedProperties.filter((p) => p.is_favorite).length;
  const messagesCount = conversations.length;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="font-cinzel text-2xl lg:text-3xl font-bold text-[#1a1a1a]">
          Welcome to Your Portal
        </h1>
        <p className="text-[#6b6b6b] mt-1">
          Track your home buying journey and stay organized.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Saved Homes"
          value={savedCount}
          icon="heart"
          href="/portal/saved-homes"
        />
        <StatCard
          label="Favorites"
          value={favoritesCount}
          icon="star"
          href="/portal/saved-homes"
        />
        <StatCard
          label="Conversations"
          value={messagesCount}
          icon="message"
          href="/portal/messages"
        />
        <StatCard
          label="Documents"
          value={documentsCount}
          icon="folder"
          href="/portal/documents"
        />
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-2xl border border-[#e5e3df] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-cinzel text-xl font-semibold text-[#1a1a1a]">
              Your Journey Progress
            </h2>
            <p className="text-[#6b6b6b] text-sm mt-1">
              {completedStages} of {totalStages} stages complete
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-[#1a1a1a]">{progressPercent}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-[#f8f7f4] rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-gradient-to-r from-[#1a1a1a] to-[#4a4a4a] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stage List */}
        <div className="space-y-3">
          {stages
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((stage) => {
              const info = STAGE_INFO[stage.stage_key as StageKey];
              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    stage.completed
                      ? 'bg-[#f0fdf4] border border-green-200'
                      : 'bg-[#f8f7f4] border border-transparent hover:border-[#e5e3df]'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => onToggleStage(stage.stage_key as StageKey, !stage.completed)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      stage.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-[#d1d1d1] hover:border-[#1a1a1a]'
                    }`}
                  >
                    {stage.completed && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Icon */}
                  <span className="text-2xl">{info?.icon || '📋'}</span>

                  {/* Label */}
                  <div className="flex-1">
                    <p className={`font-medium ${stage.completed ? 'text-green-700' : 'text-[#1a1a1a]'}`}>
                      {info?.label || stage.stage_key}
                    </p>
                    <p className="text-sm text-[#6b6b6b]">{info?.description}</p>
                  </div>

                  {/* Completion Date */}
                  {stage.completed && stage.completed_at && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      {new Date(stage.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Project Info */}
      {project && (
        <div className="bg-white rounded-2xl border border-[#e5e3df] p-6">
          <h2 className="font-cinzel text-xl font-semibold text-[#1a1a1a] mb-4">
            Project Details
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoItem label="Project Type" value={formatProjectType(project.project_type)} />
            <InfoItem
              label="Target Location"
              value={project.target_city ? `${project.target_city}, ${project.target_state}` : 'Not set'}
            />
            <InfoItem
              label="Budget Range"
              value={
                project.budget_min || project.budget_max
                  ? `$${(project.budget_min || 0).toLocaleString()} - $${(project.budget_max || 0).toLocaleString()}`
                  : 'Not set'
              }
            />
            <InfoItem
              label="Created"
              value={new Date(project.created_at).toLocaleDateString()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="bg-white rounded-xl border border-[#e5e3df] p-4 hover:border-[#1a1a1a] transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#f8f7f4] flex items-center justify-center group-hover:bg-[#1a1a1a] transition-colors">
          <StatIcon icon={icon} className="w-5 h-5 text-[#6b6b6b] group-hover:text-white transition-colors" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#1a1a1a]">{value}</p>
          <p className="text-sm text-[#6b6b6b]">{label}</p>
        </div>
      </div>
    </a>
  );
}

function StatIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case 'heart':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'star':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case 'message':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case 'folder':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    default:
      return null;
  }
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[#6b6b6b]">{label}</p>
      <p className="font-medium text-[#1a1a1a]">{value}</p>
    </div>
  );
}

function formatProjectType(type: string): string {
  const types: Record<string, string> = {
    primary: 'Primary Residence',
    investment: 'Investment Property',
    second_home: 'Second Home',
    relocation: 'Relocation',
  };
  return types[type] || type;
}
