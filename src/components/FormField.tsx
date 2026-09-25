import React, { useId } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Optional status indicator rendered next to the label (e.g. username availability). */
  status?: React.ReactNode;
}

export function FormField({ label, id, status, ...props }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      <label className="label" htmlFor={inputId}>
        {label}
        {status}
      </label>
      <input id={inputId} className="input" {...props} />
    </div>
  );
}
