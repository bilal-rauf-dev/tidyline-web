import { useCallback, useEffect, useState } from 'react'
import { ensureNotificationPermission, getNotificationPermission } from '../utils/notifications'
import {
  createPushSubscription,
  currentPushSubscription,
  existingPushSubscription,
  fetchPushSubscriptionStatus,
  getPushCapability,
  removePushSubscription,
  savePushSubscription,
  subscriptionUsesCurrentKey,
} from '../utils/pushSubscriptions'

function messageFor(error) {
  if (error?.code === 'PGRST202' || error?.code === 'PGRST205' || error?.code === '42P01') {
    return 'Background reminder setup is not installed on the cloud database.'
  }
  return 'Background reminders could not be updated. Check your connection and try again.'
}

export function usePushNotifications(auth) {
  const [state, setState] = useState(() => ({
    capability: getPushCapability(),
    status: auth.loading ? 'checking' : 'off',
    busy: false,
    error: '',
    lastSuccessAt: null,
    lastErrorAt: null,
    lastError: '',
  }))

  const refresh = useCallback(async () => {
    const capability = getPushCapability()
    if (auth.loading) {
      setState((current) => ({ ...current, capability, status: 'checking' }))
      return
    }
    if (!auth.isAuthenticated) {
      try { await (await existingPushSubscription())?.unsubscribe() } catch { /* best effort */ }
      setState((current) => ({
        ...current,
        capability,
        status: capability === 'supported' ? 'signed-out' : capability,
        busy: false,
        error: '',
      }))
      return
    }
    if (capability !== 'supported') {
      setState((current) => ({ ...current, capability, status: capability, busy: false }))
      return
    }
    if (getNotificationPermission() === 'denied') {
      setState((current) => ({ ...current, capability, status: 'blocked', busy: false }))
      return
    }

    try {
      const subscription = await currentPushSubscription()
      if (!subscription) {
        setState((current) => ({ ...current, capability, status: 'off', busy: false, error: '' }))
        return
      }
      if (!subscriptionUsesCurrentKey(subscription)) {
        setState((current) => ({ ...current, capability, status: 'key-changed', busy: false }))
        return
      }

      // Existing subscription means the user already opted in. Refreshing its
      // account ownership and time zone does not prompt or create a new grant.
      await savePushSubscription(subscription)
      const server = await fetchPushSubscriptionStatus(subscription.endpoint)
      setState((current) => ({
        ...current,
        capability,
        status: server?.enabled === false ? 'error' : 'subscribed',
        busy: false,
        error: '',
        lastSuccessAt: server?.last_success_at ?? null,
        lastErrorAt: server?.last_error_at ?? null,
        lastError: server?.last_error ?? '',
      }))
    } catch (error) {
      setState((current) => ({
        ...current, capability, status: 'error', busy: false, error: messageFor(error),
      }))
    }
  }, [auth.isAuthenticated, auth.loading])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  const enable = useCallback(async () => {
    if (!auth.isAuthenticated) {
      setState((current) => ({ ...current, status: 'signed-out', error: 'Sign in before enabling background reminders.' }))
      return
    }
    setState((current) => ({ ...current, busy: true, error: '' }))
    try {
      const permission = await ensureNotificationPermission()
      if (permission !== 'granted') {
        setState((current) => ({ ...current, busy: false, status: permission === 'denied' ? 'blocked' : 'off' }))
        return
      }
      const subscription = await createPushSubscription()
      await savePushSubscription(subscription)
      await refresh()
    } catch (error) {
      setState((current) => ({
        ...current, busy: false, status: 'error', error: messageFor(error),
      }))
    }
  }, [auth.isAuthenticated, refresh])

  const disable = useCallback(async () => {
    setState((current) => ({ ...current, busy: true, error: '' }))
    try {
      const subscription = await existingPushSubscription()
      if (subscription) {
        if (auth.isAuthenticated) await removePushSubscription(subscription)
        await subscription.unsubscribe()
      }
      setState((current) => ({
        ...current, busy: false, status: auth.isAuthenticated ? 'off' : 'signed-out',
        lastSuccessAt: null, lastErrorAt: null, lastError: '',
      }))
    } catch (error) {
      // Unsubscribe locally even if server cleanup failed. A later 404/410 from
      // the push service disables the unreachable row.
      try { await (await currentPushSubscription())?.unsubscribe() } catch { /* best effort */ }
      setState((current) => ({
        ...current, busy: false, status: 'error', error: messageFor(error),
      }))
    }
  }, [auth.isAuthenticated])

  const signOut = useCallback(async () => {
    await disable()
    await auth.signOut()
  }, [auth, disable])

  return {
    ...state,
    enabled: state.status === 'subscribed',
    enable,
    disable,
    refresh,
    signOut,
  }
}
