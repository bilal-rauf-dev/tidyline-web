import { supabase } from '../supabaseClient'

export const WEB_PUSH_PUBLIC_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim() ?? ''

function isIosBrowserTab() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
  return iosDevice && !standalone
}

export function getPushCapability() {
  if (!WEB_PUSH_PUBLIC_KEY) return 'unconfigured'
  if (isIosBrowserTab()) return 'install-required'
  if (typeof window === 'undefined' || !window.isSecureContext) return 'insecure'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    return 'unsupported'
  }
  return 'supported'
}

export function base64UrlToBytes(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

function equalBytes(left, right) {
  if (!left || !right || left.byteLength !== right.byteLength) return false
  const a = new Uint8Array(left)
  const b = new Uint8Array(right)
  return a.every((value, index) => value === b[index])
}

export function subscriptionUsesCurrentKey(subscription) {
  const existingKey = subscription?.options?.applicationServerKey
  return !existingKey || equalBytes(existingKey, base64UrlToBytes(WEB_PUSH_PUBLIC_KEY))
}

async function readyRegistration() {
  const timeout = new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error('The notification worker did not become ready.')), 10000)
  })
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

export async function currentPushSubscription() {
  const registration = await readyRegistration()
  return registration.pushManager.getSubscription()
}

export async function existingPushSubscription() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return registration?.pushManager?.getSubscription() ?? null
}

export async function createPushSubscription() {
  const registration = await readyRegistration()
  const existing = await registration.pushManager.getSubscription()
  if (existing && subscriptionUsesCurrentKey(existing)) return existing
  if (existing) await existing.unsubscribe()
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(WEB_PUSH_PUBLIC_KEY),
  })
}

function subscriptionRecord(subscription) {
  const value = subscription.toJSON()
  if (!value.endpoint || !value.keys?.p256dh || !value.keys?.auth) {
    throw new Error('The browser returned an incomplete push subscription.')
  }
  return {
    p_endpoint: value.endpoint,
    p_p256dh: value.keys.p256dh,
    p_auth_key: value.keys.auth,
    p_expiration_time: value.expirationTime ?? null,
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    p_user_agent: navigator.userAgent.slice(0, 500),
  }
}

export async function savePushSubscription(subscription) {
  if (!supabase) throw new Error('Cloud sync is unavailable.')
  const { data, error } = await supabase.rpc('register_push_subscription', subscriptionRecord(subscription))
  if (error) throw error
  return data
}

export async function removePushSubscription(subscription) {
  if (supabase) {
    const { error } = await supabase.rpc('unregister_push_subscription', {
      p_endpoint: subscription.endpoint,
    })
    if (error) throw error
  }
}

export async function fetchPushSubscriptionStatus(endpoint) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('enabled,last_success_at,last_error_at,last_error')
    .eq('endpoint', endpoint)
    .maybeSingle()
  if (error) throw error
  return data
}
