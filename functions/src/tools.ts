/**
 * tools.ts - כלי Agent Garden לאפליקציית ההיכרויות
 * מכיל את כל ה-Tools שה-Agents מפעילים, כולל:
 * - קריאת פרופילים ושאילתות מועמדים
 * - חישוב ציונים ויצירת התאמות
 * - ניהול הודעות ומודרציה
 * - embeddings ו-FCM
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ========================================
// עוזרים (Helpers)
// ========================================

/**
 * בדיקה שהמשתמש מאומת
 */
function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'משתמש לא מאומת - נדרש התחברות');
  }
  return context.auth.uid;
}

/**
 * ולידציה בסיסית של userId
 */
function validateUserId(userId: string): void {
  if (!userId || userId.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'userId לא תקין');
  }
}

/**
 * ולידציה בסיסית של matchId
 */
function validateMatchId(matchId: string): void {
  if (!matchId || matchId.length < 8) {
    throw new functions.https.HttpsError('invalid-argument', 'matchId לא תקין');
  }
}

/**
 * חישוב גיל מתאריך לידה
 */
function calculateAge(birthdate: admin.firestore.Timestamp): number {
  const today = new Date();
  const birth = birthdate.toDate();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * חישוב מרחק בין שתי נקודות גיאוגרפיות (Haversine formula)
 * @returns מרחק בקילומטרים
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // רדיוס כדור הארץ בקילומטרים
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * בדיקה שלמשתמש אין התאמה פעילה (אכיפת "קשר אחד בכל פעם")
 */
async function assertOneActive(userId: string): Promise<void> {
  const activeMatches = await db.collection('matches')
    .where('users', 'array-contains', userId)
    .where('state', '==', 'active')
    .limit(1)
    .get();

  if (!activeMatches.empty) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'למשתמש כבר יש התאמה פעילה - נא לסגור אותה לפני יצירת התאמה חדשה'
    );
  }
}

// ========================================
// Tool #1: readUserProfile
// ========================================

export const readUserProfile = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  requireAuth(context);

  const { userId } = data;

  // ולידציה
  if (!userId || typeof userId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'userId חסר או לא תקין');
  }
  validateUserId(userId);

  try {
    // קריאת הפרופיל מ-Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'משתמש לא נמצא');
    }

    const userData = userDoc.data()!;

    // חישוב גיל מתאריך לידה
    const age = userData.birthdate ? calculateAge(userData.birthdate) : null;

    // בניית אובייקט המשתמש לפי הסכמה
    const user = {
      userId: userDoc.id,
      name: userData.name || '',
      age: age,
      gender: userData.gender || 'other',
      seeking: userData.seeking || 'other',
      location: userData.location || null,
      city: userData.location?.city || '',
      bio: userData.bio || '',
      interests: userData.interests || [],
      prefs: userData.prefs || { ageMin: 18, ageMax: 99, maxDistanceKm: 50 },
      plan: userData.plan || 'free',
      photos: userData.photos || []
    };

    return { user };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('שגיאה בקריאת פרופיל משתמש:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה בקריאת הפרופיל');
  }
});

// ========================================
// Tool #2: queryCandidates
// ========================================

export const queryCandidates = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  const authUserId = requireAuth(context);

  const { userId, filters = {} } = data;

  // ולידציה
  validateUserId(userId);

  // וידוא שהמשתמש המאומת שואל על עצמו (או הרשאה מיוחדת)
  if (authUserId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'אין הרשאה לשאול מועמדים עבור משתמש אחר');
  }

  try {
    // קריאת פרופיל המשתמש המבקש
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'משתמש לא נמצא');
    }

    const userData = userDoc.data()!;
    const userPrefs = userData.prefs || {};
    const userLocation = userData.location;

    // בניית שאילתה דינמית
    let query: admin.firestore.Query = db.collection('users');

    // פילטר לפי מין מבוקש
    const seekingGender = filters.gender || userData.seeking;
    if (seekingGender) {
      query = query.where('gender', '==', seekingGender);
    }

    // הגבלת תוצאות
    const limit = Math.min(filters.limit || 20, 50);
    query = query.limit(limit);

    // ביצוע השאילתה
    const snapshot = await query.get();

    // סינון ועיבוד המועמדים
    const candidates = [];
    const ageMin = filters.ageMin ?? userPrefs.ageMin ?? 18;
    const ageMax = filters.ageMax ?? userPrefs.ageMax ?? 99;
    const maxDistanceKm = filters.maxDistanceKm ?? userPrefs.maxDistanceKm ?? 500;

    for (const doc of snapshot.docs) {
      // דילוג על המשתמש עצמו
      if (doc.id === userId) continue;

      const candidateData = doc.data();

      // חישוב גיל
      const age = candidateData.birthdate ? calculateAge(candidateData.birthdate) : null;
      if (!age || age < ageMin || age > ageMax) continue;

      // חישוב מרחק
      let distanceKm = 0;
      if (userLocation && candidateData.location) {
        distanceKm = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          candidateData.location.lat,
          candidateData.location.lng
        );
        if (distanceKm > maxDistanceKm) continue;
      }

      // בניית אובייקט מועמד
      const candidate = {
        userId: doc.id,
        name: candidateData.name || '',
        age: age,
        city: candidateData.location?.city || '',
        distanceKm: Math.round(distanceKm),
        interests: candidateData.interests || [],
        photos: (candidateData.photos || []).map((p: any) => p.url).filter(Boolean)
      };

      candidates.push(candidate);
    }

    return { candidates };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('שגיאה בשאילתת מועמדים:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה בשאילתת המועמדים');
  }
});

// ========================================
// Tool #3: scoreCandidate
// ========================================

export const scoreCandidate = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  requireAuth(context);

  const { sourceUser, candidate } = data;

  // ולידציה
  if (!sourceUser || !candidate) {
    throw new functions.https.HttpsError('invalid-argument', 'sourceUser או candidate חסרים');
  }

  try {
    // קריאת פרופיל המשתמש המקור
    const sourceDoc = await db.collection('users').doc(sourceUser).get();
    if (!sourceDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'משתמש מקור לא נמצא');
    }

    const sourceData = sourceDoc.data()!;
    const sourceInterests = sourceData.interests || [];

    // חישוב ציון מבוסס חוקים (Rule-based scoring)
    let score = 0.5; // ציון בסיס
    const reasons: string[] = [];

    // 1. תחומי עניין משותפים (עד 0.3 נקודות)
    const candidateInterests = candidate.interests || [];
    const sharedInterests = sourceInterests.filter((interest: string) =>
      candidateInterests.includes(interest)
    );
    const interestScore = Math.min(sharedInterests.length * 0.1, 0.3);
    score += interestScore;
    if (sharedInterests.length > 0) {
      reasons.push(`${sharedInterests.length} תחומי עניין משותפים`);
    }

    // 2. מרחק (עד 0.2 נקודות - ככל שקרוב יותר, ציון גבוה יותר)
    if (candidate.distanceKm !== undefined) {
      const distanceScore = Math.max(0, 0.2 - (candidate.distanceKm / 100) * 0.2);
      score += distanceScore;
      if (candidate.distanceKm < 10) {
        reasons.push('קרוב גיאוגרפית');
      }
    }

    // 3. בונוס לפרופיל מלא (יש תמונות ותיאור)
    if (candidate.photos && candidate.photos.length >= 3) {
      score += 0.05;
      reasons.push('פרופיל עם תמונות');
    }

    // נרמול הציון לטווח 0-1
    score = Math.min(Math.max(score, 0), 1);

    // עיגול לשתי ספרות אחרי הנקודה
    score = Math.round(score * 100) / 100;

    return {
      score: {
        value: score,
        reasons: reasons.length > 0 ? reasons : ['התאמה בסיסית']
      }
    };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('שגיאה בחישוב ציון מועמד:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה בחישוב הציון');
  }
});

// ========================================
// Tool #4: createOrQueueMatch
// ========================================

export const createOrQueueMatch = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  requireAuth(context);

  const { userA, userB, score = 0.5 } = data;

  // ולידציה
  validateUserId(userA);
  validateUserId(userB);

  if (userA === userB) {
    throw new functions.https.HttpsError('invalid-argument', 'לא ניתן ליצור התאמה של משתמש עם עצמו');
  }

  if (typeof score !== 'number' || score < 0 || score > 1) {
    throw new functions.https.HttpsError('invalid-argument', 'ציון חייב להיות מספר בין 0 ל-1');
  }

  try {
    // ביצוע טרנזקציה לוודא עקביות
    const result = await db.runTransaction(async (transaction) => {
      // בדיקת התאמה פעילה עבור userA
      const activeMatchesA = await transaction.get(
        db.collection('matches')
          .where('users', 'array-contains', userA)
          .where('state', '==', 'active')
          .limit(1)
      );

      if (!activeMatchesA.empty) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `למשתמש ${userA} כבר יש התאמה פעילה`
        );
      }

      // בדיקת התאמה פעילה עבור userB
      const activeMatchesB = await transaction.get(
        db.collection('matches')
          .where('users', 'array-contains', userB)
          .where('state', '==', 'active')
          .limit(1)
      );

      if (!activeMatchesB.empty) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `למשתמש ${userB} כבר יש התאמה פעילה`
        );
      }

      // יצירת התאמה חדשה
      const matchRef = db.collection('matches').doc();
      const now = admin.firestore.FieldValue.serverTimestamp();

      transaction.set(matchRef, {
        users: [userA, userB],
        state: 'active',
        score: score,
        openedBy: userA,
        closedBy: null,
        lastMessageAt: null,
        oneActiveEachSide: true,
        createdAt: now,
        updatedAt: now
      });

      return { matchId: matchRef.id, state: 'active' };
    });

    return result;
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('שגיאה ביצירת התאמה:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה ביצירת ההתאמה');
  }
});

// ========================================
// Tool #5: getActiveMatch
// ========================================

export const getActiveMatch = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  const authUserId = requireAuth(context);

  const { userId } = data;

  // ולידציה
  validateUserId(userId);

  // וידוא הרשאה
  if (authUserId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'אין הרשאה לבדוק התאמות של משתמש אחר');
  }

  try {
    // חיפוש התאמה פעילה
    const activeMatches = await db.collection('matches')
      .where('users', 'array-contains', userId)
      .where('state', '==', 'active')
      .limit(1)
      .get();

    if (activeMatches.empty) {
      return { matchId: null, state: null };
    }

    const match = activeMatches.docs[0];
    return {
      matchId: match.id,
      state: match.data().state
    };
  } catch (error: any) {
    functions.logger.error('שגיאה באחזור התאמה פעילה:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה באחזור ההתאמה');
  }
});

// ========================================
// Tool #6: closeMatch
// ========================================

export const closeMatch = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  const authUserId = requireAuth(context);

  const { matchId, reason = 'סגירה ידנית' } = data;

  // ולידציה
  validateMatchId(matchId);

  if (typeof reason !== 'string' || reason.length > 200) {
    throw new functions.https.HttpsError('invalid-argument', 'סיבת הסגירה חייבת להיות עד 200 תווים');
  }

  try {
    // קריאת ההתאמה
    const matchDoc = await db.collection('matches').doc(matchId).get();

    if (!matchDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'התאמה לא נמצאה');
    }

    const matchData = matchDoc.data()!;

    // וידוא שהמשתמש חלק מההתאמה
    if (!matchData.users.includes(authUserId)) {
      throw new functions.https.HttpsError('permission-denied', 'אין הרשאה לסגור התאמה זו');
    }

    // עדכון ההתאמה לסגורה
    await matchDoc.ref.update({
      state: 'closed',
      closedBy: authUserId,
      closeReason: reason,
      closedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { ok: true };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('שגיאה בסגירת התאמה:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה בסגירת ההתאמה');
  }
});

// ========================================
// Tool #7: moderateText
// ========================================

// רשימת מילים אסורות בסיסית (בעברית ואנגלית)
const BANNED_WORDS = [
  'fuck', 'shit', 'damn', 'bitch', 'ass', 'bastard',
  'זין', 'כוס', 'מניאק', 'זונה', 'חרא', 'לעזאזל'
];

export const moderateText = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  requireAuth(context);

  const { text, context: moderationContext = '' } = data;

  // ולידציה
  if (!text || typeof text !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'טקסט חסר או לא תקין');
  }

  if (text.length < 1 || text.length > 4000) {
    throw new functions.https.HttpsError('invalid-argument', 'אורך הטקסט חייב להיות בין 1 ל-4000 תווים');
  }

  try {
    const labels: string[] = [];
    let allowed = true;

    // המרה לאותיות קטנות לבדיקה
    const lowerText = text.toLowerCase();

    // בדיקת מילים אסורות
    for (const word of BANNED_WORDS) {
      if (lowerText.includes(word)) {
        allowed = false;
        labels.push('offensive-language');
        break;
      }
    }

    // בדיקות נוספות
    // 1. ספאם - תווים חוזרים
    if (/(.)\1{10,}/.test(text)) {
      allowed = false;
      labels.push('spam');
    }

    // 2. כתובות אתרים או מספרי טלפון
    if (/https?:\/\/|www\.|\.com|\.net|\.org|05\d-?\d{7}/.test(text)) {
      allowed = false;
      labels.push('external-contact');
    }

    // 3. כל אותיות גדולות (צעקות)
    if (text.length > 20 && text === text.toUpperCase()) {
      labels.push('all-caps');
      // לא חוסמים, רק מסמנים
    }

    return { allowed, labels };
  } catch (error: any) {
    functions.logger.error('שגיאה במודרציית טקסט:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה במודרציה');
  }
});

// ========================================
// Tool #8: storeMessage
// ========================================

export const storeMessage = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  const authUserId = requireAuth(context);

  const { matchId, from, text } = data;

  // ולידציה
  validateMatchId(matchId);
  validateUserId(from);

  // וידוא שהשולח הוא המשתמש המאומת
  if (authUserId !== from) {
    throw new functions.https.HttpsError('permission-denied', 'לא ניתן לשלוח הודעה בשם משתמש אחר');
  }

  if (!text || typeof text !== 'string' || text.length < 1 || text.length > 2000) {
    throw new functions.https.HttpsError('invalid-argument', 'טקסט ההודעה חייב להיות בין 1 ל-2000 תווים');
  }

  try {
    // קריאת ההתאמה
    const matchDoc = await db.collection('matches').doc(matchId).get();

    if (!matchDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'התאמה לא נמצאה');
    }

    const matchData = matchDoc.data()!;

    // וידוא שההתאמה פעילה
    if (matchData.state !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', 'ההתאמה אינה פעילה');
    }

    // וידוא שהשולח חלק מההתאמה
    if (!matchData.users.includes(from)) {
      throw new functions.https.HttpsError('permission-denied', 'השולח אינו חלק מההתאמה');
    }

    // ביצוע מודרציה על הטקסט
    const moderation = await moderateText.run({ text, context: 'message' }, { auth: context.auth! } as any);

    if (!moderation.allowed) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `ההודעה נחסמה: ${moderation.labels.join(', ')}`
      );
    }

    // יצירת ההודעה
    const messageRef = db.collection('messages').doc(matchId).collection('items').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await messageRef.set({
      from: from,
      text: text,
      status: 'sent',
      moderation: {
        allowed: moderation.allowed,
        labels: moderation.labels
      },
      createdAt: now
    });

    // עדכון lastMessageAt בהתאמה
    await matchDoc.ref.update({
      lastMessageAt: now,
      updatedAt: now
    });

    return {
      messageId: messageRef.id,
      status: 'sent'
    };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('שגיאה בשמירת הודעה:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה בשמירת ההודעה');
  }
});

// ========================================
// Tool #9: extractSharedInterests
// ========================================

export const extractSharedInterests = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  requireAuth(context);

  const { userA, userB } = data;

  // ולידציה
  validateUserId(userA);
  validateUserId(userB);

  try {
    // קריאת שני הפרופילים במקביל
    const [userADoc, userBDoc] = await Promise.all([
      db.collection('users').doc(userA).get(),
      db.collection('users').doc(userB).get()
    ]);

    if (!userADoc.exists || !userBDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'אחד המשתמשים לא נמצא');
    }

    const interestsA = userADoc.data()!.interests || [];
    const interestsB = userBDoc.data()!.interests || [];

    // מציאת תחומי עניין משותפים
    const shared = interestsA.filter((interest: string) => interestsB.includes(interest));

    return { shared };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('שגיאה בחילוץ תחומי עניין משותפים:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה בחילוץ תחומי עניין');
  }
});

// ========================================
// Tool #10: embedText (stub - שלב II)
// ========================================

export const embedText = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  requireAuth(context);

  const { text } = data;

  // ולידציה
  if (!text || typeof text !== 'string' || text.length < 3 || text.length > 2000) {
    throw new functions.https.HttpsError('invalid-argument', 'טקסט חייב להיות בין 3 ל-2000 תווים');
  }

  try {
    // Stub - מחזיר וקטור dummy באורך 256
    // בשלב II: אינטגרציה עם Vertex AI Embeddings או OpenAI
    const vector = Array(256).fill(0).map(() => Math.random() * 2 - 1);

    return { vector };
  } catch (error: any) {
    functions.logger.error('שגיאה ב-embedding טקסט:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה ב-embedding');
  }
});

// ========================================
// Tool #11: storeEmbedding
// ========================================

export const storeEmbedding = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  const authUserId = requireAuth(context);

  const { userId, vector } = data;

  // ולידציה
  validateUserId(userId);

  // וידוא הרשאה
  if (authUserId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'אין הרשאה לשמור embedding עבור משתמש אחר');
  }

  if (!Array.isArray(vector) || vector.length < 256) {
    throw new functions.https.HttpsError('invalid-argument', 'וקטור חייב להיות מערך עם לפחות 256 מספרים');
  }

  try {
    // שמירת ה-embedding במסמך המשתמש
    await db.collection('users').doc(userId).update({
      embedding: vector,
      embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { ok: true };
  } catch (error: any) {
    functions.logger.error('שגיאה בשמירת embedding:', error);
    throw new functions.https.HttpsError('internal', 'שגיאה בשמירת ה-embedding');
  }
});

// ========================================
// Tool #12: sendPush
// ========================================

export const sendPush = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  requireAuth(context);

  const { token, title, body, data: messageData = {} } = data;

  // ולידציה
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'token חסר או לא תקין');
  }

  if (!title || typeof title !== 'string' || title.length > 80) {
    throw new functions.https.HttpsError('invalid-argument', 'כותרת חייבת להיות עד 80 תווים');
  }

  if (!body || typeof body !== 'string' || body.length > 140) {
    throw new functions.https.HttpsError('invalid-argument', 'תוכן חייב להיות עד 140 תווים');
  }

  try {
    // שליחת התראת FCM
    const message: admin.messaging.Message = {
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: messageData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    await admin.messaging().send(message);

    return { ok: true };
  } catch (error: any) {
    functions.logger.error('שגיאה בשליחת התראת Push:', error);
    // לא זורקים שגיאה כי ייתכן שה-token לא תקף
    // במקום זה מחזירים ok: false
    return { ok: false };
  }
});
