import { PRIORITY_OPTIONS } from '../utils/taskFields'
import { SelectMenu } from './SelectMenu'

export function PriorityControl({ value = '', onChange, label = 'Priority' }) {
  return (
    <label className="field-icon priority-control">
      <span className="field-icon-head">{label}</span>
      <SelectMenu value={value} ariaLabel={label} options={PRIORITY_OPTIONS} onChange={onChange} />
    </label>
  )
}
