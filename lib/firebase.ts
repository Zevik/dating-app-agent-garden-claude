import { initializeApp, getApps } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getMessaging, isSupported } from 'firebase/messaging'

// תצורת Firebase - להחליף עם ערכים אמיתיים בפרודקשן
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
}

// אתחול Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// שירותי Firebase
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'us-central1')

// FCM - רק בדפדפן
let messaging: ReturnType<typeof getMessaging> | null = null
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app)
    }
  })
}
export { messaging }

// התחברות ל-Emulator במצב פיתוח
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'

  if (useEmulator) {
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
      connectFirestoreEmulator(db, '127.0.0.1', 8080)
      connectStorageEmulator(storage, '127.0.0.1', 9199)
      connectFunctionsEmulator(functions, '127.0.0.1', 5001)
      console.log('✅ מחובר ל-Firebase Emulator')
    } catch (error) {
      console.warn('Emulator already initialized')
    }
  }
}

export default app
