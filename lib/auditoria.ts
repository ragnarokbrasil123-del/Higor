/* ============================================================
   Registro de operações de tratamento (LGPD Art. 37). SÓ NO SERVIDOR.

   Por que fica no servidor, e não no componente: num log de
   auditoria o campo que importa é o "quem". Se ele vier do
   navegador, é autodeclarado — qualquer pessoa grava "foi o admin
   Rony" e o registro não prova nada, nem contra terceiro nem a seu
   favor. Aqui o ator sai da SESSÃO ASSINADA, que o cliente não
   consegue forjar.

   Para que serve na prática, além da conformidade: num incidente o
   Art. 48 obriga informar à ANPD e às famílias a EXTENSÃO do
   vazamento. Sem registro não há como dizer o que saiu, quando nem
   quanto — e também não há como se defender da acusação de que saiu
   mais do que saiu.

   REGRA DE OURO: auditar nunca derruba a operação. Se a gravação
   falhar, a ficha ainda tem de salvar. Um log que impede o trabalho
   é desligado na primeira semana, e aí não há log nenhum.

   ⚠️ Durante o período de fallback (sem SUPABASE_SERVICE_ROLE_KEY)
   as rotas respondem 503 e nada passa por aqui — logo, NÃO HÁ
   auditoria enquanto as variáveis não estiverem configuradas.
   ============================================================ */

import { supabaseAdmin, temServiceRole } from '@/lib/supabase-admin';
import type { Sessao } from '@/lib/sessao-servidor';

export type Acao =
  | 'login'
  | 'ver_ficha_completa'
  | 'criar_aluno'
  | 'editar_ficha'
  | 'cancelar_matricula'
  | 'apagar_aluno'
  | 'promover_touca'
  | 'avaliar'
  | 'apagar_avaliacao'
  | 'consentimento'
  | 'convidar'
  | 'definir_login'
  | 'revogar_acesso'
  | 'reativar_acesso'
  | 'apagar_conta';

interface Alvo {
  entidade?: 'students' | 'app_users';
  entidade_id?: string;
  /** Só os NOMES dos campos tocados. Nunca o valor — ver abaixo. */
  campos?: string[];
  /** Quantas linhas a operação alcançou, quando não é uma só. */
  quantidade?: number;
}

/**
 * Grava uma linha de auditoria.
 *
 * Nunca lança e nunca é esperado por quem chama de forma que possa
 * atrasar a resposta: o `await` existe porque em ambiente serverless
 * uma promessa solta pode ser morta antes de concluir, mas o erro é
 * sempre engolido.
 *
 * O que NÃO entra aqui: o conteúdo dos campos. Guardar o valor
 * antigo transformaria o log numa segunda cópia do endereço e da
 * anotação de saúde — mais superfície de vazamento, não menos.
 */
export async function auditar(sessao: Sessao | null, acao: Acao, alvo: Alvo = {}) {
  if (!temServiceRole()) return;

  try {
    await supabaseAdmin().from('audit_log').insert([{
      ator_id: sessao?.uid ?? null,
      // o responsável não tem linha em app_users: identifica-se pelo telefone
      ator_nome: sessao?.nome ?? (sessao?.tel ? `responsável ${sessao.tel}` : null),
      ator_papel: sessao?.papel ?? null,
      acao,
      entidade: alvo.entidade ?? null,
      entidade_id: alvo.entidade_id ?? null,
      campos: alvo.campos?.length ? alvo.campos : null,
      // coluna criada em sql/2026-10-24-lgpd-parte2.sql. Enquanto não
      // existir, o insert falha com 42703 e cai no catch abaixo: sem
      // registro, mas sem atrapalhar quem está trabalhando.
      quantidade: alvo.quantidade ?? null,
    }]);
  } catch (e: any) {
    // só avisa: a operação de quem chamou segue valendo
    console.error('[auditoria] não consegui registrar', acao, e?.message);
  }
}
