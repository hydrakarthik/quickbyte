import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type NativeInputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'autoComplete' | 'inputMode' | 'maxLength' | 'placeholder' | 'type'
>;

interface TextFieldProps extends NativeInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string;
}

export function TextField({ id, label, value, onChange, error, hint, type = 'text', ...rest }: TextFieldProps) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={cn(
          'mt-1.5 h-12 w-full rounded-xl border bg-white px-4 text-sm transition placeholder:text-muted-foreground focus:outline-none focus:ring-4',
          error ? 'border-destructive focus:ring-destructive/10' : 'border-border focus:border-primary focus:ring-primary/10',
        )}
        {...rest}
      />
      {error ? (
        <p id={messageId} className="mt-1.5 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}