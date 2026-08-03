import { BUCKET_ORDER } from '../utils/buckets'

/**
 * Positional glyph showing where a bucket sits on the Today → Later scale.
 * Seven connected nodes make the ordered stages explicit without resembling
 * the percentage bars used elsewhere. Earlier nodes are solid, the current
 * node is enlarged and accented, and later nodes stay outlined.
 * Reusable primitive — see design.md "Chart primitives".
 */
export function DistanceRail({ bucketKey }) {
  const index = BUCKET_ORDER.indexOf(bucketKey)

  return (
    <div className="distance-rail" aria-hidden="true">
      {BUCKET_ORDER.map((key, position) => {
        let state = 'rail-node'

        if (position === index) {
          state = 'rail-node current'
        } else if (position < index) {
          state = 'rail-node passed'
        }

        return <span key={key} className={state} />
      })}
    </div>
  )
}
