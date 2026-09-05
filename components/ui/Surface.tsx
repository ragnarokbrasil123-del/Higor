'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================
   Superfícies e blocos de conteúdo
   ============================================================ */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 'panel' = container grande (lista, seção). 'card' = item dentro de uma lista. */
  as?: 'panel' | 'card';
  /** Remove o padding interno (para listas com divisórias). */
  flush?: boolean;
}

export function Card({ as = 'card', flush = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-line shadow-raised',
        as === 'panel' ? 'rounded-panel' : 'rounded-card',
        !flush && 'p-4 md:p-5',
        flush && 'overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ---------------- Badge ---------------- */

type Tom = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const TOM_BADGE: Record<Tom, string> = {
  neutral: 'bg-surface-sunken text-ink-muted',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  brand: 'bg-brand text-brand-ink',
};

interface BadgeProps {
  tone?: Tom;
  children: React.ReactNode;
  className?: string;
  /** Caixa alta com espaçamento — para rótulos de estado. */
  uppercase?: boolean;
}

export function Badge({ tone = 'neutral', uppercase = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-micro font-bold whitespace-nowrap',
        uppercase && 'uppercase tracking-wider',
        TOM_BADGE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Chip de filtro ---------------- */

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  /** Contador à direita (nº de turmas, alunos...). */
  count?: number;
  /** Bolinha colorida à esquerda — usada para as toucas. */
  dotClass?: string;
  children: React.ReactNode;
}

export function Chip({ active = false, onClick, count, dotClass, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 rounded-control text-sm font-bold whitespace-nowrap border transition-all',
        'inline-flex items-center gap-2 shrink-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        active
          ? 'bg-surface-raised text-ink-inverse border-surface-raised shadow-raised'
          : 'bg-surface text-ink-muted border-line hover:border-brand/40'
      )}
    >
      {dotClass && <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotClass)} />}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'text-micro font-black px-1.5 py-0.5 rounded-badge',
            active ? 'bg-white/20' : 'bg-surface-sunken text-ink-muted'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ---------------- Cabeçalho de página ---------------- */

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  /** Métrica à direita: { valor, de, rotulo } */
  metric?: { value: number; of?: number; label: string };
  action?: React.ReactNode;
}

export function PageHeader({ icon, title, subtitle, metric, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-black text-ink flex items-center gap-2 text-balance">
          {icon}
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ink-muted font-medium mt-1">{subtitle}</p>}
      </div>

      {metric && (
        <Card className="px-5 py-3 shrink-0">
          <p className="text-2xl font-black text-ink leading-none tabular-nums">
            {metric.value}
            {metric.of !== undefined && <span className="text-ink-subtle"> / {metric.of}</span>}
          </p>
          <p className="text-mini font-bold text-ink-subtle uppercase tracking-wider mt-1">{metric.label}</p>
        </Card>
      )}

      {action}
    </header>
  );
}

/* ---------------- Estados ---------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6 bg-surface rounded-panel border border-dashed border-line-strong">
      {icon && <div className="text-line-strong mx-auto mb-3 w-fit">{icon}</div>}
      <h3 className="font-bold text-ink text-balance">{title}</h3>
      {description && <p className="text-ink-subtle text-sm mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Carregando...', full = false }: { label?: string; full?: boolean }) {
  return (
    <p
      className={cn(
        'text-ink-subtle text-sm font-bold animate-pulse text-center',
        full ? 'flex-1 flex items-center justify-center py-24' : 'py-16'
      )}
    >
      {label}
    </p>
  );
}

export function ErrorState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6 bg-danger-soft rounded-panel border border-danger/20">
      <h3 className="font-bold text-danger-ink text-balance">{title}</h3>
      {description && <p className="text-danger-ink/80 text-sm mt-1">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
