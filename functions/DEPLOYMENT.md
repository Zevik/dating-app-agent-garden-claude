# מדריך פריסה - Cloud Functions

## דרישות מקדימות

1. **Node.js 18** או גרסה חדשה יותר
2. **Firebase CLI** מותקן גלובלית:
   ```bash
   npm install -g firebase-tools
   ```
3. **חשבון Firebase** עם פרויקט מוגדר
4. **Firebase Admin SDK** credentials

## שלב 1: התקנת תלויות

```bash
cd functions
npm install
```

## שלב 2: הגדרת Firebase

אם טרם עשית זאת, התחבר ל-Firebase:

```bash
firebase login
```

אתחל את הפרויקט (אם טרם עשית):

```bash
firebase init functions
```

בחר:
- Use an existing project (או צור חדש)
- TypeScript
- ESLint (אופציונלי)
- Install dependencies now

## שלב 3: בדיקת הקוד מקומית

הרץ בדיקות:

```bash
npm test
```

בנה את הפרויקט:

```bash
npm run build
```

הרץ ב-emulator מקומי:

```bash
npm run serve
```

## שלב 4: עדכון URLs ב-manifest

ערוך את הקובץ `tools.manifest.json` והחלף:
- `REGION` - לדוגמה: `us-central1`, `europe-west1`
- `PROJECT_ID` - מזהה הפרויקט שלך ב-Firebase

דוגמה:
```
https://us-central1-my-dating-app.cloudfunctions.net/readUserProfile
```

## שלב 5: פריסה לייצור

פרוס את כל הפונקציות:

```bash
npm run deploy
```

או פרוס פונקציה ספציפית:

```bash
firebase deploy --only functions:readUserProfile
firebase deploy --only functions:createOrQueueMatch
```

## שלב 6: רישום ב-Agent Garden

1. העתק את הקבצים `tools.schema.json` ו-`tools.manifest.json`
2. העלה אותם ל-Agent Garden Console
3. וודא שכל ה-URLs תקינים
4. בדוק כל Tool באמצעות Playground

## שלב 7: הגדרת משתני סביבה (אופציונלי)

אם יש צורך במשתני סביבה (API keys, etc.):

```bash
firebase functions:config:set someservice.key="THE API KEY"
```

גישה לערכים בקוד:

```typescript
const apiKey = functions.config().someservice.key;
```

## שלב 8: ניטור ולוגים

צפה בלוגים בזמן אמת:

```bash
npm run logs
```

או דרך Firebase Console:
https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs

## Troubleshooting

### שגיאת Authentication
וודא ש-Firebase Admin SDK מאותחל נכון ב-`index.ts`:
```typescript
admin.initializeApp();
```

### שגיאת Permissions
וודא שה-Service Account של Cloud Functions יש לו הרשאות:
- Cloud Datastore User
- Firebase Admin

### Timeout
אם פונקציות נכשלות עם timeout, הגדל את הזמן:
```typescript
export const myFunction = functions
  .runWith({ timeoutSeconds: 300 })
  .https.onCall(async (data, context) => {
    // ...
  });
```

### Cold Start
לביצועים טובים יותר, שקול:
- Firebase Functions Gen 2
- Min instances > 0 לפונקציות קריטיות
- Firestore connection pooling

## Security Checklist

- ✅ כל הפונקציות בודקות `context.auth`
- ✅ ולידציה מלאה של קלט
- ✅ Firestore Security Rules מוגדרות
- ✅ Rate limiting הופעל
- ✅ Secrets לא בקוד (use functions:config)
- ✅ CORS מוגדר נכון
- ✅ Error messages לא חושפים מידע רגיש

## Performance Tips

1. **Batch Reads**: השתמש ב-`getAll()` במקום loops של `get()`
2. **Caching**: שמור תוצאות נפוצות ב-memory או Redis
3. **Indexes**: וודא שיש אינדקסים ב-Firestore לכל query
4. **Pagination**: השתמש ב-cursors ל-queries גדולים
5. **Connection Reuse**: Firebase Admin SDK עושה זאת אוטומטית

## עדכונים

לעדכן את התלויות:

```bash
npm update
npm audit fix
```

## גיבוי

לפני כל פריסה גדולה:

```bash
# Export Firestore
gcloud firestore export gs://YOUR_BUCKET/backup-$(date +%Y%m%d)

# Backup functions code
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

---

צוות הפיתוח
תאריך עדכון אחרון: נובמבר 2025
