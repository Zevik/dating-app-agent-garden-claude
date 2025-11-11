import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

// טיפוסים לפי JSONSchema
export interface UserProfile {
  userId: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  seeking: 'male' | 'female' | 'other'
  location: { lat: number; lng: number }
  city: string
  bio: string
  interests: string[]
  prefs: {
    ageMin: number
    ageMax: number
    maxDistanceKm: number
  }
  plan: 'free' | 'premium' | 'vip'
}

export interface Candidate {
  userId: string
  name: string
  age: number
  city: string
  distanceKm: number
  interests: string[]
  photos: string[]
}

export interface Score {
  value: number
  reasons?: string[]
}

export interface Match {
  matchId: string
  state: 'pending' | 'active' | 'closed'
}

// Cloud Functions Tools

export async function readUserProfile(userId: string): Promise<{ user: UserProfile }> {
  const fn = httpsCallable<{ userId: string }, { user: UserProfile }>(functions, 'readUserProfile')
  const result = await fn({ userId })
  return result.data
}

export async function queryCandidates(
  userId: string,
  filters?: {
    gender?: string
    ageMin?: number
    ageMax?: number
    maxDistanceKm?: number
    limit?: number
  }
): Promise<{ candidates: Candidate[] }> {
  const fn = httpsCallable<any, { candidates: Candidate[] }>(functions, 'queryCandidates')
  const result = await fn({ userId, filters })
  return result.data
}

export async function scoreCandidate(
  sourceUser: string,
  candidate: Candidate
): Promise<{ score: Score }> {
  const fn = httpsCallable<any, { score: Score }>(functions, 'scoreCandidate')
  const result = await fn({ sourceUser, candidate })
  return result.data
}

export async function createOrQueueMatch(
  userA: string,
  userB: string,
  score?: number
): Promise<Match> {
  const fn = httpsCallable<any, Match>(functions, 'createOrQueueMatch')
  const result = await fn({ userA, userB, score })
  return result.data
}

export async function getActiveMatch(userId: string): Promise<{ matchId: string | null; state: string | null }> {
  const fn = httpsCallable<{ userId: string }, { matchId: string | null; state: string | null }>(
    functions,
    'getActiveMatch'
  )
  const result = await fn({ userId })
  return result.data
}

export async function closeMatch(matchId: string, reason?: string): Promise<{ ok: boolean }> {
  const fn = httpsCallable<{ matchId: string; reason?: string }, { ok: boolean }>(functions, 'closeMatch')
  const result = await fn({ matchId, reason })
  return result.data
}

export async function moderateText(text: string, context?: string): Promise<{ allowed: boolean; labels?: string[] }> {
  const fn = httpsCallable<{ text: string; context?: string }, { allowed: boolean; labels?: string[] }>(
    functions,
    'moderateText'
  )
  const result = await fn({ text, context })
  return result.data
}

export async function storeMessage(
  matchId: string,
  from: string,
  text: string
): Promise<{ messageId: string; status: string }> {
  const fn = httpsCallable<any, { messageId: string; status: string }>(functions, 'storeMessage')
  const result = await fn({ matchId, from, text })
  return result.data
}

export async function extractSharedInterests(userA: string, userB: string): Promise<{ shared: string[] }> {
  const fn = httpsCallable<{ userA: string; userB: string }, { shared: string[] }>(
    functions,
    'extractSharedInterests'
  )
  const result = await fn({ userA, userB })
  return result.data
}

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ ok: boolean }> {
  const fn = httpsCallable<any, { ok: boolean }>(functions, 'sendPush')
  const result = await fn({ token, title, body, data })
  return result.data
}
