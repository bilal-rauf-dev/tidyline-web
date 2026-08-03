import { useEffect, useState } from 'react'
import { BUCKET_ORDER, REQUIRED_BUCKETS, normalizeBucketOrder } from '../utils/buckets'

const STORAGE_KEY = 'tidyline:bucket-order'

function loadBucketOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return normalizeBucketOrder(stored ?? BUCKET_ORDER)
  } catch {
    return BUCKET_ORDER
  }
}

export function useBucketConfig() {
  const [bucketOrder, setBucketOrder] = useState(loadBucketOrder)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bucketOrder))
  }, [bucketOrder])

  function toggleBucket(bucketKey) {
    if (REQUIRED_BUCKETS.includes(bucketKey)) {
      return
    }

    setBucketOrder((current) =>
      normalizeBucketOrder(
        current.includes(bucketKey)
          ? current.filter((bucket) => bucket !== bucketKey)
          : [...current, bucketKey],
      ),
    )
  }

  function resetBuckets() {
    setBucketOrder(BUCKET_ORDER)
  }

  return { bucketOrder, toggleBucket, resetBuckets }
}
