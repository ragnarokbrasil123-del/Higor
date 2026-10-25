import type { CapLevel } from '@/types';

/* ============================================================
   Leitura da planilha colada na importação em massa.

   É um parser inteiro, e todo PURO: entra texto digitado por uma
   pessoa, sai linha estruturada. Nada aqui toca React ou rede.

   O princípio que guia todas as funções: a planilha vem de gente,
   não de sistema. "Terça", "terca", "3a", "TER" são a mesma coisa;
   "8h", "08:00" e "8:00" também. Em vez de recusar, o parser
   adivinha — e marca o palpite com `guessed`, para a prévia poder
   destacar a linha antes de qualquer coisa ser gravada.
   ============================================================ */

export const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/** fixo (padrão), wellhub (aceita "gympass" como sinônimo comum) ou avulso. */
export function parseModalidadeSmart(raw: string): { modalidade: string; guessed: boolean } {
  const k = stripAccents((raw || '').toLowerCase().trim());
  if (!k) return { modalidade: 'fixo', guessed: false };
  if (k.includes('wellhub') || k.includes('gympass') || k.includes('gym pass')) return { modalidade: 'wellhub', guessed: false };
  if (k.includes('avuls')) return { modalidade: 'avulso', guessed: false };
  if (k.includes('fix')) return { modalidade: 'fixo', guessed: false };
  return { modalidade: 'fixo', guessed: true };
}

export function parseLevelSmart(raw: string): { level: CapLevel; guessed: boolean } {
  const k = stripAccents((raw || '').toLowerCase().trim());
  const exact: Record<string, CapLevel> = {
    amarela: 'yellow', laranja: 'orange', vermelha: 'red', verde: 'green',
    'azul claro': 'lightBlue', 'azul escuro': 'darkBlue', preta: 'black',
    yellow: 'yellow', orange: 'orange', red: 'red', green: 'green',
    lightblue: 'lightBlue', darkblue: 'darkBlue', black: 'black',
  };
  if (exact[k]) return { level: exact[k], guessed: false };
  if (k.includes('amarel') || k.includes('bebe')) return { level: 'yellow', guessed: false };
  if (k.includes('laranj')) return { level: 'orange', guessed: false };
  if (k.includes('vermelh')) return { level: 'red', guessed: false };
  if (k.includes('verde')) return { level: 'green', guessed: false };
  if (k.includes('azul') && k.includes('escur')) return { level: 'darkBlue', guessed: false };
  if (k.includes('azul')) return { level: 'lightBlue', guessed: true };
  if (k.includes('pret')) return { level: 'black', guessed: false };
  return { level: 'orange', guessed: true };
}

export const DAY_CANON: Record<string, string> = {
  'segunda-feira': 'Segunda-feira', segunda: 'Segunda-feira', seg: 'Segunda-feira', '2': 'Segunda-feira', '2a': 'Segunda-feira',
  'terca-feira': 'Terça-feira', terca: 'Terça-feira', ter: 'Terça-feira', '3': 'Terça-feira', '3a': 'Terça-feira',
  'quarta-feira': 'Quarta-feira', quarta: 'Quarta-feira', qua: 'Quarta-feira', '4': 'Quarta-feira', '4a': 'Quarta-feira',
  'quinta-feira': 'Quinta-feira', quinta: 'Quinta-feira', qui: 'Quinta-feira', '5': 'Quinta-feira', '5a': 'Quinta-feira',
  'sexta-feira': 'Sexta-feira', sexta: 'Sexta-feira', sex: 'Sexta-feira', '6': 'Sexta-feira', '6a': 'Sexta-feira',
  sabado: 'Sábado', sab: 'Sábado', '7': 'Sábado',
};

export function parseTime(raw: string): string {
  if (!raw) return '';
  const m = stripAccents(raw.toLowerCase()).match(/(\d{1,2})[:h.]?(\d{2})?/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${(m[2] || '00').padStart(2, '0')}`;
}

export const splitCells = (raw: string): string[] => (raw || '').split(/[/,;&]| e /i).map(p => p.trim()).filter(Boolean);

export interface DiaHorario { day: string; time: string }

/** "Segunda 08:00 / Quarta 15:00" — para a prévia da importação. */
export const formatarDiasHorarios = (pares: DiaHorario[]): string =>
  pares.length ? pares.map(dh => `${dh.day.split('-')[0]}${dh.time ? ' ' + dh.time : ''}`).join(' / ') : '—';

/**
 * Junta dia(s) e horário(s) de uma linha da planilha.
 * - Um horário só (ou nenhum): vale para todos os dias da célula "dia".
 * - Vários horários: pareiam por posição com os dias, na mesma ordem
 *   (dia "Segunda-feira/Quarta-feira" + horario "08:00/15:00" vira
 *   Segunda às 08:00, Quarta às 15:00). Se a quantidade não bater, sinaliza.
 */
export function parseDiasHorarios(rawDay: string, rawTime: string): { pares: DiaHorario[]; contagemDivergente: boolean; diaInvalido: boolean } {
  const diasBrutos = splitCells(rawDay);
  const horariosBrutos = splitCells(rawTime);
  if (diasBrutos.length === 0) return { pares: [], contagemDivergente: false, diaInvalido: false };

  if (horariosBrutos.length > 1 && horariosBrutos.length !== diasBrutos.length) {
    return { pares: [], contagemDivergente: true, diaInvalido: false };
  }

  let diaInvalido = false;
  const pares: DiaHorario[] = [];
  diasBrutos.forEach((d, i) => {
    const day = DAY_CANON[stripAccents(d.toLowerCase())];
    if (!day) { diaInvalido = true; return; }
    const timeRaw = horariosBrutos.length > 1 ? horariosBrutos[i] : horariosBrutos[0];
    pares.push({ day, time: parseTime(timeRaw || '') });
  });

  return { pares, contagemDivergente: false, diaInvalido };
}

/** Descobre o separador (tab, ponto e vírgula ou vírgula) pela primeira linha. */
export function splitDelimited(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const first = lines[0];
  const delim = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ',';
  return lines.map(l => l.split(delim).map(c => c.trim().replace(/^"|"$/g, '')));
}

export const HEADER_MAP: Record<string, string> = {
  nome: 'name', aluno: 'name', 'nome do aluno': 'name', crianca: 'name',
  idade: 'age', anos: 'age',
  touca: 'level', nivel: 'level', cor: 'level', categoria: 'level',
  modalidade: 'modalidade', tipo: 'modalidade',
  dia: 'day', dias: 'day', 'dia da semana': 'day',
  horario: 'time', hora: 'time', 'horario da aula': 'time',
  responsavel: 'guardian', 'nome do responsavel': 'guardian', mae: 'guardian', pai: 'guardian',
  telefone: 'phone', whatsapp: 'phone', celular: 'phone', fone: 'phone', contato: 'phone',
  endereco: 'endereco', 'rua/numero': 'endereco',
  observacoes: 'observacoes', observacao: 'observacoes', obs: 'observacoes',
  // senha não é mais pedida no modelo (a senha do responsável já é sabida:
  // 4 últimos dígitos do telefone) — mas se alguém ainda mandar, continua valendo.
  senha: 'password', password: 'password',
};

/** Uma linha da planilha já interpretada, pronta para a prévia. */
export interface BulkRow {
  name: string;
  age: number;
  level: CapLevel;
  modalidade: string;
  guardian: string;
  phone: string;
  password: string;
  endereco: string;
  observacoes: string;
  diasHorarios: DiaHorario[];
  issues: string[];
  skip: boolean;
}
