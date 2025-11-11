/**
 * בדיקות יחידה לפונקציית moderateText
 */

import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test';

// אתחול סביבת בדיקה
const testEnv = functionsTest();

// ייבוא הפונקציה
import { moderateText } from '../src/tools';

describe('moderateText', () => {
  let wrapped: any;

  beforeAll(() => {
    // עטיפת הפונקציה לבדיקה
    wrapped = testEnv.wrap(moderateText);
  });

  afterAll(() => {
    // ניקוי
    testEnv.cleanup();
  });

  it('צריך לאשר טקסט תקין', async () => {
    const context = { auth: { uid: 'testUser123' } } as any;
    const data = { text: 'שלום, איך העניינים?' };

    const result = await wrapped(data, context);

    expect(result.allowed).toBe(true);
    expect(result.labels).toEqual([]);
  });

  it('צריך לחסום טקסט עם מילים אסורות', async () => {
    const context = { auth: { uid: 'testUser123' } } as any;
    const data = { text: 'זה טקסט עם מילה אסורה fuck' };

    const result = await wrapped(data, context);

    expect(result.allowed).toBe(false);
    expect(result.labels).toContain('offensive-language');
  });

  it('צריך לחסום ספאם עם תווים חוזרים', async () => {
    const context = { auth: { uid: 'testUser123' } } as any;
    const data = { text: 'ההההההההההההההההההההה' };

    const result = await wrapped(data, context);

    expect(result.allowed).toBe(false);
    expect(result.labels).toContain('spam');
  });

  it('צריך לחסום כתובות אתרים', async () => {
    const context = { auth: { uid: 'testUser123' } } as any;
    const data = { text: 'בוא נדבר ב-whatsapp: https://wa.me/123456' };

    const result = await wrapped(data, context);

    expect(result.allowed).toBe(false);
    expect(result.labels).toContain('external-contact');
  });

  it('צריך לסמן טקסט באותיות גדולות אבל לא לחסום', async () => {
    const context = { auth: { uid: 'testUser123' } } as any;
    const data = { text: 'THIS IS ALL CAPS MESSAGE THAT IS VERY LONG' };

    const result = await wrapped(data, context);

    expect(result.labels).toContain('all-caps');
    // לא חוסמים, רק מסמנים
  });

  it('צריך לזרוק שגיאה אם אין אימות', async () => {
    const context = { auth: null } as any;
    const data = { text: 'שלום' };

    await expect(wrapped(data, context)).rejects.toThrow('משתמש לא מאומת');
  });

  it('צריך לזרוק שגיאה אם הטקסט ארוך מדי', async () => {
    const context = { auth: { uid: 'testUser123' } } as any;
    const data = { text: 'א'.repeat(4001) };

    await expect(wrapped(data, context)).rejects.toThrow('אורך הטקסט');
  });
});
