/**
 * קריאות ל-Agent Engine דרך HTTP
 * מבוסס על tools.manifest.json
 */

const AGENT_ENGINE_BASE_URL = process.env.NEXT_PUBLIC_AGENT_ENGINE_URL || 'https://agent-engine.example.com'

interface AgentResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Matching Agent - מחפש התאמה הבאה
 */
export async function callMatchingAgent(userId: string, preferences: any): Promise<AgentResponse> {
  try {
    const response = await fetch(`${AGENT_ENGINE_BASE_URL}/agents/matching`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        preferences,
        context: {
          timestamp: new Date().toISOString(),
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Agent error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Matching Agent error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Conversation Starter Agent - יוצר פתיחי שיחה
 */
export async function callConversationStarterAgent(
  profileA: any,
  profileB: any,
  sharedInterests: string[]
): Promise<AgentResponse<{ openingLines: Array<{ text: string; tag?: string }> }>> {
  try {
    const response = await fetch(`${AGENT_ENGINE_BASE_URL}/agents/conversation-starter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileA,
        profileB,
        sharedInterests,
      }),
    })

    if (!response.ok) {
      throw new Error(`Agent error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Conversation Starter Agent error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Moderation Agent - בדיקת תוכן
 */
export async function callModerationAgent(
  content: string,
  context?: string
): Promise<AgentResponse<{ allowed: boolean; reason?: string; remediation?: string }>> {
  try {
    const response = await fetch(`${AGENT_ENGINE_BASE_URL}/agents/moderation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        context,
      }),
    })

    if (!response.ok) {
      throw new Error(`Agent error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Moderation Agent error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * One-Connection State Agent - ניהול מצב "קשר אחד בכל פעם"
 */
export async function callOneConnectionStateAgent(
  userId: string,
  intent: 'open' | 'new' | 'close'
): Promise<AgentResponse> {
  try {
    const response = await fetch(`${AGENT_ENGINE_BASE_URL}/agents/one-connection-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        intent,
      }),
    })

    if (!response.ok) {
      throw new Error(`Agent error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('One-Connection State Agent error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Notification Agent - שליחת התראות
 */
export async function callNotificationAgent(
  userId: string,
  type: 'match' | 'message' | 'starter',
  data: any
): Promise<AgentResponse> {
  try {
    const response = await fetch(`${AGENT_ENGINE_BASE_URL}/agents/notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type,
        data,
      }),
    })

    if (!response.ok) {
      throw new Error(`Agent error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Notification Agent error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
