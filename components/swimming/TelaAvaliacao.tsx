'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, MessageCircle, Sparkles, X } from 'lucide-react';
import { levels, type CapLevel } from '@/types';
import { cn } from '@/lib/utils';
import { Button, IconButton, Modal, Textarea } from '@/components/ui';
import type { Aluno } from './constantes';
import type { useFilaAvaliacao } from './useFilaAvaliacao';

interface TelaAvaliacaoProps {
  /** O objeto inteiro devolvido por useFilaAvaliacao. */
  aval: ReturnType<typeof useFilaAvaliacao>;
  /** Só para o rótulo acessível das bolinhas de progresso. */
  alunoPorId: Map<string, Aluno>;
}

/**
 * Tela de avaliação em sequência: cabeçalho fixo com progresso, critérios
 * com dois alvos grandes, observação e rodapé de navegação.
 *
 * Só a marcação visual — toda a regra vive em useFilaAvaliacao.
 */
export function TelaAvaliacao({ aval, alunoPorId }: TelaAvaliacaoProps) {
  const {
    fila, filaIdx, scores, notes, setNotes, salvando, feito, ultimoSalvo,
    sairAberto, setSairAberto, salvosNaFila, puladosNaFila, topoRef,
    alunoAtual, temRascunho, criterios, marcados, passou,
    marcarTodos, marcarCriterio, gerarSugestao, irParaAluno, voltarAluno,
    salvarEAvancar, encerrar, sair,
  } = aval;
  if (feito) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-sunken p-6 text-center">
        <div className="w-20 h-20 bg-success-soft rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-black text-ink">Turma avaliada!</h2>
        <p className="text-ink-muted font-medium mt-2">
          {feito.total} aluno(s) concluído(s){feito.aprovados > 0 && <> · <b className="text-success">{feito.aprovados} trocaram de touca 🏅</b></>}
        </p>
        <button onClick={encerrar} className="mt-8 px-8 py-4 bg-slate-900 text-white font-black rounded-2xl active:scale-95 transition-transform">
          Voltar para as turmas
        </button>
      </div>
    );
  }

  if (!alunoAtual) return null;
  const info = levels[alunoAtual.level as CapLevel];

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-sunken overflow-y-auto custom-scrollbar" ref={topoRef}>
      {/* cabeçalho fixo */}
      <div className="sticky top-0 z-20 bg-surface border-b border-line shadow-raised">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-center gap-3">
            <IconButton onClick={() => setSairAberto(true)} aria-label="Sair da avaliação" className="bg-surface-sunken shrink-0">
              <ArrowLeft className="w-5 h-5 text-ink-muted" />
            </IconButton>
            <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black shrink-0', info?.bgClass)}>
              {alunoAtual.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-ink leading-tight break-words line-clamp-2">{alunoAtual.name}</h2>
              <p className="text-xs font-bold text-ink-muted">Touca {info?.name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-black text-ink tabular-nums">{filaIdx + 1} de {fila.length}</p>
              <p className="text-mini font-bold text-ink-subtle tabular-nums">{marcados} de {criterios.length} marcados</p>
              {temRascunho && (
                <span className="inline-block mt-1 text-micro font-bold text-warning-ink bg-warning-soft px-1.5 py-0.5 rounded-badge">
                  rascunho
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
            <div className="h-full bg-brand transition-all" style={{ width: `${criterios.length ? (marcados / criterios.length) * 100 : 0}%` }} />
          </div>

          {fila.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Alunos da fila">
              {fila.map((id, i) => {
                const salvo = salvosNaFila.has(id);
                const pulado = puladosNaFila.has(id);
                const atual = i === filaIdx;
                return (
                  <button
                    key={id}
                    onClick={() => irParaAluno(i)}
                    role="tab"
                    aria-selected={atual}
                    aria-label={`${alunoPorId.get(id)?.name || 'Aluno'}${salvo ? ' — avaliado' : pulado ? ' — pulado' : ''}`}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0',
                      atual && 'ring-2 ring-offset-1 ring-brand',
                      salvo ? 'bg-success text-white'
                        : pulado ? 'bg-warning-soft border border-warning/40'
                        : 'bg-surface-sunken border border-line'
                    )}
                  >
                    {salvo
                      ? <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      : <span className="text-micro font-black text-ink-subtle tabular-nums">{i + 1}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {ultimoSalvo && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="sticky top-[92px] z-30 mx-4 mt-3"
          >
            <div className={cn(
              'rounded-card px-4 py-3 shadow-overlay flex items-center gap-3',
              ultimoSalvo.novaTouca ? 'bg-success text-white' : 'bg-surface-raised text-white'
            )}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold leading-tight">
                {ultimoSalvo.novaTouca
                  ? <>{ultimoSalvo.nome} passou para a touca <b>{ultimoSalvo.novaTouca}</b>! 🏅</>
                  : <>Avaliação de {ultimoSalvo.nome} salva.</>}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto w-full p-4 space-y-2 pb-32">
        <div className="flex gap-2 mb-3">
          <button onClick={() => marcarTodos('passed')} className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
            <Check className="w-4 h-4" strokeWidth={3} /> Marcar todos como Passou
          </button>
          <button onClick={() => marcarTodos('pending')} className="px-5 py-3 bg-surface border border-line text-ink-muted font-bold rounded-xl text-sm active:scale-95 transition-transform">
            Limpar
          </button>
        </div>

        {criterios.map(crit => {
          const st = scores[crit.id] || 'pending';
          return (
            <div key={crit.id} className={cn(
              'flex items-center gap-3 rounded-card border px-3 py-2.5 transition-colors',
              st === 'passed' ? 'border-success/40 bg-success-soft'
                : st === 'failed' ? 'border-danger/30 bg-danger-soft'
                : 'border-line bg-surface'
            )}>
              <p className="flex-1 min-w-0 text-sm font-bold text-ink leading-snug">{crit.label}</p>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => marcarCriterio(crit.id, 'passed')}
                  aria-label={`Passou: ${crit.label}`}
                  aria-pressed={st === 'passed'}
                  className={cn('w-12 h-12 rounded-control flex items-center justify-center transition-all active:scale-90',
                    st === 'passed' ? 'bg-success text-white shadow-raised' : 'bg-surface-sunken text-ink-subtle')}
                >
                  <Check className="w-5 h-5" strokeWidth={3} />
                </button>
                <button
                  onClick={() => marcarCriterio(crit.id, 'failed')}
                  aria-label={`Treinar: ${crit.label}`}
                  aria-pressed={st === 'failed'}
                  className={cn('w-12 h-12 rounded-control flex items-center justify-center transition-all active:scale-90',
                    st === 'failed' ? 'bg-danger text-white shadow-raised' : 'bg-surface-sunken text-ink-subtle')}
                >
                  <X className="w-5 h-5" strokeWidth={3} />
                </button>
              </div>
            </div>
          );
        })}

        <div className="bg-surface rounded-card border border-line p-4 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="text-xs font-black text-ink-muted uppercase tracking-wider flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Observações para os pais
            </label>
            <button
              type="button"
              disabled={marcados === 0}
              onClick={gerarSugestao}
              className="px-3 py-1.5 bg-info-soft border border-indigo-200 text-info-ink rounded-lg text-xs font-black flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" /> {notes ? 'Gerar outra' : 'Gerar sugestão'}
            </button>
          </div>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Escreva, ou toque em “Gerar sugestão” para criar a partir do resultado." className="min-h-[110px]" />
          {marcados === 0 && (
            <p className="text-[11px] font-bold text-ink-subtle mt-2">Marque os critérios acima para liberar a sugestão.</p>
          )}
        </div>
      </div>

      {/* rodapé fixo */}
      <div className="sticky bottom-0 bg-surface border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="max-w-3xl mx-auto flex gap-2">
          <button
            onClick={voltarAluno}
            disabled={filaIdx === 0}
            aria-label="Aluno anterior"
            className="w-14 h-14 shrink-0 bg-surface border border-line text-ink-muted rounded-control flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={() => salvarEAvancar(true)} className="px-4 h-14 shrink-0 bg-surface border border-line text-ink-subtle font-bold rounded-control text-sm active:scale-95 transition-transform">
            Pular
          </button>
          <button onClick={() => salvarEAvancar(false)} disabled={salvando} className="flex-1 h-14 bg-surface-raised text-white font-black rounded-control active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
            {salvando ? 'Salvando...' : filaIdx + 1 < fila.length ? <>Salvar e próximo <ChevronRight className="w-5 h-5" /></> : <>Salvar e finalizar <CheckCircle2 className="w-5 h-5" /></>}
          </button>
        </div>
        {passou === criterios.length && criterios.length > 0 && (
          <p className="max-w-3xl mx-auto text-center text-mini font-bold text-success mt-2">
            🏅 Passou em tudo — ao salvar, o aluno troca de touca automaticamente.
          </p>
        )}
      </div>

      <Modal
        open={sairAberto}
        onClose={() => setSairAberto(false)}
        size="md"
        title="Sair da avaliação?"
        footer={
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setSairAberto(false)}>
              Continuar avaliando
            </Button>
            <Button variant="dark" size="lg" className="flex-1" onClick={sair}>
              Sair
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted leading-relaxed">
          O que você já marcou fica <b className="text-ink">salvo como rascunho</b>. Quando voltar
          neste aluno, as marcações estarão como você deixou.
        </p>
        {fila.length - filaIdx - 1 > 0 && (
          <p className="text-sm text-ink-muted mt-3">
            Ainda faltam <b className="text-ink">{fila.length - filaIdx - 1} aluno(s)</b> nesta fila.
          </p>
        )}
      </Modal>
    </div>
  );
}
