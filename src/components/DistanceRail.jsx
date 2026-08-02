import { BUCKET_ORDER } from '../utils/buckets'

/**
 * Positional glyph showing where a bucket sits on the Today → Later scale.
 * One tick per bucket; ticks nearer than the current one stay solid, ticks
 * beyond it fade, and the current tick is a full-height accent bar.
 * Reusable primitive — see design.md "Chart primitives".
 */
export function DistanceRail({ bucketKey }) {
  const index = BUCKET_ORDER.indexOf(bucketKey)

  return (
    <div className="distance-rail" aria-hidden="true">
      {BUCKET_ORDER.map((key, position) => {
        let state = 'rail-tick'

        if (position === index) {
          state = 'rail-tick current'
        } else if (position < index) {
          state = 'rail-tick passed'
        }

        return <span key={key} className={state} />
      })}
    </div>
  )
}
