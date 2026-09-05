'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const VARIANTE: Record<Variant, string> = {
  /** Ação principal da tela. Âmbar é a ÚNICA cor de ação do app. */
  primary: 'bg-brand text-brand-ink font-black hover:bg-brand-hover shadow-raised',
  /** Ação secundária, ao lado de uma primária. */
  secondary: 'bg-surface text-ink font-bold border border-line hover:bg-surface-sunken',
  /** Ação terciária, sem peso visual. */
  ghost: 'text-ink-muted font-bold hover:bg-surface-sunken',
  /** Ação destrutiva. */
  danger: 'bg-surface text-danger-ink font-bold border border-danger/25 hover:bg-danger-soft',
  /** Confirmação de fluxo (salvar e avançar) — contraste alto, sem competir com a marca. */
  dark: 'bg-surface-raised text-ink-inverse font-black hover:opacity-90 shadow-raised',
};

const TAMANHO: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-4 text-base gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Ocupa toda a largura disponível. */
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-control whitespace-nowrap',
        'transition-all active:scale-95',
        'disabled:opacity-50 disabled:pointer-events-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        VARIANTE[variant],
        TAMANHO[size],
        block && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Botão só de ícone — usado nas ações de linha (editar, excluir). */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'neutral' | 'danger' | 'info' | 'success';
}

const TOM: Record<NonNullable<IconButtonProps['tone']>, string> = {
  neutral: 'text-ink-subtle hover:text-ink hover:bg-surface-sunken',
  danger: 'text-ink-subtle hover:text-danger hover:bg-danger-soft',
  info: 'text-ink-subtle hover:text-info hover:bg-info-soft',
  success: 'text-success hover:bg-success-soft',
};

export function IconButton({ tone = 'neutral', className, children, ...props }: IconButtonProps) {
  return (
    <button
      className={cn(
        'p-2 rounded-control transition-colors active:scale-95',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:opacity-50 disabled:pointer-events-none',
        TOM[tone],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
