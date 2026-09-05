'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './Surface';

/**
 * Casca de toda aba do app: rolagem, fundo, largura e respiro.
 * Pensado para celular primeiro — padding menor no mobile, maior no desktop.
 *
 *   'wide'  -> listas e grades (Alunos, Grade, Avaliação)
 *   'focus' -> telas de foco (Cadastro, Checklist, Manutenção, Professores)
 */
export function PageShell({
  width = 'wide',
  children,
  className,
}: {
  width?: 'wide' | 'focus';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-canvas">
      <div
        className={cn(
          'mx-auto w-full px-4 py-5 md:px-8 md:py-8 space-y-5',
          width === 'wide' ? 'max-w-6xl' : 'max-w-4xl',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  /** O componente do ícone (não o elemento) — o tamanho e a cor são padronizados aqui. */
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Métrica à direita: 12 / 40 alunos avaliados */
  metric?: { value: number | string; of?: number | string; label: string };
  /** Ação principal. No celular ocupa a largura toda. */
  action?: React.ReactNode;
}

/**
 * Cabeçalho padrão: título → descrição → ação.
 * Antes cada aba tinha o seu, com 3 tamanhos de título e 2 pesos diferentes.
 */
export function PageHeader({ icon: Icon, title, description, metric, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl md:text-2xl font-black text-ink flex items-center gap-2 text-balance">
          {Icon && <Icon className="w-6 h-6 md:w-7 md:h-7 text-brand shrink-0" />}
          {title}
        </h1>
        {description && <p className="text-sm text-ink-muted font-medium mt-1">{description}</p>}
      </div>

      {(metric || action) && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 md:shrink-0">
          {action && <div className="[&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
          {metric && (
            <Card className="px-5 py-3 shrink-0">
              <p className="text-2xl font-black text-ink leading-none tabular-nums">
                {metric.value}
                {metric.of !== undefined && <span className="text-ink-subtle"> / {metric.of}</span>}
              </p>
              <p className="text-mini font-bold text-ink-subtle uppercase tracking-wider mt-1">{metric.label}</p>
            </Card>
          )}
        </div>
      )}
    </header>
  );
}

/**
 * Painel de filtros. Fica grudado no topo ao rolar — no celular isso
 * evita ter que voltar lá em cima para trocar de dia ou de turma.
 */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface rounded-panel border border-line shadow-raised',
        'p-3 md:p-4 space-y-3',
        'sticky top-0 z-20',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Linha de chips que rola na horizontal — essencial no celular. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">{children}</div>;
}

/** Rodapé do painel de filtros: contagem à direita, controles à esquerda. */
export function FilterFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3">{children}</div>;
}
