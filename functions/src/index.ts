/**
 * index.ts - נקודת כניסה ראשית ל-Cloud Functions
 * מאתחל את Firebase Admin ומייצא את כל ה-Tools והטריגרים
 */

import * as admin from 'firebase-admin';

// אתחול Firebase Admin SDK
admin.initializeApp();

// ייצוא כל ה-Tools (פונקציות שה-Agents קורא)
export {
  readUserProfile,
  queryCandidates,
  scoreCandidate,
  createOrQueueMatch,
  getActiveMatch,
  closeMatch,
  moderateText,
  storeMessage,
  extractSharedInterests,
  embedText,
  storeEmbedding,
  sendPush
} from './tools';

// ייצוא כל הטריגרים (פונקציות שמופעלות אוטומטית)
export {
  onMatchCreated,
  onMessageCreated,
  onUserWrite
} from './triggers';
