import {
  CAPACIDADE_TOUCA, GRUPO_VERDE_MAIS, NIVEL_UNICO, capLevelOrder, levels,
  type CapLevel,
} from '@/types';

/* ============================================================
   Regras da Grade de Horários: vagas por touca e expediente do
   professor. Tudo puro — nenhuma destas funções toca em React,
   estado ou rede.

   São as regras de negócio mais fáceis de quebrar sem perceber,
   porque dependem de combinações (que touca mistura com qual, o
   que vale no sábado). Ter num arquivo só, sem JSX em volta,
   deixa cada uma legível inteira.
   ============================================================ */

export interface ClassSlot {
  id: string;
  class_id: string;
  cap_color: string; // chave de nível: 'orange', 'green', ...
  student_id: string | null;
}

export interface ClassBlock {
  id: string;
  teacher_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  class_slots?: ClassSlot[];
}

export type Shift = { start: string; end: string };

export interface ProfLite {
  id: string;
  name: string | null;
  username: string | null;
  active: boolean | null;
  schedule: Record<string, { enabled: boolean; shifts: Shift[] }> | null;
}

export const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const DAY_TO_KEY: Record<string, string> = {
  'Segunda-feira': 'seg', 'Terça-feira': 'ter', 'Quarta-feira': 'qua',
  'Quinta-feira': 'qui', 'Sexta-feira': 'sex', 'Sábado': 'sab',
};

export const DAY_KEY_SHORT: Record<string, string> = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb' };

export const CAP_OPTIONS = capLevelOrder.map(key => ({ key, label: levels[key].label, bg: levels[key].bgClass }));

export const emptySlots = () => capLevelOrder.reduce((acc, k) => ({ ...acc, [k]: 0 }), {} as Record<CapLevel, number>);

/**
 * Teto que `nivel` ainda pode alcançar, dado o que já está preenchido nos
 * outros campos do formulário. Amarela/Laranja/Vermelha travam em 0 assim
 * que outra das três tiver vaga (turma de nível único); Verde em diante
 * dividem um teto único de 9 (ver CAPACIDADE_TOUCA em types/index.ts).
 */
export function tetoVagas(nivel: CapLevel, slots: Record<CapLevel, number>): number {
  if (NIVEL_UNICO.includes(nivel)) {
    const outroAtivo = NIVEL_UNICO.some(k => k !== nivel && (slots[k] || 0) > 0);
    return outroAtivo ? 0 : CAPACIDADE_TOUCA[nivel];
  }
  const usadoPelosOutros = GRUPO_VERDE_MAIS.reduce((s, k) => s + (k === nivel ? 0 : (slots[k] || 0)), 0);
  return Math.max(0, CAPACIDADE_TOUCA[nivel] - usadoPelosOutros);
}

// Verifica se a janela [start,end] cabe em algum turno do professor naquele dia
export function windowFits(schedule: ProfLite['schedule'], dayKey: string, start: string, end: string): { ok: boolean; hours: string } {
  /**
   * Sábado é escala: todo funcionário trabalha um sábado sim, outro não.
   * Um horário semanal fixo não consegue representar isso, então não há o
   * que conferir — e um aviso de "fora do expediente" aqui seria sempre
   * falso. É a mesma razão pela qual a aba de sábado agrupa por horário e
   * não mostra professor.
   */
  if (dayKey === 'sab') return { ok: true, hours: 'escala alternada' };

  const d = schedule?.[dayKey];
  if (!d?.enabled) return { ok: false, hours: 'folga' };
  const shifts = (Array.isArray(d.shifts) ? d.shifts : []).filter(s => s?.start && s?.end);
  if (!shifts.length) return { ok: false, hours: 'sem horário definido' };
  const ok = shifts.some(s => s.start <= start && end <= s.end);
  return { ok, hours: shifts.map(s => `${s.start}–${s.end}`).join(' / ') };
}

// Resumo textual do horário semanal do professor
export function summarizeProf(schedule: ProfLite['schedule']): string {
  if (!schedule) return 'sem horário cadastrado';
  const parts: string[] = [];
  (['seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const).forEach(k => {
    const d = schedule[k];
    if (!d?.enabled) return;
    const txt = (d.shifts || []).filter(s => s.start && s.end).map(s => `${s.start}–${s.end}`).join(' / ');
    if (txt) parts.push(`${DAY_KEY_SHORT[k]} ${txt}`);
  });
  // o sábado não entra no cadastro semanal: é escala alternada para todos
  if (!parts.length) return 'sem horário na semana  •  sáb escala';
  return parts.join('  •  ') + '  •  sáb escala';
}
