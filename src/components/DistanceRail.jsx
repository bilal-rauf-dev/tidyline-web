import { BUCKET_ORDER } from '../utils/buckets'

export function DistanceRail({ bucketKey }) {
  const index = BUCKET_ORDER.indexOf(bucketKey)

  return (
    <div className="distance-rail" style={{ '--rail-stages': BUCKET_ORDER.length }} aria-hidden="true">
      {BUCKET_ORDER.map((key, position) => (
        <span key={key} className={position <= index ? 'passed' : undefined} />
      ))}
    </div>
  )
}
