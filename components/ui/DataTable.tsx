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
