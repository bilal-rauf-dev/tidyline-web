import { ENERGY_LEVEL_OPTIONS } from '../utils/taskFields'

export function EnergyLevelControl({ value = '', onChange, label = 'Energy' }) {
  return (
    <fieldset className="energy-control">
      <legend>{label}</legend>
      <div className="energy-options">
        {ENERGY_LEVEL_OPTIONS.map((option) => (
          <button
            key={option.value || 'unset'}
            type="button"
            className={value === option.value ? 'energy-option active' : 'energy-option'}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.value && <span className={`energy-dot energy-${option.value}`} aria-hidden="true" />}
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
