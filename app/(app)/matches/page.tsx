'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { queryCandidates, scoreCandidate, createOrQueueMatch, Candidate } from '@/lib/api'
import { MatchCard } from '@/components/MatchCard'
import { doc, setDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function MatchesPage() {
  const router = useRouter()
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/login')
      return
    }
    loadCandidates()
  }, [router])

  const loadCandidates = async () => {
    if (!auth.currentUser) return

    try {
      setLoading(true)
      const result = await queryCandidates(auth.currentUser.uid, {
        limit: 10,
      })

      if (result.candidates.length > 0) {
        setCandidates(result.candidates)
        setCurrentCandidate(result.candidates[0])
      } else {
        setCurrentCandidate(null)
      }
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!currentCandidate || !auth.currentUser || processing) return

    setProcessing(true)
    try {
      // שמירת Like ב-Firestore
      await setDoc(
        doc(collection(db, 'likes', auth.currentUser.uid, 'targets'), currentCandidate.userId),
        {
          value: 'like',
          createdAt: new Date(),
        }
      )

      // ניסיון ליצירת התאמה
      try {
        await createOrQueueMatch(auth.currentUser.uid, currentCandidate.userId, 0.75)
        // אם הצליח - יש התאמה הדדית!
        alert(`יש התאמה! ${currentCandidate.name} גם אוהב אותך!`)
      } catch (error) {
        // אין התאמה הדדית או שהמשתמש כבר יש לו match פעיל
        console.log('No mutual match yet or user already has active match')
      }

      moveToNextCandidate()
    } catch (error) {
      console.error('Error handling like:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handlePass = async () => {
    if (!currentCandidate || !auth.currentUser || processing) return

    setProcessing(true)
    try {
      // שמירת Pass ב-Firestore
      await setDoc(
        doc(collection(db, 'likes', auth.currentUser.uid, 'targets'), currentCandidate.userId),
        {
          value: 'pass',
          createdAt: new Date(),
        }
      )

      moveToNextCandidate()
    } catch (error) {
      console.error('Error handling pass:', error)
    } finally {
      setProcessing(false)
    }
  }

  const moveToNextCandidate = () => {
    const currentIndex = candidates.indexOf(currentCandidate!)
    if (currentIndex < candidates.length - 1) {
      setCurrentCandidate(candidates[currentIndex + 1])
    } else {
      // נגמרו המועמדים - טען עוד
      loadCandidates()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">מחפש התאמות...</p>
        </div>
      </div>
    )
  }

  if (!currentCandidate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">אין עוד התאמות כרגע</h2>
          <p className="text-muted-foreground mb-4">בדוק שוב מאוחר יותר</p>
          <button
            onClick={loadCandidates}
            className="text-primary hover:underline"
          >
            טען מחדש
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <MatchCard
          candidate={currentCandidate}
          score={0.85}
          onLike={handleLike}
          onPass={handlePass}
        />
      </div>
    </div>
  )
}
