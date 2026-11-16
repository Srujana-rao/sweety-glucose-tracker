const rememberedEmailKey = 'sweety_remembered_credentials'

export function getRememberedEmail() {
  try {
    const saved = localStorage.getItem(rememberedEmailKey)
    if (!saved) return ''

    const remembered = JSON.parse(saved)
    if (typeof remembered.email !== 'string' || !remembered.email) {
      localStorage.removeItem(rememberedEmailKey)
      return ''
    }

    localStorage.setItem(
      rememberedEmailKey,
      JSON.stringify({ email: remembered.email })
    )
    return remembered.email
  } catch {
    return ''
  }
}

export function saveRememberedEmail(email) {
  localStorage.setItem(rememberedEmailKey, JSON.stringify({ email }))
}

export function clearRememberedEmail() {
  localStorage.removeItem(rememberedEmailKey)
}
