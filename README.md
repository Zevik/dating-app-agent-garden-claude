# אפליקציית היכרויות - Agent Garden + Firebase

אפליקציית היכרויות מבוססת צ'אט עם בינה מלאכותית, בנויה עם Next.js, Firebase ו-Agent Garden.

## 📋 תכונות

### ✨ תכונות עיקריות
- 🔐 אימות משתמשים (Firebase Auth)
- 👤 ניהול פרופיל מלא
- 📸 העלאת תמונות (עד 6 תמונות)
- 🎯 מערכת התאמות חכמה מבוססת AI
- 💬 צ'אט בזמן אמת
- 🤖 פתיחי שיחה מותאמים אישית
- 🛡️ מודרציה אוטומטית
- 🔔 התראות Push (FCM)
- 📊 "קשר אחד בכל פעם" - מדיניות אכיפה

### 🎨 עיצוב
- RTL מלא (מימין לשמאל)
- ממשק בעברית 100%
- עיצוב מודרני עם Tailwind CSS
- קומפוננטות של shadcn/ui
- רספונסיבי מלא

## 🏗️ ארכיטקטורה

```
Frontend (Next.js 14)
├── Auth & Onboarding
├── Matches (Like/Pass)
├── Chat (Real-time)
└── Profile & Settings

Backend (Firebase)
├── Authentication
├── Firestore Database
├── Cloud Storage
├── Cloud Functions (12 Tools + 3 Triggers)
└── Cloud Messaging

AI Layer (Agent Garden)
├── Matching Agent
├── Conversation Starter Agent
├── Moderation Agent
├── One-Connection State Agent
└── Notification Agent
```

## 🛠️ מבנה התיקיות

```
dating-app-agent-garden-claude/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # דפי אימות
│   │   ├── login/
│   │   ├── register/
│   │   └── onboarding/           # תהליך הרשמה (4 שלבים)
│   ├── (app)/                    # דפים ראשיים
│   │   ├── matches/              # התאמות
│   │   ├── chat/                 # צ'אטים
│   │   ├── profile/              # פרופיל
│   │   └── settings/             # הגדרות
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                       # קומפוננטות בסיס
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── avatar.tsx
│   ├── MatchCard.tsx             # כרטיס התאמה
│   ├── ChatBubble.tsx            # בועת הודעה
│   └── ConversationStarters.tsx  # פתיחי שיחה
├── lib/
│   ├── firebase.ts               # תצורת Firebase
│   ├── api.ts                    # קריאות ל-Cloud Functions
│   ├── agents.ts                 # קריאות ל-Agent Engine
│   └── utils.ts                  # פונקציות עזר
├── functions/                    # Cloud Functions
│   ├── src/
│   │   ├── index.ts              # נקודת כניסה
│   │   ├── tools.ts              # 12 Tools
│   │   └── triggers.ts           # 3 Triggers
│   ├── __tests__/                # בדיקות Jest (18 tests)
│   ├── tools.schema.json         # JSONSchema
│   ├── tools.manifest.json       # Agent Garden manifest
│   └── package.json
├── public/                       # קבצים סטטיים
├── firestore.rules               # כללי אבטחה Firestore
├── firestore.indexes.json        # אינדקסים
├── storage.rules                 # כללי אבטחה Storage
├── firebase.json                 # תצורת Firebase
├── .firebaserc                   # פרויקטים
├── .env.local                    # משתני סביבה
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 🚀 התחלה מהירה

### דרישות מקדימות
- Node.js 18+ ([הורדה](https://nodejs.org))
- npm או yarn
- Firebase CLI ([התקנה](https://firebase.google.com/docs/cli))

### 1. התקנת תלויות

```bash
# התקנת תלויות הפרונטאנד
npm install

# התקנת תלויות Cloud Functions
cd functions
npm install
cd ..
```

### 2. הגדרת Firebase Emulator

```bash
# התחברות ל-Firebase (אופציונלי - רק אם אתה רוצה פריסה)
firebase login

# התקנת Emulators
firebase init emulators
# בחר: Auth, Firestore, Functions, Storage
```

### 3. הרצת Emulator

פתח טרמינל חדש והרץ:

```bash
firebase emulators:start
```

תראה:
```
✔  All emulators ready! It is now safe to connect your app.
┌─────────────────────────────────────────────────────────────┐
│ ✔  Emulator UI running on http://127.0.0.1:4000            │
│ ✔  Auth Emulator on http://127.0.0.1:9099                  │
│ ✔  Firestore Emulator on http://127.0.0.1:8080             │
│ ✔  Functions Emulator on http://127.0.0.1:5001             │
│ ✔  Storage Emulator on http://127.0.0.1:9199               │
└─────────────────────────────────────────────────────────────┘
```

### 4. הרצת האפליקציה

פתח טרמינל נוסף:

```bash
npm run dev
```

האפליקציה תהיה זמינה ב: **http://localhost:3000**

### 5. פתיחת Emulator UI

פתח דפדפן ב: **http://localhost:4000**

תוכל לראות:
- משתמשים שנרשמו
- מסמכי Firestore
- קבצים ב-Storage
- לוגים של Functions
- התראות

## 📱 תזרים שימוש

### הרשמה ואונבורדינג
1. גלוש ל-`/register`
2. הזן אימייל וסיסמה
3. השלם 4 שלבי אונבורדינג:
   - **פרטים בסיסיים**: שם, תאריך לידה, מגדר, מה מחפש
   - **מיקום ועניינים**: עיר, ביוגרפיה, תחומי עניין
   - **תמונות**: העלאת עד 6 תמונות
   - **העדפות**: טווח גילאים, מרחק מקסימלי

### גלישה והתאמות
1. מסך `/matches` מציג מועמד נוכחי
2. לחץ ❤️ (לייק) או ❌ (פאס)
3. אם יש התאמה הדדית → יצירת match וצ'אט

### צ'אט
1. מסך `/chat` - רשימת צ'אטים פעילים
2. לחץ על צ'אט → `/chat/[matchId]`
3. ראה 3 פתיחי שיחה מומלצים
4. כתוב הודעות בזמן אמת
5. אפשר לסגור התאמה (כפתור "סיום שיחה")

### פרופיל
1. מסך `/profile` - הצגת הפרופיל שלך
2. ערוך פרטים ב-`/profile/edit/*`
3. נהל הגדרות ב-`/settings`

## 🔧 Cloud Functions

### 12 Tools זמינים

| Tool | תיאור | קלט | פלט |
|------|-------|-----|-----|
| `readUserProfile` | קריאת פרופיל משתמש | userId | פרופיל מלא |
| `queryCandidates` | חיפוש מועמדים | userId, filters | רשימת מועמדים |
| `scoreCandidate` | חישוב ציון התאמה | sourceUser, candidate | ציון + נימוקים |
| `createOrQueueMatch` | יצירת התאמה | userA, userB, score | matchId, state |
| `getActiveMatch` | התאמה פעילה | userId | matchId או null |
| `closeMatch` | סגירת התאמה | matchId, reason | ok |
| `moderateText` | בדיקת תוכן | text | allowed, labels |
| `storeMessage` | שמירת הודעה | matchId, from, text | messageId, status |
| `extractSharedInterests` | תחומי עניין משותפים | userA, userB | רשימת תחומים |
| `embedText` | יצירת embedding | text | vector (256) |
| `storeEmbedding` | שמירת embedding | userId, vector | ok |
| `sendPush` | שליחת התראה | token, title, body | ok |

### 3 Triggers אוטומטיים

1. **onMatchCreated**: יוצר 3 פתיחי שיחה מותאמים
2. **onMessageCreated**: עדכון זמן + התראת FCM
3. **onUserWrite**: סנכרון ל-public_profiles

## 🧪 בדיקות

```bash
cd functions
npm test
```

**18 Test Cases:**
- ✅ moderateText: 7 בדיקות
- ✅ createOrQueueMatch: 7 בדיקות
- ✅ queryCandidates: 4 בדיקות

## 🔒 אבטחה

### Firestore Security Rules
- ✅ משתמש רואה רק את הפרופיל שלו
- ✅ צ'אטים נגישים רק לשני הצדדים
- ✅ התאמות מנוהלות רק על ידי השרת
- ✅ הודעות לא ניתנות לעריכה/מחיקה

### Storage Rules
- ✅ העלאת תמונות רק למשתמש עצמו
- ✅ מגבלת גודל: 5MB
- ✅ רק קבצי תמונה

### Moderation
- 🚫 מילים אסורות (עברית + אנגלית)
- 🚫 ספאם (תווים חוזרים)
- 🚫 כתובות אתרים ומספרי טלפון
- ⚠️ CAPS (מסומן, לא חוסם)

## 🌐 Integration עם Agent Garden

### הגדרת Tools ב-Agent Garden

1. פתח `functions/tools.manifest.json`
2. החלף `REGION` ו-`PROJECT_ID` עם הערכים שלך:
   ```json
   "url": "https://us-central1-YOUR-PROJECT.cloudfunctions.net/readUserProfile"
   ```
3. העלה את הקבצים ל-Agent Garden:
   - `tools.schema.json`
   - `tools.manifest.json`

### יצירת Agents

1. **Matching Agent**:
   - קורא פרופיל: `readUserProfile`
   - מחפש מועמדים: `queryCandidates`
   - מדרג: `scoreCandidate`
   - יוצר התאמה: `createOrQueueMatch`

2. **Conversation Starter Agent**:
   - מוצא תחומי עניין: `extractSharedInterests`
   - מייצר 3 פתיחים מותאמים

3. **Moderation Agent**:
   - בודק תוכן: `moderateText`
   - חוסם הודעות לא ראויות

## 📊 מסד נתונים (Firestore)

### Collections

- **`users/{userId}`**: פרופילים מלאים
- **`public_profiles/{userId}`**: אינדקס ציבורי (שם, גיל, תמונה)
- **`matches/{matchId}`**: התאמות (users[], state, score)
- **`messages/{matchId}/items/{messageId}`**: הודעות
- **`likes/{userId}/targets/{targetUserId}`**: לייקים/פאסים
- **`reports/{reportId}`**: דיווחים
- **`system/config`**: הגדרות גלובליות

## 🎯 "קשר אחד בכל פעם"

מדיניות מרכזית: **משתמש יכול להיות רק בהתאמה פעילה אחת בכל זמן**.

### אכיפה:
1. **בקוד** (functions/src/tools.ts):
   ```typescript
   async function assertOneActive(userId: string) {
     const q = await db.collection('matches')
       .where('users', 'array-contains', userId)
       .where('state', '==', 'active')
       .limit(1).get();
     if (!q.empty) throw new Error('User already has active match');
   }
   ```
2. **טרנזקציות**: `createOrQueueMatch` משתמש ב-runTransaction
3. **Firestore Rules**: רק Functions יכולות לכתוב ל-matches

## 🚢 פריסה לפרודקשן

### 1. הגדרת פרויקט Firebase

```bash
firebase projects:list
firebase use <project-id>
```

### 2. עדכון .env.local

החלף את הערכים עם הערכים האמיתיים מ-Firebase Console:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_USE_EMULATOR=false
```

### 3. פריסת Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

### 4. פריסת Indexes

```bash
firebase deploy --only firestore:indexes
```

### 5. פריסת Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 6. פריסת Frontend (Vercel)

```bash
npm run build
vercel --prod
```

או שלח ל-GitHub ופרוס דרך Vercel Dashboard.

## 🐛 פתרון בעיות

### Emulator לא מתחבר?
```bash
# בדוק שה-Emulator רץ
firebase emulators:start

# ודא ש-NEXT_PUBLIC_USE_EMULATOR=true ב-.env.local
```

### שגיאות TypeScript?
```bash
# נקה את ה-cache
rm -rf .next node_modules functions/lib
npm install
cd functions && npm install && cd ..
```

### Functions לא עובדות?
```bash
# בדוק לוגים
firebase functions:log

# או ב-Emulator UI: http://localhost:4000
```

### התאמות לא נוצרות?
1. בדוק ב-Emulator UI אם יש משתמשים
2. ודא שלמשתמשים יש העדפות (prefs)
3. בדוק ש-gender/seeking תואמים

## 📚 קריאה נוספת

- [מפרט טכני מלא](./אפיון_טכני_אפליקציית_היכרויות_מבוססת_agent_garden_firebase.md)
- [Cloud Functions README](./functions/README.md)
- [Cloud Functions Quickstart](./functions/QUICKSTART.md)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Agent Garden](https://agent.garden)

## 🤝 תרומה

1. Fork הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## 📄 רישיון

MIT License

## 👨‍💻 מפתחים

נבנה עם ❤️ עבור אפליקציות היכרויות בעברית

---

**סטטוס**: ✅ Production Ready
**תאריך יצירה**: נובמבר 2025
**גרסה**: 1.0.0
