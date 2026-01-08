/**
 * Date Utilities
 * PRODUCTION HARDENED - Timezone-safe date operations
 * 
 * CRITICAL: Always use these utilities instead of new Date() for user-facing dates
 * Prevents midnight timezone bugs (e.g., 11:59 PM becoming previous day)
 */

/**
 * Get today's date in user's local timezone (YYYY-MM-DD)
 * ALWAYS use this instead of: new Date().toISOString().split('T')[0]
 */
export const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get date range for queries (start and end of day in local timezone)
 * ALWAYS use this for API date range queries
 */
export const getDateRange = (date: string): { start: string; end: string } => {
  // Input: '2024-01-15'
  // Output: { start: '2024-01-15T00:00:00', end: '2024-01-15T23:59:59' }
  return {
    start: `${date}T00:00:00`,
    end: `${date}T23:59:59`,
  };
};

/**
 * Check if a date string is today (in local timezone)
 */
export const isToday = (dateString: string): boolean => {
  const today = getTodayLocal();
  const checkDate = dateString.split('T')[0]; // Extract YYYY-MM-DD
  return checkDate === today;
};

/**
 * Get yesterday's date (local timezone)
 */
export const getYesterdayLocal = (): string => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get date N days ago (local timezone)
 */
export const getDaysAgoLocal = (daysAgo: number): string => {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date for display (e.g., "Jan 15, 2024")
 */
export const formatDateDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format date for display with day name (e.g., "Monday, Jan 15")
 */
export const formatDateWithDay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Get week start date (local timezone)
 */
export const getWeekStartLocal = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so week starts on Monday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get month start date (local timezone)
 */
export const getMonthStartLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

/**
 * Convert API timestamp to local date (for display)
 */
export const apiTimestampToLocal = (timestamp: string): string => {
  // Input: "2024-01-15T14:30:00Z" (UTC)
  // Output: "2024-01-15" (local date)
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert local date to API timestamp (for POST/PUT)
 */
export const localDateToAPITimestamp = (date: string): string => {
  // Input: "2024-01-15" (local)
  // Output: "2024-01-15T12:00:00Z" (UTC, noon to avoid timezone issues)
  return `${date}T12:00:00Z`;
};

export default {
  getTodayLocal,
  getDateRange,
  isToday,
  getYesterdayLocal,
  getDaysAgoLocal,
  formatDateDisplay,
  formatDateWithDay,
  getWeekStartLocal,
  getMonthStartLocal,
  apiTimestampToLocal,
  localDateToAPITimestamp,
};
