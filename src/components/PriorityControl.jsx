import { PRIORITY_OPTIONS } from '../utils/taskFields'
import { SelectMenu } from './SelectMenu'

export function PriorityControl({ value = '', onChange }) {
  return (
    <label className="field-icon priority-control">
      <span className="field-icon-head">Priority</span>
      <SelectMenu
        value={value}
        ariaLabel="Task priority"
        options={PRIORITY_OPTIONS}
        onChange={onChange}
      />
    </label>
  )
}
