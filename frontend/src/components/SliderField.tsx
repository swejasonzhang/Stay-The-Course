// A slider for quick changes, paired with a number box for exact values. Both edit the same text value.
interface SliderFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  hint?: string;
  error?: string;
}

export function SliderField({ id, label, value, onChange, min, max, step, suffix, hint, error }: SliderFieldProps) {
  const numeric = Number(value);
  const sliderValue = Number.isFinite(numeric) && value.trim() !== "" ? Math.min(max, Math.max(min, numeric)) : min;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="slider-row">
        <input type="range" min={min} max={max} step={step} value={sliderValue}
          onChange={(event) => onChange(event.target.value)} aria-label={`${label} slider`} />
        <div className="input-wrap">
          <input id={id} type="number" inputMode="decimal" step="any" value={value}
            onChange={(event) => onChange(event.target.value)} aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined} />
          {suffix && <span className="affix">{suffix}</span>}
        </div>
      </div>
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
