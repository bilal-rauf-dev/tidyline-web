import { useEffect, useRef, useState } from 'react'
import { BUCKET_LABELS, BUCKET_ORDER, REQUIRED_BUCKETS } from '../utils/buckets'
import { Checkbox } from './Checkbox'
import { ChevronDownIcon } from './icons'

export function BucketConfigMenu({ bucketOrder, onToggleBucket, onReset }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="bucket-config" ref={rootRef}>
      <button
        type="button"
        className="select-trigger bucket-config-trigger"
        aria-expanded={isOpen}
        aria-controls="bucket-config-options"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{bucketOrder.length} timeline stages</span>
        <ChevronDownIcon />
      </button>

      <div
        id="bucket-config-options"
        className={isOpen ? 'bucket-config-panel open' : 'bucket-config-panel'}
        inert={isOpen ? undefined : true}
      >
        <div className="bucket-config-surface">
          <div className="bucket-config-list" role="group" aria-label="Visible Board buckets">
            {BUCKET_ORDER.map((bucket) => {
              const required = REQUIRED_BUCKETS.includes(bucket)

              return (
                <label key={bucket} className="bucket-config-option">
                  <Checkbox
                    checked={bucketOrder.includes(bucket)}
                    disabled={required}
                    onChange={() => onToggleBucket(bucket)}
                  />
                  <span>
                    {BUCKET_LABELS[bucket]}
                    {required && <small>Required</small>}
                  </span>
                </label>
              )
            })}
          </div>

          <button type="button" className="secondary bucket-config-reset" onClick={onReset}>
            Show all stages
          </button>
        </div>
      </div>
    </div>
  )
}
