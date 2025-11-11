'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { signOut, deleteUser } from 'firebase/auth'
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowRight,
  Bell,
  Shield,
  Trash2,
  LogOut,
  Save,
  AlertCircle,
  Check,
} from 'lucide-react'

interface UserPreferences {
  ageMin: number
  ageMax: number
  maxDistanceKm: number
}

interface NotificationSettings {
  newMatches: boolean
  newMessages: boolean
  matchReminders: boolean
}

export default function SettingsPage() {
  const router = useRouter()

  const [preferences, setPreferences] = useState<UserPreferences>({
    ageMin: 18,
    ageMax: 99,
    maxDistanceKm: 50,
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newMatches: true,
    newMessages: true,
    matchReminders: true,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/login')
      return
    }

    const loadSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid))

        if (!userDoc.exists()) {
          setError('הגדרות לא נמצאו')
          setLoading(false)
          return
        }

        const userData = userDoc.data()

        // טעינת העדפות חיפוש
        if (userData.prefs) {
          setPreferences({
            ageMin: userData.prefs.ageMin || 18,
            ageMax: userData.prefs.ageMax || 99,
            maxDistanceKm: userData.prefs.maxDistanceKm || 50,
          })
        }

        // טעינת הגדרות התראות
        if (userData.notifications) {
          setNotifications(userData.notifications)
        }
      } catch (err) {
        console.error('Error loading settings:', err)
        setError('שגיאה בטעינת ההגדרות')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [router])

  const handleSavePreferences = async () => {
    if (!auth.currentUser) return

    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        prefs: preferences,
      })

      setSuccessMessage('העדפות החיפוש נשמרו בהצלחה')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError('שגיאה בשמירת העדפות החיפוש')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    if (!auth.currentUser) return

    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        notifications,
      })

      setSuccessMessage('הגדרות התראות נשמרו בהצלחה')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error saving notifications:', err)
      setError('שגיאה בשמירת הגדרות התראות')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (err) {
      console.error('Error signing out:', err)
      setError('שגיאה בהתנתקות')
    }
  }

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return
    if (deleteConfirmText !== 'מחק') {
      setError('יש להקליד "מחק" לאישור')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // מחיקת נתוני המשתמש מ-Firestore
      await deleteDoc(doc(db, 'users', auth.currentUser.uid))

      // מחיקת חשבון ה-Auth
      await deleteUser(auth.currentUser)

      router.push('/login')
    } catch (err) {
      console.error('Error deleting account:', err)
      setError('שגיאה במחיקת החשבון. אנא נסה שוב או צור קשר עם התמיכה.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען הגדרות...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50" dir="rtl">
      <div className="max-w-2xl mx-auto p-4">
        {/* כותרת */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push('/profile')}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-bold text-foreground">הגדרות</h1>
        </div>

        {/* הודעות */}
        {error && (
          <Card className="p-4 mb-4 bg-destructive/10 border-destructive">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </Card>
        )}

        {successMessage && (
          <Card className="p-4 mb-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <Check className="h-5 w-5" />
              <p className="font-medium">{successMessage}</p>
            </div>
          </Card>
        )}

        {/* העדפות חיפוש */}
        <Card className="p-6 mb-4 bg-white">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            העדפות חיפוש
          </h2>

          <div className="space-y-4">
            {/* טווח גילאים */}
            <div>
              <Label className="text-right block mb-2">טווח גילאים</Label>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={preferences.ageMin}
                    onChange={(e) =>
                      setPreferences({ ...preferences, ageMin: Number(e.target.value) })
                    }
                    min={18}
                    max={preferences.ageMax - 1}
                    className="text-right"
                    dir="rtl"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">גיל מינימום</p>
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={preferences.ageMax}
                    onChange={(e) =>
                      setPreferences({ ...preferences, ageMax: Number(e.target.value) })
                    }
                    min={preferences.ageMin + 1}
                    max={99}
                    className="text-right"
                    dir="rtl"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">גיל מקסימום</p>
                </div>
              </div>
            </div>

            {/* מרחק מקסימלי */}
            <div>
              <Label className="text-right block mb-2">
                מרחק מקסימלי: {preferences.maxDistanceKm} ק"מ
              </Label>
              <Input
                type="range"
                value={preferences.maxDistanceKm}
                onChange={(e) =>
                  setPreferences({ ...preferences, maxDistanceKm: Number(e.target.value) })
                }
                min={1}
                max={200}
                step={5}
                className="w-full"
                dir="rtl"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>200 ק"מ</span>
                <span>1 ק"מ</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full mt-6"
          >
            <Save className="h-4 w-4 ml-2" />
            {saving ? 'שומר...' : 'שמור העדפות'}
          </Button>
        </Card>

        {/* הגדרות התראות */}
        <Card className="p-6 mb-4 bg-white">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            הגדרות התראות
          </h2>

          <div className="space-y-4">
            {/* התאמות חדשות */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">התאמות חדשות</Label>
                <p className="text-sm text-muted-foreground">
                  קבל התראה כשיש התאמה חדשה
                </p>
              </div>
              <button
                onClick={() =>
                  setNotifications({ ...notifications, newMatches: !notifications.newMatches })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.newMatches ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.newMatches ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            {/* הודעות חדשות */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">הודעות חדשות</Label>
                <p className="text-sm text-muted-foreground">
                  קבל התראה כשמגיעה הודעה חדשה
                </p>
              </div>
              <button
                onClick={() =>
                  setNotifications({ ...notifications, newMessages: !notifications.newMessages })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.newMessages ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.newMessages ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            {/* תזכורות */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">תזכורות התאמות</Label>
                <p className="text-sm text-muted-foreground">
                  קבל תזכורות על התאמות פעילות
                </p>
              </div>
              <button
                onClick={() =>
                  setNotifications({
                    ...notifications,
                    matchReminders: !notifications.matchReminders,
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.matchReminders ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.matchReminders ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>
          </div>

          <Button
            onClick={handleSaveNotifications}
            disabled={saving}
            className="w-full mt-6"
          >
            <Save className="h-4 w-4 ml-2" />
            {saving ? 'שומר...' : 'שמור הגדרות התראות'}
          </Button>
        </Card>

        {/* פעולות חשבון */}
        <Card className="p-6 mb-4 bg-white">
          <h2 className="text-xl font-semibold mb-4">ניהול חשבון</h2>

          <div className="space-y-3">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-center"
            >
              <LogOut className="h-4 w-4 ml-2" />
              התנתק
            </Button>

            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="danger"
              className="w-full justify-center"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              מחק חשבון
            </Button>
          </div>
        </Card>

        {/* כפתור חזרה */}
        <Button
          onClick={() => router.push('/profile')}
          variant="outline"
          className="w-full"
        >
          חזור לפרופיל
        </Button>
      </div>

      {/* דיאלוג אישור מחיקת חשבון */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
              <h3 className="text-2xl font-bold mb-2">מחיקת חשבון</h3>
              <p className="text-muted-foreground mb-4">
                פעולה זו תמחק לצמיתות את כל הנתונים שלך, כולל התאמות, הודעות ופרופיל.
                פעולה זו אינה ניתנת לביטול.
              </p>
            </div>

            <div className="mb-6">
              <Label className="block mb-2 text-right">
                להמשך, הקלד <span className="font-bold">מחק</span> בתיבה למטה:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='הקלד "מחק"'
                className="text-right"
                dir="rtl"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                  setError(null)
                }}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                ביטול
              </Button>
              <Button
                onClick={handleDeleteAccount}
                variant="danger"
                className="flex-1"
                disabled={deleteConfirmText !== 'מחק' || saving}
              >
                {saving ? 'מוחק...' : 'מחק חשבון'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
