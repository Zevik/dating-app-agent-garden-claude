'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setLoading(true)

    try {
      // יצירת משתמש ב-Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // יצירת מסמך משתמש ב-Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: { active: true, suspended: false },
        plan: 'free',
      })

      // מעבר לאונבורדינג
      router.push('/onboarding/basics')
    } catch (err: any) {
      console.error('Register error:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('כתובת האימייל כבר רשומה במערכת')
      } else {
        setError('שגיאה ביצירת החשבון. נסה שוב')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            הצטרפות לאפליקציה
          </CardTitle>
          <CardDescription>
            צור חשבון חדש כדי להתחיל להכיר אנשים חדשים
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                placeholder="לפחות 6 תווים"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">אימות סיסמה</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="הזן שוב את הסיסמה"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-danger text-sm text-center">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'יוצר חשבון...' : 'הרשמה'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              כבר יש לך חשבון?{' '}
              <Link href="/login" className="text-primary hover:underline">
                התחבר כאן
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
