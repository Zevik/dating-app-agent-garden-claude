'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import {
  User,
  MapPin,
  Calendar,
  Heart,
  Edit,
  Settings,
  LogOut,
  Camera,
  Info,
} from 'lucide-react'

interface UserProfile {
  userId: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  city: string
  bio: string
  interests: string[]
  photos: string[]
  plan: 'free' | 'premium' | 'vip'
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/login')
      return
    }

    const loadProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid))

        if (!userDoc.exists()) {
          setError('פרופיל לא נמצא')
          setLoading(false)
          return
        }

        const userData = userDoc.data() as UserProfile
        setProfile(userData)
      } catch (err) {
        console.error('Error loading profile:', err)
        setError('שגיאה בטעינת הפרופיל')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (err) {
      console.error('Error signing out:', err)
      setError('שגיאה בהתנתקות')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען פרופיל...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="p-6 max-w-md w-full text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">שגיאה</h2>
          <p className="text-muted-foreground mb-4">{error || 'פרופיל לא נמצא'}</p>
          <Button onClick={() => router.push('/matches')} className="w-full">
            חזור לדף הבית
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50" dir="rtl">
      <div className="max-w-2xl mx-auto p-4">
        {/* כותרת */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">הפרופיל שלי</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/settings')}
              title="הגדרות"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              title="התנתק"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* תמונות פרופיל */}
        <Card className="p-6 mb-4 bg-white">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              התמונות שלי
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {profile.photos && profile.photos.length > 0 ? (
              profile.photos.map((photo, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img
                    src={photo}
                    alt={`תמונה ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>אין תמונות</p>
              </div>
            )}
          </div>

          {profile.photos && profile.photos.length < 6 && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => router.push('/profile/edit/photos')}
            >
              <Camera className="h-4 w-4 ml-2" />
              הוסף תמונות
            </Button>
          )}
        </Card>

        {/* מידע בסיסי */}
        <Card className="p-6 mb-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              מידע אישי
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/profile/edit/bio')}
            >
              <Edit className="h-4 w-4 ml-1" />
              ערוך
            </Button>
          </div>

          <div className="space-y-4">
            {/* שם */}
            <div>
              <h3 className="text-2xl font-bold text-foreground">{profile.name}</h3>
            </div>

            {/* גיל ומיקום */}
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{profile.age} שנים</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{profile.city}</span>
              </div>
            </div>

            {/* ביוגרפיה */}
            {profile.bio && (
              <div>
                <h4 className="font-semibold mb-1 text-sm text-muted-foreground">
                  אודות
                </h4>
                <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
          </div>
        </Card>

        {/* תחומי עניין */}
        <Card className="p-6 mb-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              תחומי עניין
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/profile/edit/interests')}
            >
              <Edit className="h-4 w-4 ml-1" />
              ערוך
            </Button>
          </div>

          {profile.interests && profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>הוסף תחומי עניין כדי למצוא התאמות טובות יותר</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/profile/edit/interests')}
              >
                הוסף תחומי עניין
              </Button>
            </div>
          )}
        </Card>

        {/* מנוי */}
        <Card className="p-6 mb-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {profile.plan === 'vip' && '👑 מנוי VIP'}
                {profile.plan === 'premium' && '⭐ מנוי Premium'}
                {profile.plan === 'free' && 'מנוי חינמי'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {profile.plan === 'free' && 'שדרג כדי לקבל יותר התאמות והטבות'}
                {profile.plan === 'premium' && 'תודה שאתה מנוי Premium!'}
                {profile.plan === 'vip' && 'תודה שאתה מנוי VIP!'}
              </p>
            </div>
            {profile.plan === 'free' && (
              <Button variant="default" onClick={() => router.push('/subscription')}>
                שדרג
              </Button>
            )}
          </div>
        </Card>

        {/* כפתורים */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            variant="default"
            className="w-full"
            onClick={() => router.push('/profile/edit/bio')}
          >
            <Edit className="h-4 w-4 ml-2" />
            ערוך פרופיל
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-4 w-4 ml-2" />
            הגדרות
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/matches')}
          >
            חזור לחיפוש
          </Button>
          <Button variant="danger" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 ml-2" />
            התנתק
          </Button>
        </div>
      </div>
    </div>
  )
}
