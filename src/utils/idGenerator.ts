let globalCounter = 0;

/**
 * Generates a globally unique identifier with timestamp, random salt, and sequential counter
 * to prevent any duplicate key errors in React or state operations.
 */
export const generateUniqueId = (prefix = 'id'): string => {
  globalCounter = (globalCounter + 1) % 1000000;
  const timestamp = Date.now();
  const randomSalt = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomSalt}_${globalCounter}`;
};
