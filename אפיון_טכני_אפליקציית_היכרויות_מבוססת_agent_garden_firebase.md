# אפיון טכני – אפליקציית היכרויות מבוססת Agent Garden + Firebase

> מטרה: לאפיין מערכת היכרויות "Chat‑centric" שבה ה‑AI מנהל את כל השלבים – איתור התאמות, פתיחת שיחות, ניהול כללי הבטיחות (Moderation), "קשר אחד בכל פעם" והפעלה של אוטומציות. מותאם ל‑Agent Garden + ADK + Agent Engine + Firebase (Auth, Firestore, Storage, Cloud Functions, Cloud Messaging), עם אפשרות להתרחב בהמשך ל‑Vertex AI Search/Embeddings.

---

## 1) ארכיטקטורה – מבט־על

**Frontend (Web/App):** Next.js/React (קיים/עתידי), צ׳אט בזמן אמת, ניהול פרופיל ותהליך הרשמה. תקשורת ל‑Agents דרך HTTP/Agent Engine Playground/SDK, וקריאות ישירות ל‑Firebase (Auth/Firestore/Storage/FCM).

**Backend as a Platform:**
- **Firebase Auth** – אימות משתמשים (Email/Password, OAuth בהמשך).
- **Firestore** – מסד נתונים זמן‑אמת (collections מפורטות בסעיף 4).
- **Cloud Storage** – תמונות פרופיל.
- **Cloud Functions** – Webhooks, טריגרים (onCreate/onWrite), כלים (Tools) שה‑Agents מפעילים.
- **Cloud Messaging (FCM)** – התראות Push על התאמות/הודעות.

**AI & Orchestration:**
- **Agent Garden (ADK + Agent Engine)** – מארח את ה‑Agents, דוגמאות והפצה מהירה (Agent Starter Pack).
- **Agents** צורכים "Tools" (פונקציות) שמבצעות: קריאת Firestore, יצירת התאמה, כתיבת הודעה, בדיקת Moderation, ועוד.
- **Embeddings & Matching** – שלב I: scoring חוקים + ענן (Rule‑based + signals). שלב II: Embeddings ומדדי דמיון (קוסינוס) ב‑Cloud Functions/Vertex AI (לבחירה).

**מדיניות "קשר אחד בכל פעם":** Agent State Manager ו‑Firestore Rules המבטיחים למשתמש אחד match פעיל אחד.

---

## 2) מודולי Agents (ADK)

### 2.1 Matching Agent
**תפקיד:** לדרג מועמדים ולהחזיר מועמד הבא לשידוך.
- קלט: userId, preferences, context (מיקום, גיל, תחומי עניין, זמינות).
- כלים (Tools): `readUserProfile`, `queryCandidates`, `scoreCandidate`, `createOrQueueMatch`.
- יציאה: candidateId + score + rationale.
- הערות: מכבד Rate‑limit (מס׳ הצעות ליום), ומכבד "קשר אחד פעיל".

### 2.2 Conversation Starter Agent
**תפקיד:** לייצר 3 פתיחי שיחה מותאמים לשני פרופילים.
- קלט: profileA, profileB, sharedInterests.
- כלים: `readUserProfile`, `extractSharedInterests`.
- יציאה: 3 opening lines + בטאגליין קצר.

### 2.3 Moderation Agent
**תפקיד:** בדיקת תוכן הודעות (לפני/אחרי שליחה) ופרופילים.
- קלט: message text / bio / image metadata.
- כלים: `moderateText`, `flagUser`, `quarantineMessage`.
- יציאה: allow/block + reason + remediation steps.

### 2.4 One‑Connection State Agent
**תפקיד:** להבטיח חוקים: התאמה פעילה אחת בלבד, סגירה מסודרת של match לפני הבא.
- קלט: userId, intent (open/new/close).
- כלים: `getActiveMatch`, `closeMatch`, `openMatch`.
- יציאה: success/failure + next allowed action.

### 2.5 Profile Vectorization Agent (שלב II)
**תפקיד:** יצירת embeddings לביוגרפיה/תחומי עניין וחישוב דמיון.
- קלט: userId.
- כלים: `embedText`, `storeEmbedding`, `nearestNeighbors`.
- יציאה: embedding + topK.

### 2.6 Notification Agent
**תפקיד:** שליחת התראות על match/הודעות חדשות/הצעות פתיחה.
- כלים: `sendPush` (FCM), `sendEmail` (בהמשך).
- טריגרים: onMatchCreated, onMessageCreated.

---

## 3) כלים (Tools) שה‑Agents מפעילים
כל Tool נחשף ל‑ADK כפעולה עם סכמות קלט/פלט ברורות, וממומש ב‑Cloud Functions.

- `readUserProfile(userId)` – Firestore get.
- `queryCandidates(userId, filters)` – Firestore query עם פילטרים: גיל, מין, מרחק (אם נשמר geohash), זמינות.
- `scoreCandidate(sourceUser, candidate)` – פונקציה סקורינג (Rule‑based + signals + optional embeddings).
- `createOrQueueMatch(userA, userB)` – יוצר/מעדכן מסמך `matches` בצורה אטומית (Transaction).
- `getActiveMatch(userId)` – מאחזר match פעיל (או None).
- `closeMatch(matchId, reason)` – מסמן כ‑closed ומונע הודעות נוספות.
- `moderateText(text, context)` – החזרת allow/blocked + labels.
- `storeMessage(matchId, from, text)` – מוסיף הודעה (בכפוף ל‑moderation), מעדכן counters.
- `extractSharedInterests(profileA, profileB)` – החזרת רשימת תחומי עניין משותפים.
- `embedText(text)` / `storeEmbedding(userId, vector)` – שלב II.
- `sendPush(token, title, body, data)` – FCM.

---

## 4) סכמת נתונים (Firestore)

**קולקציות עיקריות:**

- `users/{userId}`
  - `email` (string)
  - `name` (string)
  - `birthdate` (timestamp) → מחושב גיל בצד השרת
  - `gender` (enum: male/female/other)
  - `seeking` (enum)
  - `location` (object: city, lat, lng, optional geohash)
  - `bio` (string, max 500)
  - `interests` (array<string>)
  - `photos` ([{ url, order, approved:boolean }])
  - `prefs` ({ ageMin, ageMax, maxDistanceKm })
  - `status` ({ active:boolean, suspended:boolean })
  - `plan` (enum: free/premium/vip)
  - `devices` ([{ fcmToken, platform }])
  - `embedding` (array<number>, optional, שלב II)
  - מטה: `createdAt`, `updatedAt`

- `matches/{matchId}`
  - `users` ([userAId, userBId])
  - `state` (enum: pending/active/closed)
  - `openedBy` (userId)
  - `closedBy` (userId|null)
  - `score` (number)
  - `lastMessageAt` (timestamp)
  - gates: `oneActiveEachSide:boolean` (נגזר/מאומת בכל כתיבה)
  - מטה: `createdAt`, `updatedAt`

- `messages/{matchId}/items/{messageId}`
  - `from` (userId)
  - `text` (string)
  - `status` (enum: sent/delivered/read)
  - `moderation` ({ allowed:boolean, labels:[] })
  - מטה: `createdAt`

- `likes/{userId}/targets/{targetUserId}`
  - `value` (enum: like/pass)
  - `createdAt`

- `reports/{reportId}`
  - `reportedUserId`, `byUserId`, `reason`, `details`, `createdAt`, `state`

- `system/config`
  - פרמטרים גלובליים: rate limits, מינימום־תמונות, ניסוח פתיחים, דגלים.

**אינדקסים מוצעים:**
- `users(seeking, gender, age, geohash)` – התאמות מהירות.
- `matches(users array, state, lastMessageAt)` – רשימת צ׳אטים מסודרת.
- `likes(userId, createdAt)`.

---

## 5) כללי אבטחה (Firestore Rules) – עקרונות

1. **קריאה לפרופיל עצמי:** מותר. פרופילים של אחרים: רק שדות ציבוריים (שם/גיל/עיר/תמונה) ולפי התאמות/תורים.
2. **כתיבת פרופיל:** רק המשתמש עצמו; שדות מוגבלים (plan/status רק ע״י שרת).
3. **Messages:**
   - כתיבה: רק אם `matches/{matchId}` במצב `active` והכותב הוא אחד הצדדים.
   - קריאה: רק שני הצדדים.
4. **Matches:**
   - יצירה/עדכון רק ע״י Cloud Functions/Agents (שרת),
   - כלל אכיפה: לכל משתמש מותר לכל היותר `1` match במצב `active` (מאומת טרנזקציונית בצד השרת, ורולס מונעות עדכון ידני מהלקוח).
5. **Reports:** קריא/כותב מותר רק למדווח ולשרת; ניהול ע״י אדמין בלבד.

(הטמעה מלאה של חוקים – בקובץ נפרד של rules, כולל `allow read: if`/`allow write: if` עם `request.auth` והגבלות collection‑group.)

---

## 6) Cloud Functions – API פנימי וכלי Agents

**דוגמאות חתימות (Typescript):**

```ts
// Matching tools
export const queryCandidates = onCall(async (req) => {
  // req.data: { userId, filters }
});

export const createOrQueueMatch = onCall(async (req) => {
  // Transaction: validate one-active constraint, then create match
});

// Messages tools
export const storeMessage = onCall(async (req) => {
  // Pre‑moderation → write → notify via FCM
});

// Moderation tool
export const moderateText = onCall(async (req) => {
  // Return { allowed, labels }
});

// Notification tool
export const sendPush = onCall(async (req) => {
  // FCM multicast
});
```

**טריגרים:**
- `onCreate(matches)` → ConversationStarter Agent → יוצר 3 פתיחים ושולח כקלפים בצ׳אט.
- `onCreate(messages)` → Moderation (פוסט/פרה) + עדכון `lastMessageAt` + FCM.

---

## 7) אינטגרציית Agent Garden (ADK + Agent Engine)

1. **Agent Starter Pack** – יצירת פרויקט סוכנים בסיסי ופריסה ל‑Agent Engine.
2. **הגדרת Tools** – מיפוי Cloud Functions כ‑ADK tools (סכמות JSON).
3. **Contracts** – מסמכי JSONSchema לקלט/פלט של כל Tool (versioned contracts).
4. **Playground** – בדיקות אינטראקטיביות של Matching/Moderation/Starters.
5. **Firebase Studio** – פתיחת הקוד להתאמה אישית, ניהול סביבות.

**דוגמה לרישום Tool ב‑ADK (פסאודו):**
```json
{
  "name": "queryCandidates",
  "input_schema": { "type": "object", "properties": { "userId": {"type":"string"}, "filters": {"type":"object"} }, "required": ["userId"] },
  "output_schema": { "type": "object", "properties": { "candidates": {"type":"array"} } }
}
```

---

## 8) תזרימי UX עיקריים (ממופים למודולים)

- **Onboarding**: Auth → פרופיל → תמונות → העדפות → הפעלת Matching Agent → הצגת מועמד ראשון.
- **Like/Pass**: כתיבת `likes`, טריגר לבדיקה הדדית → אם יש Mutual → `createOrQueueMatch`.
- **"יש התאמה"**: יצירת match → ConversationStarter Agent → החזרת 3 פתיחים → הצגה בצ׳אט.
- **Chat**: שליחת הודעה → Moderation → כתיבה ל‑messages → התראה לצד השני.
- **End Match**: בקשת סגירה → One‑Connection Agent + פונקציית סגירה → מעבר להתאמות חדשות.

---

## 9) שלבי מסירה (Milestones)

**M0 – Skeleton & Contracts**
- פרויקט Firebase + תצורה.
- הגדרת collections בסיס.
- ניסוח JSONSchema לקלט/פלט של Tools.

**M1 – Matching v1 (Rule‑based)**
- queryCandidates + scoreCandidate.
- One‑connection guard (שרת + רולס).
- UI: כרטיס התאמה + Like/Pass.

**M2 – Chat + Moderation**
- messages write/read + moderation tool.
- התראות FCM.
- UX של פתיחי שיחה.

**M3 – Conversation Starters + Match Modal**
- טריגר onMatchCreate → 3 פתיחים.
- ממשק בחירה והדבקה לשורת ההקלדה.

**M4 – Embeddings (אופציונלי)**
- יצירת/אחסון embedding + top‑K.
- שיפור scoreCandidate (hybrid rank).

**M5 – אנליטיקות וצמיחה**
- events: views, likes, passes, time‑to‑first‑message.
- פאנל אדמין מינימלי.

---

## 10) בדיקות ואיכות

- **Tests ל‑Tools:** יחידה + אינטגרציה ל‑Cloud Functions.
- **Simulations ב‑Agent Engine Playground:** תרחישי התאמה/צ׳אט/סגירה.
- **Rate limits:** Like/day, message/min, open‑match policy.
- **אבטחה:** אימות Strict ב‑Rules; לוגים לכל Block ב‑Moderation.

---

## 11) תשתיות ו‑DevOps

- **סביבות:** dev / staging / prod (פרויקטי Firebase נפרדים + Agent Engine namespaces).
- **Config:** `system/config` לכל פרמטר בר‑שינוי ללא דיפלוי.
- **Observability:** Cloud Logging, Error Reporting, Traces; קונסולת Agent Engine.

---

## 12) Checklist השקה (MVP)

- [ ] Auth בסיסי, פרופיל, העדפות, תמונות.
- [ ] Matching Agent (rule‑based), Like/Pass.
- [ ] One‑connection policy enforced (srv + rules).
- [ ] Match modal + Conversation Starter Agent.
- [ ] Chat + Moderation + Realtime + FCM.
- [ ] אנליטיקות בסיסיות + פאנל אדמין מינימלי.

---

## 13) מסמכי המשך

- **Spec לכל Tool (Contracts)** – JSONSchema + דוגמאות קלט/פלט.
- **Firestore Security Rules** – קובץ מלא עם בדיקות.
- **UI Flows** – מסכים/מצבים/שגיאות.
- **Data Retention & Privacy** – מדיניות מחיקה/שמירה/אנונימיזציה.

---

### סיכום
אפיון זה ממפה את חוויית המשתמש והלוגיקה העסקית למבנה Agents + Tools עם Firebase כ‑Backend‑as‑a‑Platform. שילוב Agent Garden מאפשר להפריד בין אורקסטרציה חכמה (Agents) לבין ביצוע מאובטח (Cloud Functions/Rules), ולספק MVP חזק עם מסלול התפתחות ברור ל‑Embeddings ודירוג היברידי.



---

## נספח A — JSONSchema מדויק לכל Tool (קלט/פלט)

> כל הסכמות תקניות ל‑JSON Schema Draft‑07. שמות השדות תואמים לסכמת Firestore בסעיף 4.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "tools.schema.json",
  "title": "Agent Tools Schemas",
  "type": "object",
  "definitions": {
    "UserId": { "type": "string", "minLength": 6 },
    "MatchId": { "type": "string", "minLength": 8 },
    "Timestamp": { "type": "string", "format": "date-time" },
    "Geo": {
      "type": "object",
      "properties": { "lat": { "type": "number" }, "lng": { "type": "number" } },
      "required": ["lat", "lng"], "additionalProperties": false
    },
    "Prefs": {
      "type": "object",
      "properties": {
        "ageMin": { "type": "integer", "minimum": 18, "maximum": 99 },
        "ageMax": { "type": "integer", "minimum": 18, "maximum": 99 },
        "maxDistanceKm": { "type": "integer", "minimum": 1, "maximum": 500 }
      },
      "required": ["ageMin", "ageMax", "maxDistanceKm"],
      "additionalProperties": false
    },
    "Candidate": {
      "type": "object",
      "properties": {
        "userId": { "$ref": "#/definitions/UserId" },
        "name": { "type": "string" },
        "age": { "type": "integer", "minimum": 18 },
        "city": { "type": "string" },
        "distanceKm": { "type": "number", "minimum": 0 },
        "interests": { "type": "array", "items": { "type": "string" }, "maxItems": 25 },
        "photos": { "type": "array", "items": { "type": "string", "format": "uri" }, "maxItems": 6 }
      },
      "required": ["userId", "age"],
      "additionalProperties": true
    },
    "Score": {
      "type": "object",
      "properties": {
        "value": { "type": "number", "minimum": 0, "maximum": 1 },
        "reasons": { "type": "array", "items": { "type": "string", "maxLength": 200 }, "maxItems": 5 }
      },
      "required": ["value"],
      "additionalProperties": false
    },
    "OpeningLine": {
      "type": "object",
      "properties": {
        "text": { "type": "string", "minLength": 3, "maxLength": 180 },
        "tag": { "type": "string" }
      },
      "required": ["text"],
      "additionalProperties": false
    }
  },
  "properties": {
    "readUserProfile.input": {
      "type": "object", "properties": { "userId": { "$ref": "#/definitions/UserId" } }, "required": ["userId"]
    },
    "readUserProfile.output": {
      "type": "object",
      "properties": {
        "user": {
          "type": "object",
          "properties": {
            "userId": { "$ref": "#/definitions/UserId" },
            "name": { "type": "string" },
            "age": { "type": "integer" },
            "gender": { "type": "string", "enum": ["male", "female", "other"] },
            "seeking": { "type": "string", "enum": ["male", "female", "other"] },
            "location": { "$ref": "#/definitions/Geo" },
            "city": { "type": "string" },
            "bio": { "type": "string", "maxLength": 500 },
            "interests": { "type": "array", "items": { "type": "string" }, "maxItems": 25 },
            "prefs": { "$ref": "#/definitions/Prefs" },
            "plan": { "type": "string", "enum": ["free", "premium", "vip"] }
          },
          "required": ["userId", "age", "prefs"]
        }
      },
      "required": ["user"],
      "additionalProperties": false
    },

    "queryCandidates.input": {
      "type": "object",
      "properties": {
        "userId": { "$ref": "#/definitions/UserId" },
        "filters": {
          "type": "object",
          "properties": {
            "gender": { "type": "string" },
            "ageMin": { "type": "integer" },
            "ageMax": { "type": "integer" },
            "maxDistanceKm": { "type": "integer" },
            "limit": { "type": "integer", "minimum": 1, "maximum": 50 }
          },
          "additionalProperties": false
        }
      },
      "required": ["userId"],
      "additionalProperties": false
    },
    "queryCandidates.output": {
      "type": "object",
      "properties": { "candidates": { "type": "array", "items": { "$ref": "#/definitions/Candidate" }, "maxItems": 50 } },
      "required": ["candidates"], "additionalProperties": false
    },

    "scoreCandidate.input": {
      "type": "object",
      "properties": { "sourceUser": { "$ref": "#/definitions/UserId" }, "candidate": { "$ref": "#/definitions/Candidate" } },
      "required": ["sourceUser", "candidate"], "additionalProperties": false
    },
    "scoreCandidate.output": {
      "type": "object",
      "properties": { "score": { "$ref": "#/definitions/Score" } },
      "required": ["score"], "additionalProperties": false
    },

    "createOrQueueMatch.input": {
      "type": "object",
      "properties": { "userA": { "$ref": "#/definitions/UserId" }, "userB": { "$ref": "#/definitions/UserId" }, "score": { "type": "number", "minimum": 0, "maximum": 1 } },
      "required": ["userA", "userB"], "additionalProperties": false
    },
    "createOrQueueMatch.output": {
      "type": "object",
      "properties": { "matchId": { "$ref": "#/definitions/MatchId" }, "state": { "type": "string", "enum": ["pending", "active", "closed"] } },
      "required": ["matchId", "state"], "additionalProperties": false
    },

    "getActiveMatch.input": { "type": "object", "properties": { "userId": { "$ref": "#/definitions/UserId" } }, "required": ["userId"] },
    "getActiveMatch.output": {
      "type": "object",
      "properties": { "matchId": { "type": ["null", { "$ref": "#/definitions/MatchId" }] }, "state": { "type": ["null", "string"] } },
      "required": ["matchId"], "additionalProperties": false
    },

    "closeMatch.input": { "type": "object", "properties": { "matchId": { "$ref": "#/definitions/MatchId" }, "reason": { "type": "string", "maxLength": 200 } }, "required": ["matchId"] },
    "closeMatch.output": { "type": "object", "properties": { "ok": { "type": "boolean" } }, "required": ["ok"], "additionalProperties": false },

    "moderateText.input": { "type": "object", "properties": { "text": { "type": "string", "minLength": 1, "maxLength": 4000 }, "context": { "type": "string" } }, "required": ["text"] },
    "moderateText.output": { "type": "object", "properties": { "allowed": { "type": "boolean" }, "labels": { "type": "array", "items": { "type": "string" }, "maxItems": 10 } }, "required": ["allowed"] },

    "storeMessage.input": { "type": "object", "properties": { "matchId": { "$ref": "#/definitions/MatchId" }, "from": { "$ref": "#/definitions/UserId" }, "text": { "type": "string", "minLength": 1, "maxLength": 2000 } }, "required": ["matchId", "from", "text"] },
    "storeMessage.output": { "type": "object", "properties": { "messageId": { "type": "string" }, "status": { "type": "string", "enum": ["sent", "delivered", "read"] } }, "required": ["messageId"] },

    "extractSharedInterests.input": { "type": "object", "properties": { "userA": { "$ref": "#/definitions/UserId" }, "userB": { "$ref": "#/definitions/UserId" } }, "required": ["userA", "userB"] },
    "extractSharedInterests.output": { "type": "object", "properties": { "shared": { "type": "array", "items": { "type": "string" }, "maxItems": 20 } }, "required": ["shared"] },

    "embedText.input": { "type": "object", "properties": { "text": { "type": "string", "minLength": 3, "maxLength": 2000 } }, "required": ["text"] },
    "embedText.output": { "type": "object", "properties": { "vector": { "type": "array", "items": { "type": "number" }, "minItems": 256 } }, "required": ["vector"] },

    "storeEmbedding.input": { "type": "object", "properties": { "userId": { "$ref": "#/definitions/UserId" }, "vector": { "type": "array", "items": { "type": "number" }, "minItems": 256 } }, "required": ["userId", "vector"] },
    "storeEmbedding.output": { "type": "object", "properties": { "ok": { "type": "boolean" } }, "required": ["ok"] },

    "sendPush.input": { "type": "object", "properties": { "token": { "type": "string" }, "title": { "type": "string", "maxLength": 80 }, "body": { "type": "string", "maxLength": 140 }, "data": { "type": "object", "additionalProperties": { "type": ["string", "number", "boolean"] } } }, "required": ["token", "title", "body"] },
    "sendPush.output": { "type": "object", "properties": { "ok": { "type": "boolean" } }, "required": ["ok"] }
  }
}
```

---

## נספח B — Firestore Security Rules (טיוטה)

```rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isUser(uid) { return isSignedIn() && request.auth.uid == uid; }

    // Users
    match /users/{userId} {
      allow read: if isSignedIn();                // ניתן להקשיח לשדות ציבוריים עם data masking
      allow write: if isUser(userId) && !('plan' in request.resource.data) && !('status' in request.resource.data);
    }

    // Matches – נכתבים/מנוהלים ע"י פונקציות שרת בלבד
    match /matches/{matchId} {
      allow read: if isSignedIn() && (request.auth.uid in resource.data.users);
      allow write: if false; // רק Cloud Functions יוצרות/מעדכנות
    }

    // Messages (subcollection)
    match /messages/{matchId}/items/{messageId} {
      allow read: if isSignedIn() && (request.auth.uid in get(/databases/$(database)/documents/matches/$(matchId)).data.users);
      allow create: if isSignedIn() && (
        request.resource.data.from == request.auth.uid &&
        get(/databases/$(database)/documents/matches/$(matchId)).data.state == 'active' &&
        request.resource.data.text is string &&
        length(request.resource.data.text) > 0 && length(request.resource.data.text) <= 2000
      );
      allow update, delete: if false; // אי אפשר לערוך/למחוק הודעות לאחר שליחה
    }

    // Likes
    match /likes/{userId}/targets/{targetUserId} {
      allow read: if isUser(userId);
      allow write: if isUser(userId);
    }

    // Reports
    match /reports/{reportId} {
      allow create: if isSignedIn();
      allow read, update, delete: if false; // ניהול ע"י אדמין בלבד (Cloud Functions)
    }

    // System config
    match /system/{docId} {
      allow read: if true;
      allow write: if false; // מנוהל ע"י שרת בלבד
    }
  }
}
```

> הערה: אפשר להקשיח further את קריאת `/users` לשדות ציבוריים באמצעות Cloud Functions שמייצרות view נפרד, או באמצעות rules עם `dataDiff` ו‑field masks.

---

## נספח C — Stubs של Cloud Functions + רישום Tools ל‑ADK (TypeScript)

```ts
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
const db = admin.firestore();

// Helper: one-active-match guard
async function assertOneActive(userId: string) {
  const q = await db.collection('matches').where('users', 'array-contains', userId).where('state', '==', 'active').limit(1).get();
  if (!q.empty) { throw new functions.https.HttpsError('failed-precondition', 'User already has an active match'); }
}

export const queryCandidates = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in');
  const { userId, filters } = data;
  // TODO: compose Firestore query by filters (gender/age/distance)
  return { candidates: [] };
});

export const scoreCandidate = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in');
  // TODO: rule-based score + optional embeddings
  return { score: { value: 0.72, reasons: ['shared music', 'close distance'] } };
});

export const createOrQueueMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in');
  const { userA, userB, score } = data;
  return await db.runTransaction(async (tx) => {
    await assertOneActive(userA); await assertOneActive(userB);
    const ref = db.collection('matches').doc();
    tx.set(ref, {
      users: [userA, userB], state: 'active', score: score ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { matchId: ref.id, state: 'active' };
  });
});

export const storeMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in');
  const { matchId, from, text } = data;
  // TODO: call moderation first (or use extension)
  const ref = db.collection('messages').doc(matchId).collection('items').doc();
  await ref.set({ from, text, status: 'sent', createdAt: admin.firestore.FieldValue.serverTimestamp() });
  // TODO: update lastMessageAt + FCM notify
  return { messageId: ref.id, status: 'sent' };
});

// Triggers
export const onMatchCreated = functions.firestore.document('matches/{matchId}').onCreate(async (snap) => {
  const match = snap.data();
  // TODO: call Conversation Starter Agent via Agent Engine HTTP endpoint; store 3 lines under a helper collection
});

export const onMessageCreated = functions.firestore.document('messages/{matchId}/items/{messageId}').onCreate(async (snap, ctx) => {
  const msg = snap.data();
  // TODO: moderation (post), analytics, FCM notify other side
});
```

```ts
// adk/tools.manifest.json (דוגמה לרישום כלי אחד)
{
  "tools": [
    {
      "name": "queryCandidates",
      "input_schema": { "$ref": "tools.schema.json#/properties/queryCandidates.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/queryCandidates.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT.cloudfunctions.net/queryCandidates" }
    }
  ]
}
```

---

## נספח D — בדיקות Playground ל‑Agent Engine (תרחישים מוכנים)

1) **תרחיש התאמה בסיסי**
- קלט: `userId=A`, `filters={gender:'female', ageMin:25, ageMax:34, maxDistanceKm:30}`
- צעד 1: קריאה ל‑`queryCandidates` → לוודא לפחות 5 מועמדות.
- צעד 2: עבור כל מועמדת, `scoreCandidate` → לאסוף top‑3 בציון.
- צעד 3: `createOrQueueMatch(A, top1.userId)` → לצפות ל‑`state='active'`.

2) **תרחיש "קשר אחד בכל פעם"**
- טרום‑מצב: למשתמש A יש match פעיל.
- פעולה: ניסיון `createOrQueueMatch(A, X)`.
- ציפיה: שגיאת `failed-precondition`.

3) **תרחיש פתיחי שיחה**
- טריגר: יצירת match (`onMatchCreated`).
- צעד: Agent מחזיר 3 OpeningLine.
- ציפיה: נשמרים תחת `/matches/{matchId}/starters` ו‑נשלחים כהודעה מערכת.

4) **תרחיש Moderation הודעה**
- קלט: `storeMessage({ text: '...' })` עם תוכן אסור.
- ציפיה: `moderateText → allowed=false` ואז `HttpsError('failed-precondition')` מה‑storeMessage.

5) **תרחיש התראות**
- פעולה: הודעה חדשה.
- ציפיה: FCM `sendPush` לצד השני עם payload `{ matchId, messageId }`.

> לכל תרחיש: לשמור artifacts (request/response) ב‑Playground ולתעד סטטוס Pass/Fail.



---

## נספח E — קובץ `adk/tools.manifest.json` מלא לכל ה‑Tools

> תואם ל‑JSONSchema ב"נספח A" (הפניות באמצעות $ref). החלף `REGION` ו‑`PROJECT_ID` בהתאם.

```json
{
  "tools": [
    {
      "name": "readUserProfile",
      "input_schema": { "$ref": "tools.schema.json#/properties/readUserProfile.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/readUserProfile.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/readUserProfile" }
    },
    {
      "name": "queryCandidates",
      "input_schema": { "$ref": "tools.schema.json#/properties/queryCandidates.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/queryCandidates.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/queryCandidates" }
    },
    {
      "name": "scoreCandidate",
      "input_schema": { "$ref": "tools.schema.json#/properties/scoreCandidate.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/scoreCandidate.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/scoreCandidate" }
    },
    {
      "name": "createOrQueueMatch",
      "input_schema": { "$ref": "tools.schema.json#/properties/createOrQueueMatch.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/createOrQueueMatch.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/createOrQueueMatch" }
    },
    {
      "name": "getActiveMatch",
      "input_schema": { "$ref": "tools.schema.json#/properties/getActiveMatch.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/getActiveMatch.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/getActiveMatch" }
    },
    {
      "name": "closeMatch",
      "input_schema": { "$ref": "tools.schema.json#/properties/closeMatch.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/closeMatch.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/closeMatch" }
    },
    {
      "name": "moderateText",
      "input_schema": { "$ref": "tools.schema.json#/properties/moderateText.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/moderateText.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/moderateText" }
    },
    {
      "name": "storeMessage",
      "input_schema": { "$ref": "tools.schema.json#/properties/storeMessage.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/storeMessage.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/storeMessage" }
    },
    {
      "name": "extractSharedInterests",
      "input_schema": { "$ref": "tools.schema.json#/properties/extractSharedInterests.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/extractSharedInterests.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/extractSharedInterests" }
    },
    {
      "name": "embedText",
      "input_schema": { "$ref": "tools.schema.json#/properties/embedText.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/embedText.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/embedText" }
    },
    {
      "name": "storeEmbedding",
      "input_schema": { "$ref": "tools.schema.json#/properties/storeEmbedding.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/storeEmbedding.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/storeEmbedding" }
    },
    {
      "name": "sendPush",
      "input_schema": { "$ref": "tools.schema.json#/properties/sendPush.input" },
      "output_schema": { "$ref": "tools.schema.json#/properties/sendPush.output" },
      "transport": { "type": "http", "method": "POST", "url": "https://REGION-PROJECT_ID.cloudfunctions.net/sendPush" }
    }
  ]
}
```

> טיפ: שמור את `tools.schema.json` ו‑`tools.manifest.json` בתיקיית `adk/` של הפרויקט כדי לשמור על גרסאות סינכרוניות עם ה‑Functions.

---

## נספח F — הקשחת פרטיות פרופילים: `public_profiles` נפרד + Rules

> Firestore לא תומך ב"שדות־מוסווים" בזמן קריאה, לכן מייצרים **אינדקס ציבורי** מינימלי לקריאה חופשית ורולים נוקשים ל‑`/users`.

**מבנה `public_profiles/{userId}`**
```json
{
  "userId": "...",          // עותק
  "name": "...",
  "age": 28,
  "city": "Tel Aviv",
  "photo": "https://.../p1.webp",
  "tags": ["טיולים","מוזיקה"],
  "plan": "free",            // אופציונלי
  "updatedAt": "<serverTime>"
}
```

**Ruleset מחמיר (מחליף/מרחיב את נספח B):**
```rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isUser(uid) { return isSignedIn() && request.auth.uid == uid; }

    // פרופילים מלאים – מוגבל לבעל החשבון בלבד
    match /users/{userId} {
      allow get: if isUser(userId);
      allow list: if false; // אין ליסטינג
      allow create, update: if isUser(userId) && !('plan' in request.resource.data) && !('status' in request.resource.data);
      allow delete: if isUser(userId);
    }

    // אינדקס ציבורי לקריאה בלבד (תוכן מצומצם ובטוח)
    match /public_profiles/{userId} {
      allow read: if true; // כולם יכולים לקרוא
      allow write: if false; // נכתב ע"י פונקציית שרת בלבד
    }

    // יתר הקולקציות (matches/messages/likes/reports/system) – כנ"ל כמו נספח B
    match /matches/{matchId} {
      allow read: if isSignedIn() && (request.auth.uid in resource.data.users);
      allow write: if false;
    }
    match /messages/{matchId}/items/{messageId} {
      allow read: if isSignedIn() && (request.auth.uid in get(/databases/$(database)/documents/matches/$(matchId)).data.users);
      allow create: if isSignedIn() && (
        request.resource.data.from == request.auth.uid &&
        get(/databases/$(database)/documents/matches/$(matchId)).data.state == 'active' &&
        request.resource.data.text is string &&
        length(request.resource.data.text) > 0 && length(request.resource.data.text) <= 2000
      );
      allow update, delete: if false;
    }
    match /likes/{userId}/targets/{targetUserId} {
      allow read, write: if isUser(userId);
    }
    match /reports/{reportId} {
      allow create: if isSignedIn();
      allow read, update, delete: if false;
    }
    match /system/{docId} {
      allow read: if true; allow write: if false;
    }
  }
}
```

**Sync צד‑שרת (`users` → `public_profiles`)** — Cloud Function:
```ts
export const onUserWrite = functions.firestore.document('users/{userId}').onWrite(async (change, ctx) => {
  const userId = ctx.params.userId;
  const after = change.after.exists ? change.after.data() : null;
  const pubRef = db.collection('public_profiles').doc(userId);
  if (!after) { await pubRef.delete(); return; }
  const publicDoc = {
    userId,
    name: after.name ?? '',
    age: after.age ?? null,
    city: after.city ?? null,
    photo: (after.photos && after.photos[0]?.url) || null,
    tags: after.interests ?? [],
    plan: after.plan ?? 'free',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  await pubRef.set(publicDoc, { merge: true });
});
```

---

## נספח G — בדיקות יחידה ל‑Cloud Functions (Jest + Emulator)

**`package.json` (קטע רלוונטי):**
```json
{
  "scripts": {
    "build": "tsc -p functions",
    "test": "jest --runInBand",
    "emulators": "firebase emulators:start --only firestore,functions"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "ts-jest": "^29.2.5",
    "typescript": "^5.6.3",
    "jest": "^29.7.0",
    "firebase-functions-test": "^3.0.0"
  }
}
```

**`functions/jest.config.js`:**
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts']
};
```

**דוגמת בדיקה — `__tests__/createOrQueueMatch.test.ts`:**
```ts
import * as admin from 'firebase-admin';
import * as functionsTestLib from 'firebase-functions-test';
import { createOrQueueMatch } from '../src/index';

const test = functionsTestLib();

beforeAll(() => {
  admin.initializeApp({ projectId: 'demo-test' });
});

describe('createOrQueueMatch', () => {
  it('creates an active match when both sides have none', async () => {
    const wrapped = test.wrap(createOrQueueMatch);
    const context: any = { auth: { uid: 'A' } };
    const data = { userA: 'A', userB: 'B', score: 0.8 };
    const res = await wrapped(data, context);
    expect(res).toHaveProperty('matchId');
    expect(res.state).toBe('active');
  });

  it('fails if A already has an active match', async () => {
    const wrapped = test.wrap(createOrQueueMatch);
    const context: any = { auth: { uid: 'A' } };
    // pre-create active match for A
    const db = admin.firestore();
    await db.collection('matches').add({ users: ['A','X'], state: 'active' });
    await expect(wrapped({ userA: 'A', userB: 'B' }, context)).rejects.toThrow();
  });
});
```

**בדיקה נוספת — `__tests__/moderateText.test.ts`:**
```ts
import { moderateText } from '../src/index';
import * as functionsTestLib from 'firebase-functions-test';
const test = functionsTestLib();

describe('moderateText', () => {
  it('blocks disallowed content', async () => {
    const wrapped = test.wrap(moderateText);
    const res = await wrapped({ text: 'bad slur here' }, { auth: { uid: 'U' } } as any);
    expect(res.allowed).toBe(false);
  });
});
```

> מומלץ להריץ את ה‑tests מול **Emulator Suite** כדי לבדוק טרנזקציות, Rules והתנהגות בזמן אמת לפני פריסה.



---

## נספח H — `FRONTEND_STRUCTURE.md`

```md
# FRONTEND_STRUCTURE

## Framework
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui

## תיקיות
```

```txt
app/
  (auth)/
    login/page.tsx
    register/page.tsx
    onboarding/
      basics/page.tsx
      location/page.tsx
      photos/page.tsx
      preferences/page.tsx

  (app)/
    matches/page.tsx        # תצוגת כרטיס התאמה + Like/Pass
    chat/
      page.tsx              # רשימת צ'אטים
      [matchId]/page.tsx    # צ'אט ספציפי
    profile/page.tsx        # פרופיל עצמי
    profile/edit/
      bio/page.tsx
      photos/page.tsx
      preferences/page.tsx
    settings/page.tsx

components/
  ui/                       # קומפוננטות בסיס: Button, Input, Card, Avatar
  MatchCard.tsx
  ProfileHeader.tsx
  ChatBubble.tsx
  ConversationStarters.tsx

lib/
  firebase.ts               # web SDK init
  agents.ts                 # קריאות ל-Agent Engine
  api.ts                    # קריאות httpsCallable ל-Functions
  auth.ts                   # עזרי Auth

public/
  logos/
  icons/
  placeholders/
```

## עקרונות
- כל route הוא Server Components + Client Components לפי צורך.
- שימוש ב-shadcn/ui עבור אינפוטים, כפתורים, מודלים.
- טעינה בזמן אמת של הודעות דרך Firestore listener.
- התאמות נטענות דרך Agent (HTTP) + fallback לפיירסטור.
```

---

## נספח I — `DESIGN_SYSTEM.md`

```md
# DESIGN_SYSTEM

## צבעים
- Primary: #E03177 (ורוד)
- Secondary: #3B82F6 (כחול)
- Success: #22C55E
- Danger: #EF4444
- Gray Scale: from #111 to #F5F5F5
- רקעים בהירים, כפתורים עגולים, רדיוסים גדולים.

## טיפוגרפיה
- Font: Inter
- Title: text-2xl font-bold
- Subtitle: text-lg font-semibold
- Body: text-base

## קומפוננטות בסיסיות
- `<Button variant="primary|secondary|ghost" size="sm|md|lg">`
- `<Input type="text|email|password">`
- `<Card>`: רקע לבן, shadow-sm, rounded-xl
- `<Avatar>`: עיגול, גובה/רוחב 48px

## MatchCard
- תמונה ראשית + גלריה
- שם, גיל, עיר
- תגית "התאמה X%"
- כפתורים בתחתית: ❌ , ❤️

## Chat
- בועות:
  - משתמש: רקע ורוד בהיר, ימין
  - התאמה: רקע אפור בהיר, שמאל
- שעה קטנה אפורה מתחת
- אזור קלט: Input + כפתור שליחה

## חוויית רישום
- מסכים מינימליים, טפסים קצרים
- טעינה ברורה (Spinner)
- הודעות שגיאה אדומות קצרות
```

---

## נספח J — Prompt מלא ל-Cursor AI (One‑Shot)

```md
SYSTEM:
אתה בונה אפליקציית היכרויות לפי כל המסמכים בתיקיית /context בלבד.
אין להמציא לוגיקה שלא קיימת. אם יש ספק – פעל לפי המסמכים.

USER:
1. קרא את כל הקבצים בתיקיית /context (אפיון טכני, UX, FRONTEND_STRUCTURE, DESIGN_SYSTEM, JSONSchema, manifest, stubs, rules).
2. צור פרויקט Next.js + TypeScript + Tailwind + shadcn/ui.
3. בנה כל ה‑routes בדיוק כמו ב‑FRONTEND_STRUCTURE.md.
4. כל קריאה ל‑Agents לפי tools.manifest.json.
5. כל קריאה ל‑Firebase לפי firebase.ts (init + auth + Firestore + Storage + FCM).
6. Message moderation לפי moderateText לפני שמירה בפיירסטור.
7. אכוף "קשר אחד בכל פעם" לפי createOrQueueMatch + getActiveMatch.
8. עמד ב‑DESIGN_SYSTEM.md עבור כל קומפוננטה.
9. אין לשנות סכמות, שמות שדות או טיפוסים שלא קיימים ב‑JSONSchema.
10. הפק קוד מלא, תקין, מרובד לתיקיות, עם הערות ברורות.
11. לאחר יצירת הפרויקט – הרץ בדיקות Jest לפי נספח G.
12. לאחר שהבדיקות עוברות – הכן Dockerfile ו‑vercel.json לפריסה.

ASSISTANT:
בנה את כל הקוד מאפס, שלם, בלי להשאיר TODO.
אם חסר מידע – הסתמך רק על החומרים ב‑/context.
```

