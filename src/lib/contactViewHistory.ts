import { Profile } from "@/types";

export interface ContactView {
  profileId: string;
  viewedAt: string;
  profileName: string;
  profilePhoto: string;
  memberId: string;
}

const STORAGE_KEY = 'contact_view_history';
const MAX_HISTORY_ITEMS = 100;
const DUPLICATE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load contact view history from localStorage
 */
export function loadContactViewHistory(): ContactView[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading contact view history:', error);
    return [];
  }
}

/** Optional: called to persist contact view to DB (requires viewerProfileId) */
export async function trackContactViewToDb(
  viewerProfileId: string,
  profile: Profile
): Promise<{ error: string | null; code?: string }> {
  try {
    const { recordContactView } = await import("@/lib/api/contactViews");
    return await recordContactView(viewerProfileId, profile.id);
  } catch {
    return { error: "Failed to record contact view" };
  }
}

/**
 * Track a contact view (localStorage + optional DB)
 */
export async function trackContactView(profile: Profile, viewerProfileId?: string): Promise<{ error: string | null; code?: string }> {
  if (typeof window === 'undefined') return { error: null };

  if (viewerProfileId) {
    const dbRes = await trackContactViewToDb(viewerProfileId, profile);
    if (dbRes.error) return dbRes;
  }
  
  const contactView: ContactView = {
    profileId: profile.id,
    viewedAt: new Date().toISOString(),
    profileName: profile.fullName,
    profilePhoto: profile.profilePhoto || '',
    memberId: profile.publicId || profile.memberId || profile.id,
  };
  
  const existingViews = loadContactViewHistory();
  
  // Check if already viewed recently (within threshold)
  const recentlyViewed = existingViews.some(
    (v) =>
      v.profileId === profile.id &&
      Date.now() - new Date(v.viewedAt).getTime() < DUPLICATE_THRESHOLD_MS
  );
  
  if (recentlyViewed) {
    // Update the timestamp of existing entry
    const updatedViews = existingViews.map((v) =>
      v.profileId === profile.id
        ? { ...v, viewedAt: new Date().toISOString() }
        : v
    );
    // Move updated entry to the top
    const index = updatedViews.findIndex((v) => v.profileId === profile.id);
    if (index > 0) {
      const [item] = updatedViews.splice(index, 1);
      updatedViews.unshift(item);
    }
    saveContactViewHistory(updatedViews);
  } else {
    // Add new entry at the beginning
    existingViews.unshift(contactView);
    // Keep only the latest items
    const trimmedViews = existingViews.slice(0, MAX_HISTORY_ITEMS);
    saveContactViewHistory(trimmedViews);
  }
  return { error: null };
}

/**
 * Save contact view history to localStorage
 */
function saveContactViewHistory(views: ContactView[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch (error) {
    console.error('Error saving contact view history:', error);
  }
}

/**
 * Remove a specific contact from history
 */
export function removeContactFromHistory(profileId: string): void {
  const views = loadContactViewHistory();
  const filtered = views.filter((v) => v.profileId !== profileId);
  saveContactViewHistory(filtered);
}

/**
 * Clear all contact view history
 */
export function clearContactViewHistory(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing contact view history:', error);
  }
}

/**
 * Get count of contacts viewed
 */
export function getContactViewCount(): number {
  return loadContactViewHistory().length;
}

/**
 * Format time ago from timestamp
 */
export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const viewedTime = new Date(timestamp).getTime();
  const diffMs = now - viewedTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffMs / 604800000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  return new Date(timestamp).toLocaleDateString();
}
