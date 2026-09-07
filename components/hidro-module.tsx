'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Star, Waves, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Card, EmptyState, Input, PageHeader, PageShell } from '@/components/ui';

/* ============================================================
   Hidro — acervo de exercícios para consulta durante a aula.

   As páginas são arquivos estáticos em /public/hidro, servidos pela
   Vercel. NÃO passam pelo Supabase: 448 imagens no banco comeriam o
   plano gratuito, e imagem estática ainda é servida por CDN, que é
   mais rápido na beira da piscina.

   Marcações e última página vista ficam em localStorage — são de quem
   está com o celular na mão, não da academia.
   ============================================================ */

const TOTAL = 448;
const CHAVE_FAVORITOS = 'olimpo_hidro_favoritos';
const CHAVE_ULTIMA = 'olimpo_hidro_ultima';

const arquivo = (n: number) => `/hidro/p${String(n).padStart(3, '0')}.png`;

function lerFavoritos(): number[] {
  try {
    const bruto = localStorage.getItem(CHAVE_FAVORITOS);
    return bruto ? (JSON.parse(bruto) as number[]) : [];
  } catch {
    return [];
  }
}

export function HidroModule() {
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const [irPara, setIrPara] = useState('');
  const [ultima, setUltima] = useState<number | null>(null);

  useEffect(() => {
    setFavoritos(lerFavoritos());
    const u = Number(localStorage.getItem(CHAVE_ULTIMA) || 0);
    if (u > 0 && u <= TOTAL) setUltima(u);
  }, []);

  const guardar = (lista: number[]) => {
    setFavoritos(lista);
    try { localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(lista)); } catch { /* ignora */ }
  };

  const alternarFavorito = (n: number) =>
    guardar(favoritos.includes(n) ? favoritos.filter(x => x !== n) : [...favoritos, n].sort((a, b) => a - b));

  const abrir = (n: number) => {
    setAberta(n);
    setUltima(n);
    try { localStorage.setItem(CHAVE_ULTIMA, String(n)); } catch { /* ignora */ }
  };

  const paginas = useMemo(
    () => (soFavoritos ? favoritos : Array.from({ length: TOTAL }, (_, i) => i + 1)),
    [soFavoritos, favoritos]
  );

  // navegação do visualizador anda pela lista que está na tela
  const idx = aberta ? paginas.indexOf(aberta) : -1;
  const anterior = idx > 0 ? paginas[idx - 1] : null;
  const proxima = idx >= 0 && idx < paginas.length - 1 ? paginas[idx + 1] : null;

  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberta(null);
      if (e.key === 'ArrowLeft' && anterior) abrir(anterior);
      if (e.key === 'ArrowRight' && proxima) abrir(proxima);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberta, anterior, proxima]);

  const pular = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(irPara);
    if (n >= 1 && n <= TOTAL) { abrir(n); setIrPara(''); }
  };

  return (
    <PageShell width="wide">
      <PageHeader
        icon={Waves}
        title="Hidro"
        description="Acervo de exercícios para consultar durante a aula"
        metric={{ value: favoritos.length, label: 'marcados' }}
      />

      {/* controles */}
      <Card className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2">
          <Button variant={soFavoritos ? 'secondary' : 'primary'} size="sm" onClick={() => setSoFavoritos(false)}>
            Todas ({TOTAL})
          </Button>
          <Button variant={soFavoritos ? 'primary' : 'secondary'} size="sm" onClick={() => setSoFavoritos(true)}>
            <Star className="w-4 h-4" /> Marcadas ({favoritos.length})
          </Button>
        </div>

        <form onSubmit={pular} className="flex gap-2 sm:ml-auto">
          <Input
            type="number" min={1} max={TOTAL} inputMode="numeric"
            value={irPara} onChange={e => setIrPara(e.target.value)}
            placeholder={`Ir para a página (1–${TOTAL})`}
            className="sm:w-56"
          />
          <Button type="submit" variant="secondary" size="sm" className="shrink-0">Abrir</Button>
        </form>
      </Card>

      {ultima && !soFavoritos && (
        <button
          onClick={() => abrir(ultima)}
          className="w-full text-left bg-brand-soft border border-brand-line rounded-card px-4 py-3 hover:bg-brand/10 transition-colors"
        >
          <p className="text-mini font-black text-warning-ink uppercase tracking-wider">Continuar de onde parou</p>
          <p className="text-sm font-bold text-ink mt-0.5">Página {ultima}</p>
        </button>
      )}

      {paginas.length === 0 ? (
        <EmptyState
          icon={<Star className="w-10 h-10" />}
          title="Nenhuma página marcada"
          description="Abra uma página e toque na estrela para guardar os exercícios que você quer usar na aula."
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          {paginas.map(n => (
            <button
              key={n}
              onClick={() => abrir(n)}
              className="relative bg-surface border border-line rounded-card overflow-hidden hover:border-brand transition-colors group"
            >
              <img
                src={arquivo(n)}
                alt={`Página ${n}`}
                loading="lazy"
                className="w-full aspect-[3/4] object-cover object-top bg-white"
              />
              <span className="absolute bottom-0 inset-x-0 bg-surface-raised/80 text-white text-micro font-bold py-1 text-center">
                {n}
              </span>
              {favoritos.includes(n) && (
                <Star className="absolute top-1.5 right-1.5 w-4 h-4 text-brand fill-brand drop-shadow" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* visualizador */}
      {aberta !== null && (
        <div className="fixed inset-0 z-[100] bg-surface-raised/95 flex flex-col">
          <div className="flex items-center gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] shrink-0">
            <span className="text-white font-black text-sm tabular-nums">
              Página {aberta}
              <span className="text-slate-400 font-bold"> de {TOTAL}</span>
            </span>

            <button
              onClick={() => alternarFavorito(aberta)}
              className={cn(
                'ml-auto px-3 py-2 min-h-11 rounded-control text-xs font-bold flex items-center gap-1.5 transition-colors',
                favoritos.includes(aberta) ? 'bg-brand text-brand-ink' : 'bg-white/10 text-white'
              )}
            >
              <Star className={cn('w-4 h-4', favoritos.includes(aberta) && 'fill-current')} />
              {favoritos.includes(aberta) ? 'Marcada' : 'Marcar'}
            </button>

            <button
              onClick={() => setAberta(null)}
              aria-label="Fechar"
              className="p-2 min-w-11 min-h-11 flex items-center justify-center text-white bg-white/10 rounded-control"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* a imagem rola e dá zoom com dois dedos */}
          <div className="flex-1 overflow-auto px-2 pb-2">
            <img src={arquivo(aberta)} alt={`Página ${aberta}`} className="w-full max-w-3xl mx-auto bg-white rounded-card" />
          </div>

          <div className="flex gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
            <button
              onClick={() => anterior && abrir(anterior)}
              disabled={!anterior}
              className="flex-1 h-14 bg-white/10 text-white font-bold rounded-control flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" /> Anterior
            </button>
            <button
              onClick={() => proxima && abrir(proxima)}
              disabled={!proxima}
              className="flex-1 h-14 bg-brand text-brand-ink font-black rounded-control flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-transform"
            >
              Próxima <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
