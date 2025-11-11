'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingPreferencesPage() {
  const router = useRouter()
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(50)
  const [maxDistanceKm, setMaxDistanceKm] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/login')
    }
  }, [router])

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!auth.currentUser) {
      setError('משתמש לא מחובר')
      return
    }

    // בדיקות תקינות
    if (ageMin < 18) {
      setError('גיל מינימלי לא יכול להיות נמוך מ-18')
      return
    }

    if (ageMax > 120) {
      setError('גיל מקסימלי לא תקין')
      return
    }

    if (ageMin > ageMax) {
      setError('גיל מינימלי לא יכול להיות גבוה מגיל מקסימלי')
      return
    }

    if (maxDistanceKm < 1) {
      setError('מרחק מינימלי הוא 1 ק"מ')
      return
    }

    if (maxDistanceKm > 500) {
      setError('מרחק מקסימלי הוא 500 ק"מ')
      return
    }

    setLoading(true)

    try {
      // שמירת ההעדפות תחת user.prefs
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        prefs: {
          ageMin,
          ageMax,
          maxDistanceKm,
        },
        onboardingCompleted: true,
        updatedAt: new Date(),
      })

      // מעבר לדף ההתאמות
      router.push('/matches')
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError('שגיאה בשמירת ההעדפות. נסה שוב')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">העדפות חיפוש</CardTitle>
          <CardDescription>מי תרצה לפגוש?</CardDescription>
          <div className="mt-4 flex gap-2 justify-center">
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-primary rounded-full" />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleNext} className="space-y-6">
            {/* טווח גילאים */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">טווח גילאים</Label>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="ageMin" className="text-sm">גיל מינימלי</Label>
                  <span className="text-sm font-medium text-primary">{ageMin}</span>
                </div>
                <Input
                  id="ageMin"
                  type="range"
                  min="18"
                  max="100"
                  value={ageMin}
                  onChange={(e) => setAgeMin(Number(e.target.value))}
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="ageMax" className="text-sm">גיל מקסימלי</Label>
                  <span className="text-sm font-medium text-primary">{ageMax}</span>
                </div>
                <Input
                  id="ageMax"
                  type="range"
                  min="18"
                  max="100"
                  value={ageMax}
                  onChange={(e) => setAgeMax(Number(e.target.value))}
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div className="text-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                מחפש/ת בין גיל {ageMin} ל-{ageMax}
              </div>
            </div>

            {/* מרחק מקסימלי */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">מרחק מקסימלי</Label>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="maxDistance" className="text-sm">עד כמה ק"מ?</Label>
                  <span className="text-sm font-medium text-primary">{maxDistanceKm} ק"מ</span>
                </div>
                <Input
                  id="maxDistance"
                  type="range"
                  min="1"
                  max="200"
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div className="text-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                מחפש/ת במרחק של עד {maxDistanceKm} ק"מ ממך
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/onboarding/photos')}
                disabled={loading}
              >
                חזרה
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'שומר...' : 'סיום'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
