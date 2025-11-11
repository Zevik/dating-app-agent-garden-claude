'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore'
import { storeMessage, closeMatch, extractSharedInterests } from '@/lib/api'
import { ChatBubble } from '@/components/ChatBubble'
import { ConversationStarters } from '@/components/ConversationStarters'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Send, X, AlertCircle } from 'lucide-react'

interface Message {
  id: string
  from: string
  text: string
  timestamp: Date
  status?: 'sent' | 'delivered' | 'read'
}

interface PartnerInfo {
  name: string
  photo?: string
  age?: number
  city?: string
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.matchId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null)
  const [openingLines, setOpeningLines] = useState<Array<{ text: string; tag?: string }>>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // גלילה אוטומטית למטה
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/login')
      return
    }

    if (!matchId) {
      setError('מזהה שיחה לא תקין')
      return
    }

    const loadChatData = async () => {
      try {
        setLoading(true)
        setError(null)

        // טעינת פרטי ה-match
        const matchDoc = await getDoc(doc(db, 'matches', matchId))
        if (!matchDoc.exists()) {
          setError('שיחה לא נמצאה')
          setLoading(false)
          return
        }

        const matchData = matchDoc.data()
        if (matchData.state !== 'active') {
          setError('שיחה זו נסגרה')
          setLoading(false)
          return
        }

        const participants = matchData.participants as string[]
        const partnerId = participants.find((id) => id !== auth.currentUser!.uid)

        if (!partnerId) {
          setError('שגיאה בטעינת פרטי השיחה')
          setLoading(false)
          return
        }

        // טעינת פרטי השותף
        const partnerDoc = await getDoc(doc(db, 'users', partnerId))
        const partnerData = partnerDoc.data()

        if (partnerData) {
          setPartnerInfo({
            name: partnerData.name || 'משתמש',
            photo: partnerData.photos?.[0],
            age: partnerData.age,
            city: partnerData.city,
          })
        }

        // טעינת פתיחי שיחה מומלצים
        if (messages.length === 0) {
          try {
            const sharedInterests = await extractSharedInterests(
              auth.currentUser!.uid,
              partnerId
            )
            if (sharedInterests.shared && sharedInterests.shared.length > 0) {
              const lines = sharedInterests.shared.slice(0, 3).map((interest) => ({
                text: `היי! ראיתי שגם אתה מתעניין ב${interest}, זה מעניין!`,
                tag: interest,
              }))
              setOpeningLines(lines)
            } else {
              setOpeningLines([
                { text: 'היי! מה שלומך?', tag: 'ברירת מחדל' },
                { text: 'שמחה להכיר, ספר לי קצת על עצמך', tag: 'הכרות' },
                { text: 'איזה כיף שהתאמנו! מה התוכניות שלך לסופ"ש?', tag: 'שיחת חולין' },
              ])
            }
          } catch (err) {
            console.error('Error loading opening lines:', err)
            setOpeningLines([
              { text: 'היי! מה שלומך?', tag: 'ברירת מחדל' },
            ])
          }
        }

        // האזנה להודעות בזמן אמת
        const messagesQuery = query(
          collection(db, 'messages', matchId, 'items'),
          orderBy('timestamp', 'asc')
        )

        const unsubscribe = onSnapshot(
          messagesQuery,
          (snapshot) => {
            const loadedMessages: Message[] = snapshot.docs.map((doc) => {
              const data = doc.data()
              return {
                id: doc.id,
                from: data.from,
                text: data.text,
                timestamp: data.timestamp?.toDate() || new Date(),
                status: data.status || 'sent',
              }
            })

            setMessages(loadedMessages)
            setLoading(false)

            // אם יש הודעות, הסתר פתיחי שיחה
            if (loadedMessages.length > 0) {
              setOpeningLines([])
            }
          },
          (err) => {
            console.error('Error loading messages:', err)
            setError('שגיאה בטעינת ההודעות')
            setLoading(false)
          }
        )

        return () => unsubscribe()
      } catch (err) {
        console.error('Error in loadChatData:', err)
        setError('שגיאה בטעינת השיחה')
        setLoading(false)
      }
    }

    loadChatData()
  }, [matchId, router])

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending || !auth.currentUser) return

    const textToSend = messageText.trim()
    setMessageText('')
    setSending(true)

    try {
      await storeMessage(matchId, auth.currentUser.uid, textToSend)
      // ההודעה תתווסף אוטומטית דרך ה-onSnapshot
    } catch (err) {
      console.error('Error sending message:', err)
      setError('שגיאה בשליחת ההודעה')
      setMessageText(textToSend) // החזר את הטקסט
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleSelectOpeningLine = (text: string) => {
    setMessageText(text)
    setOpeningLines([])
    inputRef.current?.focus()
  }

  const handleCloseMatch = async () => {
    if (!auth.currentUser) return

    try {
      await closeMatch(matchId, 'user_request')
      router.push('/chat')
    } catch (err) {
      console.error('Error closing match:', err)
      setError('שגיאה בסגירת השיחה')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען שיחה...</p>
        </div>
      </div>
    )
  }

  if (error && !partnerInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">שגיאה</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push('/chat')} className="w-full">
            חזור לרשימת הצ'אטים
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl">
      {/* כותרת השיחה */}
      <div className="bg-white border-b border-border p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => router.push('/chat')}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          <Avatar className="h-10 w-10">
            {partnerInfo?.photo ? (
              <img
                src={partnerInfo.photo}
                alt={partnerInfo.name}
                className="object-cover w-full h-full rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold">
                {partnerInfo?.name?.charAt(0) || '?'}
              </div>
            )}
          </Avatar>

          <div className="flex-1">
            <h2 className="font-semibold text-lg">{partnerInfo?.name || 'משתמש'}</h2>
            {partnerInfo?.city && partnerInfo?.age && (
              <p className="text-sm text-muted-foreground">
                {partnerInfo.age}, {partnerInfo.city}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowCloseConfirm(true)}
          className="p-2 hover:bg-destructive/10 text-destructive rounded-full transition-colors"
          title="סיום שיחה"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* תוכן השיחה */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-pink-50/30 to-blue-50/30">
        <div className="max-w-3xl mx-auto">
          {/* פתיחי שיחה מומלצים */}
          {openingLines.length > 0 && (
            <ConversationStarters
              openingLines={openingLines}
              onSelect={handleSelectOpeningLine}
            />
          )}

          {/* הודעות */}
          {messages.length === 0 && openingLines.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">התחל שיחה עם {partnerInfo?.name}</p>
            </div>
          )}

          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              text={message.text}
              isOwn={message.from === auth.currentUser?.uid}
              timestamp={message.timestamp}
              status={message.status}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* שורת קלט */}
      <div className="bg-white border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            ref={inputRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="הקלד הודעה..."
            disabled={sending}
            className="flex-1 text-right"
            dir="rtl"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sending}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <p className="text-destructive text-sm mt-2 text-center">{error}</p>
        )}
      </div>

      {/* דיאלוג אישור סגירת שיחה */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-2">סיום שיחה?</h3>
            <p className="text-muted-foreground mb-6">
              האם אתה בטוח שברצונך לסיים את השיחה עם {partnerInfo?.name}? פעולה זו
              אינה ניתנת לביטול.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCloseConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={handleCloseMatch}
                variant="danger"
                className="flex-1"
              >
                סיים שיחה
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
