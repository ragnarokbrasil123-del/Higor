/* ============================================================
   Professor de uma turma.

   Nos dias de semana, `classes.teacher_name` é um nome. No sábado é um
   POSTO: uma dupla que alterna — "LETÍCIA ... / DOUGLAS ...". Todo lugar
   que pergunta "esta turma é do professor X?" precisa passar por aqui,
   senão o sábado some da visão dos dois membros da dupla.
   ============================================================ */

const SEPARADOR = ' / ';

/** Os nomes que dão aula nesta turma — um nos dias de semana, dois no sábado. */
export function professoresDe(teacherName: string | null | undefined): string[] {
  return String(teacherName ?? '')
    .split(SEPARADOR)
    .map(s => s.trim())
    .filter(Boolean);
}

/** `nome` dá aula nesta turma, sozinho ou como parte da dupla? */
export function lecionaEm(teacherName: string | null | undefined, nome: string | null | undefined): boolean {
  if (!nome) return false;
  return professoresDe(teacherName).includes(nome);
}

/** É turma de dupla (sábado)? */
export const ehDupla = (teacherName: string | null | undefined) => professoresDe(teacherName).length > 1;

/**
 * Rótulo curto para tela: "LETÍCIA / DOUGLAS" em vez dos dois nomes
 * completos. Nos dias de semana devolve o nome inteiro.
 */
export function rotuloProfessor(teacherName: string | null | undefined): string {
  const nomes = professoresDe(teacherName);
  if (nomes.length <= 1) return nomes[0] ?? '';
  return nomes.map(n => n.split(' ')[0]).join(SEPARADOR);
}
