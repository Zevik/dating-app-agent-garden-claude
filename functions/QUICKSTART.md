# Quick Start - התחלה מהירה 🚀

מדריך מהיר להתחיל לעבוד עם Cloud Functions תוך 5 דקות.

## שלב 1: התקנה (2 דקות)

```bash
cd functions
npm install
```

## שלב 2: בדיקת הקוד (1 דקה)

```bash
# הרץ את כל הבדיקות
npm test

# בנה את הפרויקט
npm run build
```

## שלב 3: הרצה מקומית (2 דקות)

```bash
# הרץ Firebase Emulator
npm run serve
```

הפונקציות יהיו זמינות ב:
- http://localhost:5001/YOUR_PROJECT/us-central1/readUserProfile
- http://localhost:5001/YOUR_PROJECT/us-central1/queryCandidates
- וכו'...

## בדיקה ידנית

### קריאה לפונקציה מקומית

```bash
# דרך Firebase CLI
firebase functions:shell

# בקונסול:
readUserProfile({userId: 'test123'})
moderateText({text: 'שלום עולם'})
```

### קריאה דרך HTTP

```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/moderateText \
  -H "Content-Type: application/json" \
  -d '{"data": {"text": "שלום עולם"}}'
```

## פריסה לייצור

```bash
# התחבר ל-Firebase
firebase login

# פרוס
npm run deploy
```

## בדיקת Tools ב-Agent Garden Playground

1. פתח את Agent Garden Console
2. העלה `tools.schema.json` ו-`tools.manifest.json`
3. עדכן URLs (החלף REGION ו-PROJECT_ID)
4. בדוק כל Tool:

### דוגמה: moderateText
```json
{
  "text": "שלום, איך הולך?",
  "context": "message"
}
```

**תוצאה צפויה:**
```json
{
  "allowed": true,
  "labels": []
}
```

### דוגמה: scoreCandidate
```json
{
  "sourceUser": "user123",
  "candidate": {
    "userId": "user456",
    "age": 28,
    "interests": ["music", "travel"],
    "distanceKm": 5,
    "photos": ["url1", "url2"]
  }
}
```

**תוצאה צפויה:**
```json
{
  "score": {
    "value": 0.85,
    "reasons": ["2 תחומי עניין משותפים", "קרוב גיאוגרפית", "פרופיל עם תמונות"]
  }
}
```

## בעיות נפוצות

### "Error: Could not load the default credentials"
פתרון: הגדר GOOGLE_APPLICATION_CREDENTIALS:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
```

### "Error: Port 5001 is already in use"
פתרון: שנה את הפורט:
```bash
firebase emulators:start --only functions --port=5002
```

### "Error: Cannot find module 'firebase-admin'"
פתרון:
```bash
cd functions
npm install
```

## Next Steps

1. ✅ הרץ בדיקות - `npm test`
2. ✅ בדוק מקומית - `npm run serve`
3. ✅ פרוס לייצור - `npm run deploy`
4. ✅ רשום ב-Agent Garden
5. ✅ צור Agent ראשון!

## עזרה נוספת

- 📖 [README.md](./README.md) - תיעוד מלא
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - מדריך פריסה מפורט
- 📋 [tools.schema.json](./tools.schema.json) - סכמות JSONSchema
- 🔧 [tools.manifest.json](./tools.manifest.json) - רישום Tools

---

**זמן כולל: ~5 דקות** ⏱️

**מוכן? בוא נתחיל!** 💪
