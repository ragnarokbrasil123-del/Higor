/* Formatação de data e número do Painel. Funções puras. */

/** 'AAAA-MM-DD' vira Date no meio do dia, para o fuso não jogar para a véspera. */
export const dataLocal = (s: string) => new Date(s.length <= 10 ? `${s}T12:00:00` : s);

export const diaCurto = (s: string) =>
  dataLocal(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export const num = (n: number) => n.toLocaleString('pt-BR');
