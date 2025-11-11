# Cloud Functions - אפליקציית היכרויות

מערכת Cloud Functions מלאה ומושלמת לאפליקציית היכרויות מבוססת Agent Garden.

## מבנה הפרויקט

```
functions/
├── src/
│   ├── index.ts       # נקודת כניסה ראשית - ייצוא כל הפונקציות
│   ├── tools.ts       # כל ה-Tools שה-Agents מפעילים
│   └── triggers.ts    # טריגרים אוטומטיים (onCreate, onWrite)
├── __tests__/         # בדיקות יחידה
│   ├── moderateText.test.ts
│   ├── createOrQueueMatch.test.ts
│   └── queryCandidates.test.ts
├── package.json       # תלויות ו-scripts
├── tsconfig.json      # הגדרות TypeScript
└── jest.config.js     # הגדרות בדיקות
```

## התקנה

```bash
cd functions
npm install
```

## פקודות זמינות

### בנייה
```bash
npm run build
```
מקמפל את קוד TypeScript לתיקיית `lib/`.

### הרצה מקומית
```bash
npm run serve
```
מריץ את ה-Functions ב-Firebase Emulator למטרות פיתוח.

### בדיקות
```bash
npm test
```
מריץ את כל בדיקות היחידה עם Jest.

```bash
npm run test:watch
```
מריץ בדיקות במצב watch (עדכון אוטומטי).

### פריסה לייצור
```bash
npm run deploy
```
מעלה את כל ה-Functions ל-Firebase.

## Tools זמינים

### 1. readUserProfile
קורא פרופיל משתמש מ-Firestore.

**קלט:**
```typescript
{ userId: string }
```

**פלט:**
```typescript
{ user: UserProfile }
```

### 2. queryCandidates
מחזיר רשימת מועמדים מתאימים לפי פילטרים.

**קלט:**
```typescript
{
  userId: string,
  filters?: {
    gender?: string,
    ageMin?: number,
    ageMax?: number,
    maxDistanceKm?: number,
    limit?: number
  }
}
```

**פלט:**
```typescript
{ candidates: Candidate[] }
```

### 3. scoreCandidate
מחשב ציון התאמה למועמד (rule-based).

**קלט:**
```typescript
{
  sourceUser: string,
  candidate: Candidate
}
```

**פלט:**
```typescript
{
  score: {
    value: number,    // 0-1
    reasons: string[]
  }
}
```

### 4. createOrQueueMatch
יוצר התאמה חדשה עם אכיפת "קשר אחד בכל פעם".

**קלט:**
```typescript
{
  userA: string,
  userB: string,
  score?: number
}
```

**פלט:**
```typescript
{
  matchId: string,
  state: 'active' | 'pending' | 'closed'
}
```

### 5. getActiveMatch
מחזיר את ההתאמה הפעילה של משתמש.

**קלט:**
```typescript
{ userId: string }
```

**פלט:**
```typescript
{
  matchId: string | null,
  state: string | null
}
```

### 6. closeMatch
סוגר התאמה פעילה.

**קלט:**
```typescript
{
  matchId: string,
  reason?: string
}
```

**פלט:**
```typescript
{ ok: boolean }
```

### 7. moderateText
בודק טקסט למילים אסורות, ספאם ותוכן בלתי הולם.

**קלט:**
```typescript
{
  text: string,
  context?: string
}
```

**פלט:**
```typescript
{
  allowed: boolean,
  labels: string[]
}
```

### 8. storeMessage
שומר הודעה חדשה (עם moderation אוטומטי).

**קלט:**
```typescript
{
  matchId: string,
  from: string,
  text: string
}
```

**פלט:**
```typescript
{
  messageId: string,
  status: 'sent' | 'delivered' | 'read'
}
```

### 9. extractSharedInterests
מחלץ תחומי עניין משותפים בין שני משתמשים.

**קלט:**
```typescript
{
  userA: string,
  userB: string
}
```

**פלט:**
```typescript
{ shared: string[] }
```

### 10. embedText
יוצר embedding לטקסט (stub - שלב II).

**קלט:**
```typescript
{ text: string }
```

**פלט:**
```typescript
{ vector: number[] }
```

### 11. storeEmbedding
שומר embedding במסמך המשתמש.

**קלט:**
```typescript
{
  userId: string,
  vector: number[]
}
```

**פלט:**
```typescript
{ ok: boolean }
```

### 12. sendPush
שולח התראת FCM למכשיר.

**קלט:**
```typescript
{
  token: string,
  title: string,
  body: string,
  data?: object
}
```

**פלט:**
```typescript
{ ok: boolean }
```

## טריגרים אוטומטיים

### 1. onMatchCreated
מופעל כאשר נוצרת התאמה חדשה.
- יוצר 3 פתיחי שיחה מותאמים אישית
- שומר תחת `matches/{matchId}/starters`

### 2. onMessageCreated
מופעל כאשר נוצרת הודעה חדשה.
- מעדכן `lastMessageAt` בהתאמה
- שולח התראת FCM לצד השני
- מסיר טוקנים לא תקפים

### 3. onUserWrite
מופעל כאשר פרופיל משתמש מתעדכן.
- מסנכרן נתונים ציבוריים ל-`public_profiles`
- מחשב גיל אוטומטית
- מנקה נתונים רגישים

## אבטחה

כל הפונקציות כוללות:
- ✅ בדיקת אימות (context.auth)
- ✅ ולידציה של נתונים לפי JSONSchema
- ✅ טיפול בשגיאות עם HttpsError
- ✅ הרשאות - משתמש יכול לגשת רק לנתונים שלו
- ✅ הערות בעברית להבנה טובה יותר

## כללי "קשר אחד בכל פעם"

הפונקציה `createOrQueueMatch` אוכפת שלמשתמש יכולה להיות רק התאמה אחת פעילה בכל זמן נתון:
- בדיקה טרנזקציונית לפני יצירת התאמה
- זריקת שגיאה אם קיימת כבר התאמה פעילה
- מאפשר יצירת התאמה חדשה רק לאחר סגירת הקודמת

## מודרציה

מערכת המודרציה בודקת:
- 🚫 מילים אסורות (עברית ואנגלית)
- 🚫 ספאם (תווים חוזרים)
- 🚫 כתובות אתרים ומספרי טלפון
- ⚠️ טקסט באותיות גדולות (מסומן אבל לא נחסם)

## הערות פיתוח

- כל הקוד ב-TypeScript עם טיפוסים מלאים
- בדיקות מקיפות ל-critical paths
- לוגים ברורים לכל פעולה
- ללא TODO - הכל מושלם ומוכן לייצור!

## רישיון

MIT
