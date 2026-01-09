/**
 * Authentication Utility Functions
 * Helper functions for checking user authentication state
 */

import type { User } from '../context/AuthContext';

/**
 * Check if user is a guest (not authenticated)
 */
export const isGuestUser = (user: User | null): boolean => {
  if (!user) return true;
  return user.id === 0 || user.email === 'guest@fitcoach.ai';
};

/**
 * Check if user is authenticated (not guest)
 */
export const isAuthenticatedUser = (user: User | null): boolean => {
  return !isGuestUser(user);
};

