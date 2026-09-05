'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/** Base compartilhada por input, select e textarea — um só lugar define a forma. */
const CONTROLE = cn(
  'w-full bg-surface-sunken border border-line rounded-control',
  'px-4 py-3 min-h-11 text-base sm:text-sm text-ink',
  'outline-none transition-all',
  'placeholder:text-ink-subtle',
  'focus:border-brand focus:ring-2 focus:ring-brand/20',
  'disabled:opacity-60 disabled:pointer-events-none'
);

/** Rótulo acima do campo. */
export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block text-mini font-bold text-ink-muted uppercase tracking-wider mb-1.5', className)}>
      {children}
    </label>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Ícone à esquerda, dentro do campo. */
  icon?: React.ReactNode;
  /** Elemento à direita (botão de limpar, olho da senha). */
  trailing?: React.ReactNode;
  invalid?: boolean;
}

export function Input({ icon, trailing, invalid, className, ...props }: InputProps) {
  const campo = (
    <input
      className={cn(
        CONTROLE,
        icon && 'pl-10',
        trailing && 'pr-10',
        invalid && 'border-danger focus:border-danger focus:ring-danger/20',
        className
      )}
      {...props}
    />
  );

  if (!icon && !trailing) return campo;

  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">{icon}</span>
      )}
      {campo}
      {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
    </div>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROLE, 'font-medium appearance-none pr-9', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROLE, 'min-h-[100px] resize-y', className)} {...props} />;
}

/** Interruptor. Antes existiam 4 cópias, em 2 tamanhos diferentes. */
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex items-center gap-2 select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-control',
        className
      )}
    >
      <span
        className={cn(
          'w-9 h-5 rounded-full relative transition-colors shrink-0',
          checked ? 'bg-brand' : 'bg-line-strong'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 bg-surface rounded-full shadow-raised transition-all',
            checked ? 'left-[18px]' : 'left-0.5'
          )}
        />
      </span>
      {label && <span className="text-xs font-bold text-ink-muted">{label}</span>}
    </button>
  );
}
