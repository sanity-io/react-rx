type DebugPayload = {
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
  timestamp?: number
}

export function debugLog(payload: DebugPayload) {
  const entry = {
    ...payload,
    timestamp: payload.timestamp ?? Date.now(),
    sessionId: 'async-react-optimistic',
  }

  // #region agent log
  fetch('http://localhost:7243/ingest/00000000-0000-0000-0000-000000000000', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Debug-Session-Id': '00000000-0000-0000-0000-000000000000'},
    body: JSON.stringify(entry),
  }).catch(() => {})
  // #endregion

  if (import.meta.env.DEV) {
    console.debug('[debug]', entry.hypothesisId, entry.location, entry.message, entry.data ?? {})
  }
}
