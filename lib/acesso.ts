/* ============================================================
   Travas temporárias de acesso.

   Enquanto uma delas está `false`, aquele tipo de login é recusado
   e qualquer sessão antiga daquele papel é descartada na abertura
   do app.

   PARA REABRIR: troque o valor para `true`. É a única mudança
   necessária — nada além disso depende dessas constantes.

   ⚠️ Isto é uma trava de interface, não de banco. O Supabase ainda
   está sem RLS (ver Dívida técnica no CLAUDE.md), então ela impede
   o acesso pelo app, não uma consulta feita por fora dele.
   ============================================================ */

/** Professores entram pelo formulário da Equipe. */
export const LOGIN_PROFESSOR_LIBERADO = false;

/** Responsáveis entram pelo portal dos pais. */
export const LOGIN_RESPONSAVEL_LIBERADO = false;
