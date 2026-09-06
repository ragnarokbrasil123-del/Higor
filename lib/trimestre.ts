/* ============================================================
   Trimestre da avaliação.

   Estava só dentro de components/swimming/constantes.ts. Como o portal
   dos pais precisa da mesma conta para dizer até quando sai a avaliação,
   virou fonte única aqui — o módulo de natação reexporta daqui.
   ============================================================ */

/** Rótulo interno do trimestre de uma data: "2026-T3" */
export function trimestre(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-T${Math.floor(dt.getMonth() / 3) + 1}`;
}

export const TRIMESTRE_ATUAL = trimestre(new Date());

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * O trimestre em palavras, para o responsável: mês de início, mês de fim
 * e o último dia. Nada de "2026-T3", que não diz nada para um pai.
 */
export function periodoTrimestre(d = new Date()) {
  const t = Math.floor(d.getMonth() / 3);      // 0..3
  const primeiroMes = t * 3;
  const ultimoMes = primeiroMes + 2;
  return {
    inicio: MESES[primeiroMes],
    fim: MESES[ultimoMes],
    ano: d.getFullYear(),
    /** Último dia do trimestre — o prazo para a avaliação sair. */
    ultimoDia: new Date(d.getFullYear(), ultimoMes + 1, 0),
  };
}
