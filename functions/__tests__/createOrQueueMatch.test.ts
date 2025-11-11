/**
 * בדיקות יחידה לפונקציית createOrQueueMatch
 */

import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test';

// אתחול Firebase Admin למצב בדיקה
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-dating-app-test' });
}

// אתחול סביבת בדיקה
const testEnv = functionsTest();

// ייבוא הפונקציה
import { createOrQueueMatch } from '../src/tools';

const db = admin.firestore();

describe('createOrQueueMatch', () => {
  let wrapped: any;

  beforeAll(() => {
    // עטיפת הפונקציה לבדיקה
    wrapped = testEnv.wrap(createOrQueueMatch);
  });

  afterAll(async () => {
    // ניקוי
    testEnv.cleanup();
  });

  beforeEach(async () => {
    // ניקוי מסד הנתונים לפני כל בדיקה
    const matches = await db.collection('matches').get();
    const batch = db.batch();
    matches.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  it('צריך ליצור התאמה פעילה כאשר לשני הצדדים אין התאמה', async () => {
    const context = { auth: { uid: 'userA' } } as any;
    const data = {
      userA: 'userA',
      userB: 'userB',
      score: 0.8
    };

    const result = await wrapped(data, context);

    expect(result).toHaveProperty('matchId');
    expect(result.state).toBe('active');

    // וידוא שההתאמה נשמרה במסד הנתונים
    const matchDoc = await db.collection('matches').doc(result.matchId).get();
    expect(matchDoc.exists).toBe(true);

    const matchData = matchDoc.data();
    expect(matchData?.users).toEqual(['userA', 'userB']);
    expect(matchData?.state).toBe('active');
    expect(matchData?.score).toBe(0.8);
  });

  it('צריך לזרוק שגיאה אם ל-userA כבר יש התאמה פעילה', async () => {
    // יצירת התאמה פעילה עבור userA
    await db.collection('matches').add({
      users: ['userA', 'userX'],
      state: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const context = { auth: { uid: 'userA' } } as any;
    const data = {
      userA: 'userA',
      userB: 'userB',
      score: 0.7
    };

    await expect(wrapped(data, context)).rejects.toThrow('כבר יש התאמה פעילה');
  });

  it('צריך לזרוק שגיאה אם ל-userB כבר יש התאמה פעילה', async () => {
    // יצירת התאמה פעילה עבור userB
    await db.collection('matches').add({
      users: ['userB', 'userY'],
      state: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const context = { auth: { uid: 'userA' } } as any;
    const data = {
      userA: 'userA',
      userB: 'userB',
      score: 0.7
    };

    await expect(wrapped(data, context)).rejects.toThrow('כבר יש התאמה פעילה');
  });

  it('צריך לזרוק שגיאה אם userA ו-userB זהים', async () => {
    const context = { auth: { uid: 'userA' } } as any;
    const data = {
      userA: 'userA',
      userB: 'userA',
      score: 0.7
    };

    await expect(wrapped(data, context)).rejects.toThrow('לא ניתן ליצור התאמה של משתמש עם עצמו');
  });

  it('צריך לזרוק שגיאה אם הציון לא תקין', async () => {
    const context = { auth: { uid: 'userA' } } as any;
    const data = {
      userA: 'userA',
      userB: 'userB',
      score: 1.5 // ציון לא חוקי
    };

    await expect(wrapped(data, context)).rejects.toThrow('ציון חייב להיות מספר בין 0 ל-1');
  });

  it('צריך לזרוק שגיאה אם אין אימות', async () => {
    const context = { auth: null } as any;
    const data = {
      userA: 'userA',
      userB: 'userB'
    };

    await expect(wrapped(data, context)).rejects.toThrow('משתמש לא מאומת');
  });

  it('צריך לאפשר יצירת התאמה חדשה לאחר סגירת ההתאמה הקודמת', async () => {
    // יצירת התאמה סגורה
    await db.collection('matches').add({
      users: ['userA', 'userX'],
      state: 'closed',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const context = { auth: { uid: 'userA' } } as any;
    const data = {
      userA: 'userA',
      userB: 'userB',
      score: 0.9
    };

    const result = await wrapped(data, context);

    expect(result).toHaveProperty('matchId');
    expect(result.state).toBe('active');
  });
});
