import { CheckIcon } from './icons'

export function Checkbox({ className = '', ...props }) {
  const classes = ['custom-checkbox', className].filter(Boolean).join(' ')

  return (
    <span className={classes}>
      <input type="checkbox" {...props} />
      <span className="custom-checkbox-mark" aria-hidden="true">
        <CheckIcon />
      </span>
    </span>
  )
}
