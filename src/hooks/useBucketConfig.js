import { useState } from 'react'
import { BUCKET_ORDER, REQUIRED_BUCKETS, normalizeBucketOrder } from '../utils/buckets'

const STORAGE_KEY = 'tidyline:bucket-order'

function loadBucketOrderFromLocalStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return normalizeBucketOrder(stored ?? BUCKET_ORDER)
  } catch {
    return BUCKET_ORDER
  }
}

/**
 * useBucketConfig — manages the ordered list of visible timeline buckets.
 *
 * Accepts an optional `settingsCtx`:
 *   { settings, updateSettings, isAuthenticated }
 *
 * Authenticated users read from / write to user_settings.bucket_order.
 * Guests use localStorage exactly as before.
 */
export function useBucketConfig({
  settings = null,
  updateSettings = null,
  isAuthenticated = false,
} = {}) {
  const [localBucketOrder, setLocalBucketOrder] = useState(loadBucketOrderFromLocalStorage)

  const bucketOrder =
    isAuthenticated && settings?.bucketOrder
      ? normalizeBucketOrder(settings.bucketOrder)
      : localBucketOrder

  function toggleBucket(bucketKey) {
    if (REQUIRED_BUCKETS.includes(bucketKey)) return

    const nextOrder = normalizeBucketOrder(
      bucketOrder.includes(bucketKey)
        ? bucketOrder.filter((b) => b !== bucketKey)
        : [...bucketOrder, bucketKey],
    )

    if (isAuthenticated && settings !== null) {
      updateSettings?.({ bucketOrder: nextOrder })
    } else {
      setLocalBucketOrder(nextOrder)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextOrder))
    }
  }

  function resetBuckets() {
    if (isAuthenticated && settings !== null) {
      updateSettings?.({ bucketOrder: BUCKET_ORDER })
    } else {
      setLocalBucketOrder(BUCKET_ORDER)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(BUCKET_ORDER))
    }
  }

  return { bucketOrder, toggleBucket, resetBuckets }
}
