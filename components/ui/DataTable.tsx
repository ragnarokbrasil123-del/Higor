'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Casco de tabela do app. As três tabelas (Professores, Cadastro em lote
 * e Alunos) tinham cabeçalhos com fundos e alturas diferentes.
 *
 * No celular a tabela rola na horizontal dentro do próprio container —
 * a página nunca rola para o lado.
 */
export function DataTable({
  children,
  minWidth = 760,
  className,
}: {
  children: React.ReactNode;
  /** Largura mínima antes de começar a rolar na horizontal. */
  minWidth?: number;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto custom-scrollbar', className)}>
      <table className="w-full text-left border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/**
 * Tabela no desktop, lista de cards no celular.
 *
 * Rolar uma tabela densa na horizontal com uma mão molhada é inviável,
 * então abaixo de `md` o conteúdo vira cards empilhados.
 */
export function ResponsiveTable({
  table,
  cards,
  className,
}: {
  /** O que aparece de md para cima. */
  table: React.ReactNode;
  /** O que aparece no celular. */
  cards: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="hidden md:block">{table}</div>
      <div className="md:hidden divide-y divide-line/60">{cards}</div>
    </div>
  );
}

/** Card de uma linha, para o modo celular da ResponsiveTable. */
export function RowCard({
  title,
  subtitle,
  badges,
  fields,
  action,
  muted = false,
  onClick,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  /** Pares rótulo/valor mostrados em duas colunas. */
  fields?: { label: string; value: React.ReactNode }[];
  action?: React.ReactNode;
  muted?: boolean;
  onClick?: () => void;
  /** Conteúdo livre abaixo dos campos. */
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 space-y-3 bg-surface transition-colors',
        onClick && 'cursor-pointer active:bg-surface-sunken',
        muted && 'opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink leading-tight break-words">{title}</p>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          {badges && <div className="flex flex-wrap gap-1.5 mt-2">{badges}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {fields && fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {fields.map(f => (
            <div key={f.label} className="min-w-0">
              <dt className="text-micro font-bold text-ink-subtle uppercase tracking-wider">{f.label}</dt>
              <dd className="text-sm text-ink-muted break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {children}
    </div>
  );
}

/** Cabeçalho fixo ao rolar. */
export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-surface-sunken sticky top-0 z-10">
      <tr className="text-micro font-bold text-ink-subtle uppercase tracking-wider">{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <th className={cn('p-3 whitespace-nowrap', align === 'right' && 'text-right', className)}>{children}</th>
  );
}

/** Linha clicável ou não, com o mesmo hover em toda parte. */
export function TR({
  children,
  onClick,
  muted = false,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  /** Linha esmaecida (inativo, ignorado). */
  muted?: boolean;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-t border-line/60 transition-colors',
        onClick && 'cursor-pointer',
        'hover:bg-surface-sunken/70',
        muted && 'opacity-45',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return <td className={cn('p-3', align === 'right' && 'text-right', className)}>{children}</td>;
}

/** Linha única ocupando a tabela toda — usada para "nada encontrado". */
export function TEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-10 text-center text-ink-subtle font-medium text-sm">
        {children}
      </td>
    </tr>
  );
}
