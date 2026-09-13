const AI_CHAT_ENDPOINT = '/api/ai/chat'
const MAX_HISTORY_MESSAGES = 8
const MAX_HISTORY_CHARS = 4000

function toMessageContent(message) {
  return String(message?.text || '').trim()
}

function getSafeHistory(messages) {
  let usedChars = 0

  return messages
    .filter((message) => ['user', 'assistant'].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: toMessageContent(message).slice(0, 500),
    }))
    .filter((message) => message.content)
    .slice(-MAX_HISTORY_MESSAGES)
    .reverse()
    .filter((message) => {
      usedChars += message.content.length
      return usedChars <= MAX_HISTORY_CHARS
    })
    .reverse()
}

async function getFirebaseToken(currentUser) {
  if (!currentUser || typeof currentUser.getIdToken !== 'function') return ''

  try {
    return await currentUser.getIdToken()
  } catch {
    return ''
  }
}

export async function sendAssistantMessage({
  message,
  messages = [],
  currentUser = null,
  context = {},
}) {
  const token = await getFirebaseToken(currentUser)
  const response = await fetch(AI_CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      history: getSafeHistory(messages),
      context,
    }),
  })

  let payload

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.error?.message || "Sorry, I couldn't process that right now.")
    error.code = payload?.error?.code || 'AI_CHAT_FAILED'
    throw error
  }

  return payload.response
}
