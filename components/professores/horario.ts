/* ============================================================
   Horário de trabalho do professor: formato, montagem e leitura.

   Tudo aqui é PURO — sem React e sem rede. Saiu do módulo porque
   são ~145 linhas que respondem a uma pergunta só ("como é o
   expediente desta pessoa?"), enquanto o componente cuida da tela.

   O formato vive em `app_users.schedule` (jsonb):
     { "seg": { "enabled": true, "shifts": [{ "start": "07:45", "end": "11:30" }] }, ... }

   O `sab` fica desligado para todos menos o André: no sábado a
   escala é em duplas que alternam a cada semana, e um horário
   semanal fixo não representa isso (ver CLAUDE.md).
   ============================================================ */

export type Shift = { start: string; end: string };
export type DaySchedule = { enabled: boolean; shifts: Shift[] };
export type DayKey = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';
export type WeekSchedule = Record<DayKey, DaySchedule>;

export interface Professor {
  id: string;
  name: string | null;
  username: string | null;
  password: string | null;
  role: string;
  active: boolean | null;
  schedule: WeekSchedule | null;
}

export const DAYS: { key: DayKey; label: string; full: string }[] = [
  { key: 'seg', label: 'Seg', full: 'Segunda' },
  { key: 'ter', label: 'Ter', full: 'Terça' },
  { key: 'qua', label: 'Qua', full: 'Quarta' },
  { key: 'qui', label: 'Qui', full: 'Quinta' },
  { key: 'sex', label: 'Sex', full: 'Sexta' },
  { key: 'sab', label: 'Sáb', full: 'Sábado' },
];
export const WEEKDAYS: DayKey[] = ['seg', 'ter', 'qua', 'qui', 'sex'];

export const emptyShift = (): Shift => ({ start: '', end: '' });
export const emptyDay = (enabled = false): DaySchedule => ({ enabled, shifts: [emptyShift()] });

export function emptyWeek(): WeekSchedule {
  return {
    seg: emptyDay(true), ter: emptyDay(true), qua: emptyDay(true),
    qui: emptyDay(true), sex: emptyDay(true), sab: emptyDay(false),
  };
}

export function buildWeek(shifts: Shift[], days: DayKey[] = WEEKDAYS): WeekSchedule {
  const week = {} as WeekSchedule;
  DAYS.forEach(({ key }) => {
    week[key] = days.includes(key)
      ? { enabled: true, shifts: shifts.map(s => ({ ...s })) }
      : emptyDay(false);
  });
  return week;
}

// Conserta um horário possivelmente incompleto vindo do banco
export function normalizeWeek(raw: any): WeekSchedule {
  const base = emptyWeek();
  if (!raw || typeof raw !== 'object') return base;
  DAYS.forEach(({ key }) => {
    const d = raw[key];
    if (d && typeof d === 'object') {
      const shifts = Array.isArray(d.shifts) && d.shifts.length
        ? d.shifts.map((s: any) => ({ start: s?.start || '', end: s?.end || '' })).slice(0, 2)
        : [emptyShift()];
      base[key] = { enabled: !!d.enabled, shifts };
    }
  });
  return base;
}

/**
 * Lista inicial da equipe, conforme "Horarios prof natação atualizado .xlsx"
 * (24/10/2026). Anderson e Caio saíram e por isso não estão aqui.
 *
 * Um dia de semana por professor, exceto:
 *  - ANDRÉ, que só trabalha sábado (único com `sab` ligado — nos demais o
 *    sábado é escala de dupla que alterna, e horário semanal fixo não
 *    representa isso);
 *  - FLÁVIA, que não trabalha terça;
 *  - LIVIA, que tem horário diferente por dia.
 *
 * ⚠️ O botão que usa esta lista INSERE, não reconcilia: apertá-lo com a
 * equipe já cadastrada cria todo mundo de novo, duplicado. Serve para
 * popular uma base vazia.
 */
export const INITIAL_PROFESSORS: { name: string; schedule: WeekSchedule }[] = [
  { name: 'ANDRÉ LUIZ PAIVA DA SILVA', schedule: buildWeek([{ start: '07:15', end: '14:15' }], ['sab']) },
  { name: 'DOUGLAS GOMES DE ARAÚJO', schedule: buildWeek([{ start: '13:00', end: '17:30' }]) },
  { name: 'EDUARDO DOS SANTOS DA SILVA', schedule: buildWeek([{ start: '17:30', end: '21:15' }]) },
  // sem terça
  { name: 'FLÁVIA REIS LIMA', schedule: buildWeek([{ start: '17:30', end: '21:15' }], ['seg', 'qua', 'qui', 'sex']) },
  { name: 'ISABELLA KATHELYN GONÇALVES ROCHA', schedule: buildWeek([{ start: '13:00', end: '17:30' }]) },
  { name: 'LETÍCIA TOLEDO DO ESPIRITO SANTOS', schedule: buildWeek([{ start: '07:00', end: '11:30' }]) },
  // horário por dia: seg 15:15-20:30 · ter e sex 14:30-19:45 · qua e qui 14:30-20:30
  {
    name: 'LIVIA RODRIGUES SOUZA',
    schedule: {
      seg: { enabled: true, shifts: [{ start: '15:15', end: '20:30' }] },
      ter: { enabled: true, shifts: [{ start: '14:30', end: '19:45' }] },
      qua: { enabled: true, shifts: [{ start: '14:30', end: '20:30' }] },
      qui: { enabled: true, shifts: [{ start: '14:30', end: '20:30' }] },
      sex: { enabled: true, shifts: [{ start: '14:30', end: '19:45' }] },
      sab: emptyDay(false),
    },
  },
  { name: 'LUIZ GABRIEL RAMOS DOS SANTOS', schedule: buildWeek([{ start: '08:30', end: '12:15' }]) },
  { name: 'PAULA GABRIELLE GONÇALVES DA SILVA GAMA', schedule: buildWeek([{ start: '07:45', end: '11:30' }]) },
  { name: 'RENÊ GAMA TEIXEIRA', schedule: buildWeek([{ start: '16:45', end: '21:15' }]) },
];

export function fmtShifts(day: DaySchedule): string {
  return day.shifts
    .filter(s => s.start && s.end)
    .map(s => `${s.start}–${s.end}`)
    .join('  •  ');
}

// Agrupa dias seguidos com o mesmo horário: "Seg a Sex  07:00–11:30"
export function summarizeSchedule(raw: WeekSchedule | null): string[] {
  if (!raw) return [];
  const groups: { from: DayKey; to: DayKey; txt: string }[] = [];
  DAYS.forEach(({ key }, idx) => {
    const day = raw[key];
    if (!day?.enabled) return;
    const txt = fmtShifts(day);
    if (!txt) return;
    const last = groups[groups.length - 1];
    const prevIdx = last ? DAYS.findIndex(d => d.key === last.to) : -99;
    if (last && last.txt === txt && idx === prevIdx + 1) {
      last.to = key;
    } else {
      groups.push({ from: key, to: key, txt });
    }
  });
  const lbl = (k: DayKey) => DAYS.find(d => d.key === k)!.label;
  return groups.map(g => (g.from === g.to ? `${lbl(g.from)}  ${g.txt}` : `${lbl(g.from)} a ${lbl(g.to)}  ${g.txt}`));
}

const toMinutes = (t: string): number => {
  const [h, m] = (t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Carga horária semanal (soma dos turnos), em horas com 1 casa decimal
export function weeklyLoadHours(raw: WeekSchedule | null): number {
  if (!raw) return 0;
  let mins = 0;
  DAYS.forEach(({ key }) => {
    const d = raw[key];
    if (!d?.enabled) return;
    (d.shifts || []).forEach(s => {
      if (s.start && s.end) mins += Math.max(0, toMinutes(s.end) - toMinutes(s.start));
    });
  });
  return Math.round((mins / 60) * 10) / 10;
}
