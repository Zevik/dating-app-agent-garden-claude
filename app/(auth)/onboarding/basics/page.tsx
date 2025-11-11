'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingBasicsPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
  const [seeking, setSeeking] = useState<'male' | 'female' | 'other'>('female')
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

    // בדיקת גיל (לפחות 18)
    const birthDate = new Date(birthdate)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 18) {
      setError('עליך להיות מעל גיל 18 כדי להשתמש באפליקציה')
      return
    }

    setLoading(true)

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name,
        birthdate: birthDate,
        gender,
        seeking,
        updatedAt: new Date(),
      })

      router.push('/onboarding/location')
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('שגיאה בשמירת הנתונים. נסה שוב')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">בואו נכיר</CardTitle>
          <CardDescription>ספר לנו קצת על עצמך</CardDescription>
          <div className="mt-4 flex gap-2 justify-center">
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-gray-200 rounded-full" />
            <div className="h-2 w-16 bg-gray-200 rounded-full" />
            <div className="h-2 w-16 bg-gray-200 rounded-full" />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleNext} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם פרטי</Label>
              <Input
                id="name"
                type="text"
                placeholder="השם שלך"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate">תאריך לידה</Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>מגדר</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={gender === 'male' ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => setGender('male')}
                  disabled={loading}
                >
                  זכר
                </Button>
                <Button
                  type="button"
                  variant={gender === 'female' ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => setGender('female')}
                  disabled={loading}
                >
                  נקבה
                </Button>
                <Button
                  type="button"
                  variant={gender === 'other' ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => setGender('other')}
                  disabled={loading}
                >
                  אחר
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>מחפש/ת</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={seeking === 'male' ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => setSeeking('male')}
                  disabled={loading}
                >
                  זכר
                </Button>
                <Button
                  type="button"
                  variant={seeking === 'female' ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => setSeeking('female')}
                  disabled={loading}
                >
                  נקבה
                </Button>
                <Button
                  type="button"
                  variant={seeking === 'other' ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => setSeeking('other')}
                  disabled={loading}
                >
                  אחר
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-danger text-sm text-center">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'שומר...' : 'המשך'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
