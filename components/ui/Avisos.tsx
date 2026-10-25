'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   Avisos e confirmações do app, no lugar de alert/confirm/prompt.

   Por que trocar: as caixas nativas travam a tela inteira, ignoram
   o visual do app e, no celular, aparecem coladas no topo com texto
   miúdo — o pior cenário para quem está com a mão molhada na beira
   da piscina. Eram 52 delas.

   A API é de MÓDULO, não de contexto React, de propósito: metade
   das chamadas vive em hooks (useFilaAvaliacao, useDadosNatacao),
   onde não dá para pendurar um `useContext`. Assim a troca no
   código é quase um por um:

       alert('Salvo!')            ->  avisar('Salvo!')
       if (!confirm('Apagar?'))   ->  if (!await confirmar('Apagar?'))
       const m = prompt('Motivo') ->  const m = await perguntar('Motivo')

   `confirmar` e `perguntar` devolvem Promise — quem chama precisa
   ser async, como já era a maioria.

   O host <Avisos /> é montado uma vez no layout, e não na página:
   o portal dos pais e a tela de login renderizam fora da casca
   principal e também precisam de aviso.
   ============================================================ */

type Tipo = 'ok' | 'erro' | 'info';

interface Toast {
  id: number;
  tipo: Tipo;
  texto: string;
}

interface Dialogo {
  id: number;
  titulo?: string;
  texto: string;
  /** Rótulo do botão que confirma. */
  acao: string;
  /** Vermelho + aviso: usado para apagar e cancelar matrícula. */
  perigo: boolean;
  /** Quando presente, vira um "prompt": pede um texto. */
  campo?: { rotulo: string; valorInicial: string; obrigatorio: boolean };
  resolver: (r: boolean | string | null) => void;
}

/* ---------------- repositório fora do React ---------------- */

let toasts: Toast[] = [];
let dialogo: Dialogo | null = null;
let proximoId = 1;

const ouvintes = new Set<() => void>();
const avisarOuvintes = () => ouvintes.forEach(f => f());

/** Mostra um recado passageiro. Substitui `alert()`. */
export function avisar(texto: string, tipo: Tipo = 'ok') {
  const id = proximoId++;
  toasts = [...toasts, { id, tipo, texto }];
  avisarOuvintes();
  // erro fica mais tempo na tela: costuma ter algo a ler
  setTimeout(() => fecharToast(id), tipo === 'erro' ? 6000 : 3500);
}

/** Atalho para o caso mais comum de erro. */
export const avisarErro = (texto: string) => avisar(texto, 'erro');

function fecharToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  avisarOuvintes();
}

interface OpcoesConfirmar {
  titulo?: string;
  acao?: string;
  perigo?: boolean;
}

/**
 * Pergunta sim/não. Substitui `confirm()`.
 *
 * Só um diálogo por vez: se já houver um aberto, o novo é recusado
 * (devolve `false`) em vez de empilhar caixas sobre caixas.
 */
export function confirmar(texto: string, opcoes: OpcoesConfirmar = {}): Promise<boolean> {
  if (dialogo) return Promise.resolve(false);
  return new Promise(resolver => {
    dialogo = {
      id: proximoId++,
      titulo: opcoes.titulo,
      texto,
      acao: opcoes.acao ?? 'Confirmar',
      perigo: opcoes.perigo ?? false,
      resolver: r => resolver(r === true),
    };
    avisarOuvintes();
  });
}

interface OpcoesPerguntar {
  titulo?: string;
  acao?: string;
  rotulo?: string;
  valorInicial?: string;
  obrigatorio?: boolean;
}

/**
 * Pede um texto. Substitui `prompt()`.
 * Devolve `null` quando a pessoa cancela — igual ao nativo.
 */
export function perguntar(texto: string, opcoes: OpcoesPerguntar = {}): Promise<string | null> {
  if (dialogo) return Promise.resolve(null);
  return new Promise(resolver => {
    dialogo = {
      id: proximoId++,
      titulo: opcoes.titulo,
      texto,
      acao: opcoes.acao ?? 'Confirmar',
      perigo: false,
      campo: {
        rotulo: opcoes.rotulo ?? '',
        valorInicial: opcoes.valorInicial ?? '',
        obrigatorio: opcoes.obrigatorio ?? false,
      },
      resolver: r => resolver(typeof r === 'string' ? r : null),
    };
    avisarOuvintes();
  });
}

function fecharDialogo(resposta: boolean | string | null) {
  const atual = dialogo;
  dialogo = null;
  avisarOuvintes();
  atual?.resolver(resposta);
}

/* ---------------- a parte visual ---------------- */

function useRepositorio() {
  const [, forcar] = useState(0);
  useEffect(() => {
    const f = () => forcar(n => n + 1);
    ouvintes.add(f);
    return () => { ouvintes.delete(f); };
  }, []);
  return { toasts, dialogo };
}

const ESTILO: Record<Tipo, { fundo: string; icone: React.ReactNode }> = {
  ok: { fundo: 'bg-success-soft border-success/30 text-success-ink', icone: <Check className="w-5 h-5 text-success" /> },
  erro: { fundo: 'bg-danger-soft border-danger/30 text-danger-ink', icone: <AlertTriangle className="w-5 h-5 text-danger" /> },
  info: { fundo: 'bg-info-soft border-info/30 text-info-ink', icone: <Info className="w-5 h-5 text-info" /> },
};

/** Monte uma vez, no layout. */
export function Avisos() {
  const { toasts: lista, dialogo: dlg } = useRepositorio();
  const [texto, setTexto] = useState('');
  const campoRef = useRef<HTMLInputElement>(null);
  const confirmaRef = useRef<HTMLButtonElement>(null);

  // prepara o diálogo quando ele abre: valor inicial e foco
  useEffect(() => {
    if (!dlg) return;
    setTexto(dlg.campo?.valorInicial ?? '');
    const t = setTimeout(() => {
      (dlg.campo ? campoRef.current : confirmaRef.current)?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [dlg?.id]);

  // Escape cancela, como na caixa nativa
  useEffect(() => {
    if (!dlg) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharDialogo(dlg.campo ? null : false);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [dlg?.id]);

  const faltaPreencher = !!dlg?.campo?.obrigatorio && !texto.trim();

  return (
    <>
      {/*
        Os recados ficam EMBAIXO: no celular o topo é onde fica a
        barra do sistema e o polegar não alcança. O recuo de baixo
        soma a área segura do aparelho mais a altura da barra de
        abas, para o aviso não cobrir a navegação.
      */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed left-0 right-0 z-[9998] flex flex-col items-center gap-2 px-4 pointer-events-none
                   bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-6 md:left-auto md:right-6 md:items-end"
      >
        {lista.map(t => (
          <div
            key={t.id}
            role={t.tipo === 'erro' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto w-full md:w-auto md:max-w-md flex items-start gap-3 rounded-card border px-4 py-3 shadow-overlay',
              'motion-safe:animate-[subir_.18s_ease-out]',
              ESTILO[t.tipo].fundo
            )}
          >
            <span className="shrink-0 mt-0.5">{ESTILO[t.tipo].icone}</span>
            <p className="text-sm font-semibold leading-snug flex-1 break-words">{t.texto}</p>
            <button
              onClick={() => fecharToast(t.id)}
              aria-label="Fechar aviso"
              className="shrink-0 -mr-1 -mt-1 p-2 rounded-control opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {dlg && (
        <div
          className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-6"
          onClick={() => fecharDialogo(dlg.campo ? null : false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={dlg.titulo ?? 'Confirmação'}
            onClick={e => e.stopPropagation()}
            className="w-full md:max-w-md bg-surface rounded-t-panel md:rounded-panel shadow-overlay
                       p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:pb-5
                       motion-safe:animate-[subir_.2s_ease-out]"
          >
            <div className="flex gap-3">
              {dlg.perigo && (
                <span className="shrink-0 w-10 h-10 rounded-control bg-danger-soft flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                {dlg.titulo && <h2 className="text-base font-extrabold text-ink mb-1">{dlg.titulo}</h2>}
                <p className="text-sm text-ink-muted leading-snug whitespace-pre-line">{dlg.texto}</p>
              </div>
            </div>

            {dlg.campo && (
              <div className="mt-4">
                {dlg.campo.rotulo && (
                  <label htmlFor="campo-dialogo" className="block text-mini font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                    {dlg.campo.rotulo}
                  </label>
                )}
                <input
                  id="campo-dialogo"
                  ref={campoRef}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !faltaPreencher) fecharDialogo(texto); }}
                  /* 16px: abaixo disso o iPhone dá zoom sozinho ao focar */
                  className="w-full px-3 py-3 text-base bg-surface-sunken border border-line rounded-control
                             outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            )}

            {/* confirmar vem primeiro no DOM? não: cancelar à esquerda,
                confirmar à direita, que é onde o polegar espera */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => fecharDialogo(dlg.campo ? null : false)}
                className="flex-1 min-h-12 px-4 rounded-control font-bold text-sm text-ink-muted
                           bg-surface-sunken border border-line active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button
                ref={confirmaRef}
                disabled={faltaPreencher}
                onClick={() => fecharDialogo(dlg.campo ? texto : true)}
                className={cn(
                  'flex-1 min-h-12 px-4 rounded-control font-black text-sm active:scale-95 transition-transform',
                  'disabled:opacity-50 disabled:pointer-events-none',
                  dlg.perigo
                    ? 'bg-danger text-ink-inverse'
                    : 'bg-brand text-brand-ink'
                )}
              >
                {dlg.acao}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
