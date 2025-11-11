'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingLocationPage() {
  const router = useRouter()
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth.currentUser) router.push('/login')
  }, [router])

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser) return

    setLoading(true)
    try {
      const interestsArray = interests.split(',').map(i => i.trim()).filter(i => i.length > 0)

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        city,
        bio: bio.slice(0, 500),
        interests: interestsArray.slice(0, 25),
        location: { lat: 0, lng: 0 }, // יש לעדכן עם geolocation אמיתי
        updatedAt: new Date(),
      })

      router.push('/onboarding/photos')
    } catch (err) {
      console.error(err)
      setError('שגיאה בשמירת הנתונים')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">ספר לנו עליך</CardTitle>
          <CardDescription>מה מיוחד בך?</CardDescription>
          <div className="mt-4 flex gap-2 justify-center">
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-gray-200 rounded-full" />
            <div className="h-2 w-16 bg-gray-200 rounded-full" />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleNext} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">עיר</Label>
              <Input
                id="city"
                placeholder="תל אביב, ירושלים..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">קצת על עצמך (עד 500 תווים)</Label>
              <textarea
                id="bio"
                className="flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="ספר על עצמך, מה אתה אוהב לעשות..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interests">תחומי עניין (מופרד בפסיקים)</Label>
              <Input
                id="interests"
                placeholder="טיולים, מוזיקה, קולנוע..."
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <div className="text-danger text-sm text-center">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'שומר...' : 'המשך'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
