export function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') {
    return
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function notifyReminder(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return
  }

  new Notification(title, { body })
}
