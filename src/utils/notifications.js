const SOUND_KEY = 'tidyline:notificationSound'

let workerRegistration = null
let audioContext = null

export function getNotificationPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export async function ensureNotificationPermission() {
  if (getNotificationPermission() !== 'default') return getNotificationPermission()
  try {
    return await Notification.requestPermission()
  } catch (error) {
    console.warn('[TidyLine] Notification permission request failed:', error)
    return getNotificationPermission()
  }
}

export function isSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) !== 'off'
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off')
}

/**
 * Register the worker for notification actions and production offline assets.
 * Failure is non-fatal; notifications fall back to the plain API.
 */
export async function registerNotificationWorker() {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  // Vite's development worker has no asset cache; production injects one.

  try {
    workerRegistration = await navigator.serviceWorker.register('/sw.js')
    return workerRegistration
  } catch (error) {
    console.warn('[TidyLine] Service worker registration failed:', error)
    workerRegistration = null
    return null
  }
}

/** Short two-tone chime, synthesised so no audio asset ships with the app. */
export function playChime() {
  if (!isSoundEnabled()) {
    return
  }

  try {
    const Ctor = window.AudioContext || window.webkitAudioContext

    if (!Ctor) {
      return
    }

    audioContext = audioContext ?? new Ctor()

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    const start = audioContext.currentTime
    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)
    gain.connect(audioContext.destination)

    ;[880, 1320].forEach((frequency, index) => {
      const osc = audioContext.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, start + index * 0.14)
      osc.connect(gain)
      osc.start(start + index * 0.14)
      osc.stop(start + index * 0.14 + 0.2)
    })
  } catch {
    // Audio is a nicety; never let it break the reminder itself.
  }
}

export function notifyReminder({ title, body, taskId, reminderId }) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return
  }

  playChime()

  const payload = {
    body,
    tag: `${taskId}:${reminderId}`,
    data: { taskId, reminderId, url: `/board?expand=${encodeURIComponent(taskId)}` },
  }

  if (workerRegistration?.showNotification) {
    workerRegistration.showNotification(title, payload).catch((error) => {
      console.warn('[TidyLine] Could not display reminder:', error)
    })
    return
  }

  try {
    new Notification(title, payload)
  } catch (error) {
    console.warn('[TidyLine] Could not display reminder:', error)
  }
}
