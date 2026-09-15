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

function getParsedErrorMessage(payload, fallback) {
  if (typeof payload?.error === 'string') return payload.error
  if (typeof payload?.error?.message === 'string') return payload.error.message
  if (typeof payload?.message === 'string') return payload.message
  return fallback
}

export async function sendAssistantMessage({
  message,
  messages = [],
  currentUser = null,
  context = {},
}) {
  const token = await getFirebaseToken(currentUser)
  let response

  try {
    response = await fetch(AI_CHAT_ENDPOINT, {
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
  } catch (error) {
    console.error('[AI NETWORK ERROR]', error)
    const networkError = new Error('AI network request failed.')
    networkError.code = 'AI_NETWORK_ERROR'
    networkError.status = 0
    networkError.displayMessage = 'AI network request failed.'
    throw networkError
  }

  let payload

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    const parsedErrorMessage = getParsedErrorMessage(
      payload,
      response.status === 404
        ? 'AI API endpoint not found'
        : "Sorry, I couldn't process that right now.",
    )

    console.error('AI request failed', {
      status: response.status,
      statusText: response.statusText,
      endpoint: AI_CHAT_ENDPOINT,
      error: parsedErrorMessage,
    })

    const error = new Error(`AI Error (${response.status}): ${parsedErrorMessage}`)
    error.code = payload?.code || payload?.error?.code || `AI_CHAT_HTTP_${response.status || 'FAILED'}`
    error.status = response.status
    error.statusText = response.statusText
    error.endpoint = AI_CHAT_ENDPOINT
    error.safeMessage = parsedErrorMessage
    error.displayMessage = `AI Error (${response.status}): ${parsedErrorMessage}`
    throw error
  }

  return payload.response
}