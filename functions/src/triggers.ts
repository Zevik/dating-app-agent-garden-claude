/**
 * triggers.ts - טריגרים אוטומטיים ב-Firestore
 * מכיל:
 * - onMatchCreated: יצירת 3 פתיחי שיחה אוטומטיים
 * - onMessageCreated: עדכון lastMessageAt והתראות FCM
 * - onUserWrite: סנכרון public_profiles
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ========================================
// Trigger #1: onMatchCreated
// ========================================

/**
 * טריגר שמופעל כאשר נוצרת התאמה חדשה
 * יוצר 3 פתיחי שיחה מותאמים אישית ושומר אותם תחת matches/{matchId}/starters
 */
export const onMatchCreated = functions.firestore
  .document('matches/{matchId}')
  .onCreate(async (snapshot, context) => {
    const matchId = context.params.matchId;
    const matchData = snapshot.data();
    const [userAId, userBId] = matchData.users;

    try {
      functions.logger.info(`התאמה חדשה נוצרה: ${matchId} בין ${userAId} ל-${userBId}`);

      // קריאת שני הפרופילים
      const [userADoc, userBDoc] = await Promise.all([
        db.collection('users').doc(userAId).get(),
        db.collection('users').doc(userBId).get()
      ]);

      if (!userADoc.exists || !userBDoc.exists) {
        functions.logger.error('אחד הפרופילים לא נמצא');
        return;
      }

      const userA = userADoc.data()!;
      const userB = userBDoc.data()!;

      // חילוץ תחומי עניין משותפים
      const interestsA = userA.interests || [];
      const interestsB = userB.interests || [];
      const sharedInterests = interestsA.filter((interest: string) =>
        interestsB.includes(interest)
      );

      // יצירת 3 פתיחי שיחה מותאמים אישית
      const starters = generateConversationStarters(userA, userB, sharedInterests);

      // שמירת הפתיחים בקולקציה נפרדת
      const startersRef = db.collection('matches').doc(matchId).collection('starters');

      const batch = db.batch();
      starters.forEach((starter, index) => {
        const starterDoc = startersRef.doc(`starter_${index + 1}`);
        batch.set(starterDoc, {
          text: starter.text,
          tag: starter.tag,
          order: index + 1,
          used: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      functions.logger.info(`נוצרו ${starters.length} פתיחי שיחה עבור התאמה ${matchId}`);
    } catch (error) {
      functions.logger.error('שגיאה ביצירת פתיחי שיחה:', error);
    }
  });

/**
 * פונקציה ליצירת 3 פתיחי שיחה מותאמים אישית
 */
function generateConversationStarters(
  userA: any,
  userB: any,
  sharedInterests: string[]
): Array<{ text: string; tag: string }> {
  const starters: Array<{ text: string; tag: string }> = [];
  const nameB = userB.name || 'שם';

  // פותח #1: על בסיס תחום עניין משותף
  if (sharedInterests.length > 0) {
    const interest = sharedInterests[0];
    starters.push({
      text: `היי ${nameB}! ראיתי שגם את/ה אוהב/ת ${interest}. איזה חוויה מיוחדת הכי זכורה לך?`,
      tag: 'תחומי עניין משותפים'
    });
  } else {
    // ברירת מחדל אם אין תחומי עניין משותפים
    starters.push({
      text: `היי ${nameB}! נעים מאוד להכיר. מה עושה אותך שמח/ה לאחרונה?`,
      tag: 'שאלה כללית'
    });
  }

  // פותח #2: על בסיס מיקום
  const cityB = userB.location?.city || userB.city;
  if (cityB) {
    starters.push({
      text: `שלום ${nameB}! איזה כיף שאת/ה מ${cityB}. יש לך מקום אהוב בעיר שאת/ה ממליץ/ה עליו?`,
      tag: 'מיקום'
    });
  } else {
    starters.push({
      text: `${nameB}, ספר/י לי - מה הדבר הכי מעניין שקרה לך השבוע?`,
      tag: 'שיחת חולין'
    });
  }

  // פותח #3: שאלה קלה ומעניינת
  const funQuestions = [
    `${nameB}, אם היית יכול/ה לטוס לכל מקום בעולם עכשיו, לאן היית טס/ה?`,
    `היי ${nameB}! קפה או תה? והאם יש לך מתכון סודי לאחד מהם?`,
    `${nameB}, מה הדבר הכי ספונטני שעשית לאחרונה?`,
    `שלום ${nameB}! אם היית צריך/ה לבחור ארוחת בוקר אחת לכל החיים, מה זה היה?`,
    `${nameB}, ספר/י - מה הספר או הסרט האחרון שממש השפיע עליך?`
  ];

  const randomQuestion = funQuestions[Math.floor(Math.random() * funQuestions.length)];
  starters.push({
    text: randomQuestion,
    tag: 'שאלה מעניינת'
  });

  return starters;
}

// ========================================
// Trigger #2: onMessageCreated
// ========================================

/**
 * טריגר שמופעל כאשר נוצרת הודעה חדשה
 * מעדכן את lastMessageAt בהתאמה ושולח התראת FCM לצד השני
 */
export const onMessageCreated = functions.firestore
  .document('messages/{matchId}/items/{messageId}')
  .onCreate(async (snapshot, context) => {
    const matchId = context.params.matchId;
    const messageId = context.params.messageId;
    const messageData = snapshot.data();
    const senderId = messageData.from;
    const messageText = messageData.text;

    try {
      functions.logger.info(`הודעה חדשה התקבלה במשחק ${matchId} מאת ${senderId}`);

      // קריאת ההתאמה
      const matchDoc = await db.collection('matches').doc(matchId).get();
      if (!matchDoc.exists) {
        functions.logger.error(`התאמה ${matchId} לא נמצאה`);
        return;
      }

      const matchData = matchDoc.data()!;
      const users = matchData.users;

      // מציאת הצד השני
      const recipientId = users.find((uid: string) => uid !== senderId);
      if (!recipientId) {
        functions.logger.error('לא נמצא נמען להודעה');
        return;
      }

      // עדכון lastMessageAt בהתאמה (כבר נעשה ב-storeMessage, אבל נוודא)
      await matchDoc.ref.update({
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // קריאת פרופיל השולח והנמען
      const [senderDoc, recipientDoc] = await Promise.all([
        db.collection('users').doc(senderId).get(),
        db.collection('users').doc(recipientId).get()
      ]);

      if (!senderDoc.exists || !recipientDoc.exists) {
        functions.logger.error('אחד המשתמשים לא נמצא');
        return;
      }

      const senderName = senderDoc.data()!.name || 'מישהו';
      const recipientData = recipientDoc.data()!;
      const devices = recipientData.devices || [];

      // שליחת התראת FCM לכל מכשירי הנמען
      if (devices.length > 0) {
        const tokens = devices.map((device: any) => device.fcmToken).filter(Boolean);

        if (tokens.length > 0) {
          // חיתוך הטקסט ל-100 תווים ראשונים להתראה
          const previewText = messageText.length > 100
            ? messageText.substring(0, 97) + '...'
            : messageText;

          const message: admin.messaging.MulticastMessage = {
            tokens: tokens,
            notification: {
              title: `הודעה חדשה מ${senderName}`,
              body: previewText
            },
            data: {
              type: 'new_message',
              matchId: matchId,
              messageId: messageId,
              senderId: senderId
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                priority: 'high',
                channelId: 'messages'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                  alert: {
                    title: `הודעה חדשה מ${senderName}`,
                    body: previewText
                  }
                }
              }
            }
          };

          const response = await admin.messaging().sendEachForMulticast(message);

          functions.logger.info(
            `נשלחו ${response.successCount} התראות מתוך ${tokens.length} למשתמש ${recipientId}`
          );

          // טיפול בטוקנים לא תקפים
          if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                failedTokens.push(tokens[idx]);
              }
            });

            // הסרת טוקנים לא תקפים מהמסד נתונים
            if (failedTokens.length > 0) {
              const updatedDevices = devices.filter(
                (device: any) => !failedTokens.includes(device.fcmToken)
              );

              await recipientDoc.ref.update({
                devices: updatedDevices
              });

              functions.logger.info(`הוסרו ${failedTokens.length} טוקנים לא תקפים`);
            }
          }
        }
      }
    } catch (error) {
      functions.logger.error('שגיאה בטריגר הודעה חדשה:', error);
    }
  });

// ========================================
// Trigger #3: onUserWrite
// ========================================

/**
 * טריגר שמופעל כאשר מסמך משתמש נוצר או מתעדכן
 * מסנכרן את הנתונים הציבוריים ל-public_profiles
 */
export const onUserWrite = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;

    try {
      // אם המסמך נמחק
      if (!change.after.exists) {
        functions.logger.info(`משתמש ${userId} נמחק, מוחק את הפרופיל הציבורי`);
        await db.collection('public_profiles').doc(userId).delete();
        return;
      }

      const userData = change.after.data()!;

      // חישוב גיל מתאריך לידה
      let age: number | null = null;
      if (userData.birthdate) {
        const today = new Date();
        const birth = userData.birthdate.toDate();
        age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
      }

      // בניית מסמך פרופיל ציבורי
      const publicProfile = {
        userId: userId,
        name: userData.name || '',
        age: age,
        gender: userData.gender || 'other',
        city: userData.location?.city || userData.city || '',
        photo: (userData.photos && userData.photos.length > 0 && userData.photos[0].url) || null,
        tags: userData.interests || [],
        plan: userData.plan || 'free',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // שמירת הפרופיל הציבורי
      await db.collection('public_profiles').doc(userId).set(publicProfile, { merge: true });

      functions.logger.info(`פרופיל ציבורי עודכן עבור משתמש ${userId}`);
    } catch (error) {
      functions.logger.error('שגיאה בסנכרון פרופיל ציבורי:', error);
    }
  });
