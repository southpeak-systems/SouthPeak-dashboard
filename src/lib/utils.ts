export function formatDate(date: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatPhone(phone: string): string {
  if (!phone) return '—'
  const cleaned = phone.replace(/\D/g, '')
  // Handle +1 country code
  const digits = cleaned.length === 11 && cleaned.startsWith('1') ? cleaned.slice(1) : cleaned
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

export function planPrice(_plan?: string): string {
  return '$250/mo'
}
