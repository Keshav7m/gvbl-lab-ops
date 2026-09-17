"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Large, square checkbox that mirrors the tick boxes on the paper form. */
export function Checkbox({ checked, onChange, label, disabled, className }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex cursor-pointer select-none items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
        checked ? "border-violet-300 bg-violet-50 text-violet-900" : "border-transparent hover:bg-mist",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500",
          checked ? "border-violet-700 bg-violet-700 text-white" : "border-ink-faint bg-white",
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span>{label}</span>
    </label>
  );
}

interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  name?: string;
  value: T | "";
  onChange: (value: T | "") => void;
  options: RadioOption<T>[];
  /** Allow clicking the selected option again to clear the answer. */
  clearable?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}

/** Radio group rendered as a compact segmented control (Yes / No, Invoice Updated / None…). */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  clearable = true,
  invalid,
  ariaLabel,
  disabled,
}: SegmentedProps<T>) {
  const autoName = useId();
  const groupName = name ?? autoName;
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-md border bg-white p-0.5", invalid ? "border-red-500" : "border-rule")}
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "relative cursor-pointer select-none rounded px-3.5 py-1.5 text-sm font-medium transition-colors",
              selected ? "bg-violet-700 text-white shadow-sm" : "text-ink-soft hover:bg-violet-50",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={groupName}
              value={o.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(o.value)}
              onClick={() => {
                if (clearable && selected) onChange("");
              }}
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export const YES_NO_OPTIONS: RadioOption<"YES" | "NO">[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];
