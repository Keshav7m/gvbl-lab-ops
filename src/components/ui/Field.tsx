import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-red-600" role="alert">
      {message}
    </p>
  );
}

interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error wrapper. */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
      <FieldError id={htmlFor ? `${htmlFor}-error` : undefined} message={error} />
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className, ...props }, ref) {
  return <input ref={ref} className={cn("control", invalid && "control-invalid", className)} aria-invalid={invalid || undefined} {...props} />;
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn("control resize-y leading-relaxed", invalid && "control-invalid", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options: readonly (string | { value: string; label: string })[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, options, placeholder, ...props }, ref) {
  return (
    <select ref={ref} className={cn("control pr-8", invalid && "control-invalid", className)} aria-invalid={invalid || undefined} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const value = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return (
          <option key={value} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
});

/** Labelled text input with its error wired up via aria-describedby. */
export function TextField({
  label,
  error,
  hint,
  required,
  className,
  id,
  ...props
}: InputProps & { label: React.ReactNode; error?: string; hint?: React.ReactNode }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field label={label} htmlFor={fieldId} error={error} hint={hint} required={required} className={className}>
      <Input id={fieldId} invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} {...props} />
    </Field>
  );
}
