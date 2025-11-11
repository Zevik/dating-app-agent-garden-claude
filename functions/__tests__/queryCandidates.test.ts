/**
 * בדיקות יחידה לפונקציית queryCandidates
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
import { queryCandidates } from '../src/tools';

const db = admin.firestore();

describe('queryCandidates', () => {
  let wrapped: any;

  beforeAll(() => {
    // עטיפת הפונקציה לבדיקה
    wrapped = testEnv.wrap(queryCandidates);
  });

  afterAll(async () => {
    // ניקוי
    testEnv.cleanup();
  });

  beforeEach(async () => {
    // ניקוי מסד הנתונים לפני כל בדיקה
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  it('צריך להחזיר מועמדים מתאימים', async () => {
    // יצירת משתמש מבקש
    await db.collection('users').doc('userA').set({
      name: 'Alice',
      gender: 'female',
      seeking: 'male',
      birthdate: admin.firestore.Timestamp.fromDate(new Date('1995-01-01')),
      location: { lat: 32.0853, lng: 34.7818, city: 'Tel Aviv' },
      interests: ['music', 'travel'],
      prefs: { ageMin: 25, ageMax: 35, maxDistanceKm: 50 }
    });

    // יצירת מועמד מתאים
    await db.collection('users').doc('userB').set({
      name: 'Bob',
      gender: 'male',
      seeking: 'female',
      birthdate: admin.firestore.Timestamp.fromDate(new Date('1990-01-01')),
      location: { lat: 32.0900, lng: 34.7800, city: 'Tel Aviv' },
      interests: ['music', 'sports'],
      photos: [{ url: 'https://example.com/photo.jpg', order: 1 }]
    });

    // יצירת מועמד לא מתאים (מין לא נכון)
    await db.collection('users').doc('userC').set({
      name: 'Carol',
      gender: 'female',
      seeking: 'male',
      birthdate: admin.firestore.Timestamp.fromDate(new Date('1992-01-01')),
      location: { lat: 32.0850, lng: 34.7820, city: 'Tel Aviv' },
      interests: ['art']
    });

    const context = { auth: { uid: 'userA' } } as any;
    const data = {
      userId: 'userA',
      filters: {
        gender: 'male',
        ageMin: 25,
        ageMax: 35,
        limit: 10
      }
    };

    const result = await wrapped(data, context);

    expect(result.candidates).toBeDefined();
    expect(Array.isArray(result.candidates)).toBe(true);
    expect(result.candidates.length).toBeGreaterThan(0);

    // וידוא שהמועמד המתאים נמצא
    const bobCandidate = result.candidates.find((c: any) => c.userId === 'userB');
    expect(bobCandidate).toBeDefined();
    expect(bobCandidate.name).toBe('Bob');
    expect(bobCandidate.age).toBe(35); // 2025 - 1990

    // וידוא שהמועמדת הלא מתאימה לא נמצאה
    const carolCandidate = result.candidates.find((c: any) => c.userId === 'userC');
    expect(carolCandidate).toBeUndefined();
  });

  it('צריך לסנן לפי גיל', async () => {
    await db.collection('users').doc('userA').set({
      name: 'Alice',
      gender: 'female',
      seeking: 'male',
      birthdate: admin.firestore.Timestamp.fromDate(new Date('1995-01-01')),
      prefs: { ageMin: 25, ageMax: 30, maxDistanceKm: 100 }
    });

    // מועמד צעיר מדי
    await db.collection('users').doc('young').set({
      name: 'Young',
      gender: 'male',
      birthdate: admin.firestore.Timestamp.fromDate(new Date('2005-01-01'))
    });

    // מועמד מבוגר מדי
    await db.collection('users').doc('old').set({
      name: 'Old',
      gender: 'male',
      birthdate: admin.firestore.Timestamp.fromDate(new Date('1980-01-01'))
    });

    const context = { auth: { uid: 'userA' } } as any;
    const data = { userId: 'userA', filters: {} };

    const result = await wrapped(data, context);

    // לא אמורים למצוא מועמדים מחוץ לטווח הגילאים
    expect(result.candidates).toBeDefined();
    const youngCandidate = result.candidates.find((c: any) => c.userId === 'young');
    const oldCandidate = result.candidates.find((c: any) => c.userId === 'old');

    expect(youngCandidate).toBeUndefined();
    expect(oldCandidate).toBeUndefined();
  });

  it('צריך לזרוק שגיאה אם המשתמש לא מאומת', async () => {
    const context = { auth: null } as any;
    const data = { userId: 'userA' };

    await expect(wrapped(data, context)).rejects.toThrow('משתמש לא מאומת');
  });

  it('צריך לזרוק שגיאה אם המשתמש מנסה לשאול עבור משתמש אחר', async () => {
    const context = { auth: { uid: 'userA' } } as any;
    const data = { userId: 'userB' };

    await expect(wrapped(data, context)).rejects.toThrow('אין הרשאה');
  });
});
