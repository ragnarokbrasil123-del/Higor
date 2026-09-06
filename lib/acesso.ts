/* ============================================================
   Controle de acesso ao sistema.

   Duas camadas, independentes:

   1. TRAVAS GERAIS (abaixo) — desligam um tipo de login inteiro,
      independente de conta aprovada. Servem para fechar o sistema
      enquanto ele não está pronto para aquele público.

   2. CONVITE + APROVAÇÃO — cada conta tem um `status`. Só o admin
      master convida alguém; a pessoa usa o código para definir a
      própria senha.

   ⚠️ Isto é controle de interface, não de banco. O Supabase segue
   sem RLS (ver Dívida técnica no CLAUDE.md): a chave publishable lê
   `app_users` inteira, códigos e senhas incluídos. Serve para
   organizar quem entra, NÃO para impedir alguém mal-intencionado.
   O que resolve isso de verdade é RLS + senha com hash.
   ============================================================ */

/* ---------------- 1. Travas gerais ---------------- */

/**
 * Professores entram pelo formulário da Equipe.
 * PARA REABRIR: troque para `true`. Enquanto for `false`, nenhum
 * professor entra — nem os que você já tiver aprovado.
 */
export const LOGIN_PROFESSOR_LIBERADO = false;

/** Responsáveis entram pelo portal dos pais. Mesma ideia. */
export const LOGIN_RESPONSAVEL_LIBERADO = true;

/* ---------------- 2. Convite e aprovação ---------------- */

/** Quem manda no sistema. Confere com `is_master` na tabela. */
export const MASTER_EMAIL = 'souza.higor@gmail.com';

export type StatusConta = 'convidado' | 'aprovado' | 'revogado';

/** Quantos dias um convite vale antes de expirar. */
export const CONVITE_DIAS_VALIDADE = 14;

/**
 * Alfabeto do código de convite: sem O/0 e sem I/1, que as pessoas
 * confundem ao ditar por telefone ou anotar no papel.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Gera um código no formato XXXX-XXXX, fácil de ditar. */
export function gerarCodigoConvite() {
  const sorteia = (n: number) =>
    Array.from({ length: n }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('');
  return `${sorteia(4)}-${sorteia(4)}`;
}

/** Data de expiração de um convite criado agora. */
export function validadeConvite() {
  const d = new Date();
  d.setDate(d.getDate() + CONVITE_DIAS_VALIDADE);
  return d.toISOString();
}

export function conviteExpirado(expiraEm?: string | null) {
  if (!expiraEm) return false;
  return new Date(expiraEm).getTime() < Date.now();
}

/** Normaliza o que a pessoa digitou: aceita minúscula, espaço e sem hífen. */
export function normalizarCodigo(bruto: string) {
  const limpo = bruto.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return limpo.length > 4 ? `${limpo.slice(0, 4)}-${limpo.slice(4, 8)}` : limpo;
}

/**
 * A conta consegue entrar agora?
 * Vale para as duas telas de login da equipe e para a sessão salva.
 */
export function contaLiberada(u: { status?: string | null; active?: boolean | null; role?: string }) {
  if (u.active === false) return false;
  // linhas antigas, criadas antes desta coluna existir, contam como aprovadas
  const status = u.status ?? 'aprovado';
  return status === 'aprovado';
}
