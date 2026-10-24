/* ============================================================
   Colunas de `students` por finalidade, e os campos que cada papel
   pode escrever.

   Arquivo sem React e sem Supabase de propósito: é importado pelas
   Route Handlers E pelos componentes, e um `import` cruzado de
   cliente para servidor (ou o contrário) arrastaria coisa que não
   deve atravessar.

   A regra que estas listas materializam: cada tela recebe o mínimo.
   Não é estilo — é a regra da casa de que o professor não tem o
   contato dos pais, e é minimização de dado (LGPD Art. 6º, III).
   Um `select('*')` novo em qualquer tela desfaz isto em silêncio.
   ============================================================ */

/** Avaliação de natação (professor e admin). Sem telefone, sem saúde. */
export const COLUNAS_AVALIACAO = 'id, name, level, ativo, modalidade';

/** Só para casar nome com id (Grade, detecção de duplicata). */
export const COLUNAS_NOMES = 'id, name';

/** Agenda do professor: precisa da touca para montar a turma. */
export const COLUNAS_BASICO = 'id, name, level';

/**
 * Painel do admin: igual ao de avaliação, mais o nome do responsável,
 * que a lista de pendências exibe.
 *
 * NÃO traz telefone. O Painel declarava `phone` no tipo mas nunca o
 * usava em tela — era dado de contato descendo para o navegador à toa.
 */
export const COLUNAS_PAINEL = 'id, name, level, ativo, modalidade, guardian_name';

/** Ficha completa — **somente admin**. Inclui endereço e dado de saúde. */
export const COLUNAS_COMPLETO = '*';

export type EscopoAluno = 'avaliacao' | 'nomes' | 'basico' | 'painel' | 'completo';

export const COLUNAS_POR_ESCOPO: Record<EscopoAluno, string> = {
  avaliacao: COLUNAS_AVALIACAO,
  nomes: COLUNAS_NOMES,
  basico: COLUNAS_BASICO,
  painel: COLUNAS_PAINEL,
  completo: COLUNAS_COMPLETO,
};

/* ---------------- o que cada papel pode ESCREVER ---------------- */

/** Admin: a ficha inteira, inclusive situação da matrícula. */
export const CAMPOS_ADMIN = [
  'name', 'age', 'level', 'guardian_name', 'phone', 'password',
  'modalidade', 'endereco', 'observacoes',
  'ativo', 'inativo_em', 'inativo_motivo',
] as const;

/**
 * Professor: **só a touca**, e só porque aprovar numa avaliação promove
 * o aluno. Nada além disso — um professor não corrige endereço nem
 * telefone, e não deve poder.
 */
export const CAMPOS_PROFESSOR = ['level'] as const;

/** Responsável: só o próprio consentimento, e só nos próprios filhos. */
export const CAMPOS_CONSENTIMENTO = [
  'consentimento_em', 'consentimento_por', 'consentimento_versao', 'consentimento_saude',
] as const;

/**
 * Mantém só as chaves permitidas. Descarta o resto em silêncio de
 * propósito: a rota não deve vazar, pela mensagem de erro, quais
 * colunas existem do outro lado.
 */
export function filtrarCampos(corpo: any, permitidos: readonly string[]) {
  const limpo: Record<string, any> = {};
  for (const k of permitidos) {
    if (corpo && Object.prototype.hasOwnProperty.call(corpo, k)) limpo[k] = corpo[k];
  }
  return limpo;
}
