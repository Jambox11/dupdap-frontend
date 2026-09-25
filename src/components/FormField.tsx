import { useId } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  labelClassName?: string;
  hideLabel?: boolean;
  hint?: React.ReactNode;
  /** Optional status indicator rendered next to the label (e.g. username availability). */
  status?: React.ReactNode;
}

export function FormField({ label, error, id, className, labelClassName, hideLabel, hint, status, ...props }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  const labelClasses = hideLabel
    ? `sr-only ${labelClassName ?? ''}`.trim()
    : `label ${labelClassName ?? ''}`.trim();

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className={labelClasses}>
          {label}
        </label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      <input
        id={inputId}
        className={`input ${error ? 'border-red-400 focus:border-red-400' : ''} ${className ?? ''}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
