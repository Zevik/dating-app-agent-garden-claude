'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
import { MessageCircle, ArrowRight } from 'lucide-react'

interface ChatItem {
  matchId: string
  partnerId: string
  partnerName: string
  partnerPhoto?: string
  lastMessage?: string
  lastMessageTime?: Date
  unreadCount?: number
}

export default function ChatListPage() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/login')
      return
    }

    const loadChats = async () => {
      try {
        setLoading(true)
        setError(null)

        // שליפת matches פעילים של המשתמש
        const matchesQuery = query(
          collection(db, 'matches'),
          where('participants', 'array-contains', auth.currentUser!.uid),
          where('state', '==', 'active')
        )

        // האזנה לשינויים בזמן אמת
        const unsubscribe = onSnapshot(
          matchesQuery,
          async (snapshot) => {
            const chatPromises = snapshot.docs.map(async (matchDoc) => {
              const matchData = matchDoc.data()
              const matchId = matchDoc.id
              const participants = matchData.participants as string[]
              const partnerId = participants.find((id) => id !== auth.currentUser!.uid)

              if (!partnerId) return null

              // שליפת פרטי השותף
              const partnerDoc = await getDoc(doc(db, 'users', partnerId))
              const partnerData = partnerDoc.data()

              // שליפת ההודעה האחרונה
              const messagesQuery = query(
                collection(db, 'messages', matchId, 'items'),
                orderBy('timestamp', 'desc')
              )
              const messagesSnapshot = await getDocs(messagesQuery)
              const lastMessageDoc = messagesSnapshot.docs[0]
              const lastMessageData = lastMessageDoc?.data()

              return {
                matchId,
                partnerId,
                partnerName: partnerData?.name || 'משתמש לא ידוע',
                partnerPhoto: partnerData?.photos?.[0],
                lastMessage: lastMessageData?.text,
                lastMessageTime: lastMessageData?.timestamp?.toDate(),
                unreadCount: 0, // ניתן להוסיף לוגיקה לספירת הודעות שלא נקראו
              } as ChatItem
            })

            const chatResults = await Promise.all(chatPromises)
            const validChats = chatResults.filter((chat) => chat !== null) as ChatItem[]

            // מיון לפי זמן ההודעה האחרונה
            validChats.sort((a, b) => {
              if (!a.lastMessageTime) return 1
              if (!b.lastMessageTime) return -1
              return b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
            })

            setChats(validChats)
            setLoading(false)
          },
          (err) => {
            console.error('Error loading chats:', err)
            setError('שגיאה בטעינת הצ\'אטים')
            setLoading(false)
          }
        )

        return () => unsubscribe()
      } catch (err) {
        console.error('Error in loadChats:', err)
        setError('שגיאה בטעינת הצ\'אטים')
        setLoading(false)
      }
    }

    loadChats()
  }, [router])

  const handleChatClick = (matchId: string) => {
    router.push(`/chat/${matchId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען צ'אטים...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="p-6 max-w-md w-full text-center">
          <div className="text-destructive mb-4">
            <MessageCircle className="h-12 w-12 mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline text-sm"
          >
            נסה שוב
          </button>
        </Card>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 to-blue-50">
        <Card className="p-8 max-w-md w-full text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">אין עדיין צ'אטים</h2>
          <p className="text-muted-foreground mb-6">
            התחל לחפש התאמות כדי לפתוח שיחות חדשות
          </p>
          <button
            onClick={() => router.push('/matches')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:bg-primary/90 transition-colors"
          >
            מצא התאמות
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50" dir="rtl">
      <div className="max-w-2xl mx-auto p-4">
        {/* כותרת */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">הצ'אטים שלי</h1>
          <p className="text-muted-foreground mt-1">
            {chats.length} {chats.length === 1 ? 'שיחה פעילה' : 'שיחות פעילות'}
          </p>
        </div>

        {/* רשימת צ'אטים */}
        <div className="space-y-3">
          {chats.map((chat) => (
            <Card
              key={chat.matchId}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white"
              onClick={() => handleChatClick(chat.matchId)}
            >
              <div className="flex items-center gap-4">
                {/* תמונת פרופיל */}
                <Avatar className="h-14 w-14 flex-shrink-0">
                  {chat.partnerPhoto ? (
                    <img
                      src={chat.partnerPhoto}
                      alt={chat.partnerName}
                      className="object-cover w-full h-full rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold text-xl">
                      {chat.partnerName.charAt(0)}
                    </div>
                  )}
                </Avatar>

                {/* פרטי הצ'אט */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-lg text-foreground truncate">
                      {chat.partnerName}
                    </h3>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">
                        {formatRelativeTime(chat.lastMessageTime)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage || 'התחל שיחה...'}
                    </p>

                    <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* כפתורים תחתונים */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push('/matches')}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors"
          >
            מצא עוד התאמות
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-full font-semibold hover:bg-secondary/90 transition-colors"
          >
            הפרופיל שלי
          </button>
        </div>
      </div>
    </div>
  )
}
