export function formatDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function getDeadlineParts(value) {
  const date = new Date(`${value}T00:00:00`)
  return {
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date),
  }
}

export function formatDateTime(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
