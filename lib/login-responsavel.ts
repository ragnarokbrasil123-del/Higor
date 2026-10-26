/* ============================================================
   Busca da ficha dos filhos — login e portal do responsável.

   A CREDENCIAL NÃO MUDA: segue telefone + os 4 últimos dígitos,
   exatamente como está impresso no cartão dos pais. O que muda é
   só a forma de procurar a linha no banco.

   O buraco que isto fecha: a consulta antiga casava o telefone por
   pedaço solto (`.ilike('phone', '%digitos%')`). Os dígitos de um
   responsável podiam aparecer NO MEIO do telefone de outra família
   e trazer a ficha da criança errada. E como a senha é o final do
   próprio telefone, um telefone parecido levava a senha parecida
   junto — a senha não barrava o acerto por acidente.

   Aqui são duas travas:
     1. o casamento é só pelo FINAL do número, não por qualquer
        pedaço no meio;
     2. se o resultado cair em mais de um telefone, a consulta se
        recusa a devolver qualquer coisa. Irmãos compartilham o
        MESMO telefone, então dois telefones no resultado só pode
        ser família diferente. Melhor pedir o número completo do
        que mostrar o filho de outra pessoa.

   Estava duplicado no login e no portal, cada um com a sua cópia
   da consulta — e uma correção num lado deixava o outro aberto.
   Fonte única aqui.
   ============================================================ */

import { supabase } from '@/lib/supabase';
import { limparCache } from '@/lib/cache';

/**
 * Só o que o portal mostra na tela, mais o que ele precisa para se
 * reautenticar ao voltar do segundo plano.
 *
 * De propósito NÃO traz `endereco`, `guardian_name` nem `observacoes`
 * — este último guarda alergia e restrição alimentar, que é dado de
 * saúde. O portal nunca exibiu nenhum dos três, e o que não desce
 * para o navegador não fica guardado no aparelho da família depois.
 */
export const COLUNAS_PORTAL =
  'id, name, age, level, phone, password, consentimento_em, consentimento_versao, evaluations(*)';

/**
 * As mesmas colunas, sem as de consentimento — usada só como rede de
 * segurança quando o SQL de consentimento ainda não rodou.
 *
 * Por que isto existe: o Vercel reconstrói sozinho a cada push no main.
 * Se o código subir antes de `sql/2026-10-24-lgpd.sql`, as colunas
 * `consentimento_*` não existem, o PostgREST devolve 42703 e NENHUM
 * responsável consegue entrar. Derrubar 429 famílias por causa da ordem
 * de duas tarefas é inaceitável, então a consulta repete sem elas e o
 * portal segue sem a tela de aceite até o SQL rodar.
 */
export const COLUNAS_PORTAL_SEM_CONSENTIMENTO =
  'id, name, age, level, phone, password, evaluations(*)';

/** Postgres: "column does not exist". */
const COLUNA_INEXISTENTE = '42703';

/**
 * Roda a consulta com as colunas de consentimento e, se elas ainda não
 * existirem, repete sem elas. `filtrar` recebe o builder e aplica o
 * `.ilike`/`.eq` de cada caso.
 */
async function consultarAlunos(filtrar: (q: any) => any) {
  const tentar = (colunas: string) =>
    filtrar(supabase.from('students').select(colunas)).order('name');

  const primeira = await tentar(COLUNAS_PORTAL);
  if (!primeira.error) return primeira;

  if (primeira.error.code === COLUNA_INEXISTENTE) {
    console.warn(
      '[login] Colunas de consentimento ainda não existem no banco. ' +
      'Rode sql/2026-10-24-lgpd.sql para ativar a tela de aceite (ver LGPD.md, item 3.3).'
    );
    return tentar(COLUNAS_PORTAL_SEM_CONSENTIMENTO);
  }

  return primeira;
}

export type FalhaLogin =
  /** telefone ou senha não casaram com ninguém */
  | 'credencial'
  /** casou com mais de uma família: precisa do número completo */
  | 'ambiguo'
  /** o banco não respondeu */
  | 'erro'
  /** o servidor não tem as variáveis e o caminho antigo esbarrou no RLS */
  | 'nao-configurado';

export type ResultadoLogin =
  | { ok: true; filhos: any[] }
  | { ok: false; motivo: FalhaLogin };

/** A mensagem que o responsável lê na tela, por motivo da falha. */
export const MENSAGEM_FALHA: Record<FalhaLogin, string> = {
  credencial: 'Telefone ou Senha incorretos. Tente novamente.',
  ambiguo: 'Digite o telefone completo, com DDD, para continuarmos.',
  erro: 'Não conseguimos consultar agora. Tente de novo em instantes.',
  'nao-configurado': 'Este endereço do app não está configurado para entrar. Use o endereço oficial do clube.',
};

/**
 * Login do responsável.
 *
 * Tenta primeiro a rota de servidor (`/api/login-responsavel`), que é o
 * pré-requisito para ligar o RLS: lá a senha é conferida com a
 * service_role e só as colunas do portal voltam.
 *
 * Enquanto `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada, a rota
 * responde 503 com `fallback: true` e caímos no caminho antigo — assim
 * o código já sobe pronto sem derrubar o login de ninguém. Depois de
 * configurar a key, a rota passa a atender e o caminho de baixo deixa
 * de ser usado; quando o RLS entrar, ele para de funcionar sozinho,
 * porque a chave pública não vai mais ler `students`.
 */
export async function buscarFilhos(telefoneDigitado: string, senha: string): Promise<ResultadoLogin> {
  // troca de usuário no mesmo aparelho: nada da sessão anterior fica
  limparCache();
  const digitos = String(telefoneDigitado || '').replace(/\D/g, '');
  if (digitos.length < 8 || !senha) return { ok: false, motivo: 'credencial' };

  /* A rota disse "ainda não configurado"? Guarda isso: com o RLS ligado,
     o caminho antigo vai falhar logo abaixo, e a mensagem precisa dizer
     "falta configurar o ambiente", não "senha errada". */
  let semVariaveis = false;

  try {
    const resp = await fetch('/api/login-responsavel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: digitos, password: senha }),
    });

    if (resp.ok) {
      const { filhos } = await resp.json();
      return { ok: true, filhos };
    }

    // 503 + fallback = key ainda não configurada: segue pelo caminho antigo
    if (resp.status !== 503) {
      const { motivo } = await resp.json().catch(() => ({ motivo: 'erro' }));
      return { ok: false, motivo: (motivo as FalhaLogin) || 'erro' };
    }
    semVariaveis = true;
    console.warn(
      '[login] SUPABASE_SERVICE_ROLE_KEY não configurada: conferindo a senha no navegador. ' +
      'Configure a key para fechar isto (ver LGPD.md, item 3.1).'
    );
  } catch {
    // rota fora do ar (offline, por exemplo): tenta o caminho antigo
  }

  const { data, error } = await consultarAlunos(q =>
    q
      // `%digitos` e não `%digitos%`: casa pelo FINAL do telefone. Quem
      // digita sem o DDD continua entrando; os dígitos não casam mais no
      // meio do número de outra família.
      .ilike('phone', `%${digitos}`)
      .eq('password', senha)
  );

  if (error) return { ok: false, motivo: semVariaveis ? 'nao-configurado' : 'erro' };
  if (!data?.length) return { ok: false, motivo: 'credencial' };

  const telefones = new Set(data.map((a: any) => String(a.phone || '')));
  if (telefones.size > 1) return { ok: false, motivo: 'ambiguo' };

  return { ok: true, filhos: data };
}

/**
 * Portal: aqui já conhecemos o telefone exato gravado no banco, então
 * o casamento é por igualdade — mais estrito que o do login, porque
 * não há nada para adivinhar.
 *
 * Devolve `null` quando não dá para confirmar; quem chama mantém o que
 * já tinha na tela em vez de esvaziar a ficha do filho.
 */
export async function recarregarFilhos(telefoneGravado: string, senha: string): Promise<any[] | null> {
  const digitos = String(telefoneGravado || '').replace(/\D/g, '');
  if (!digitos || !senha) return null;

  const { data } = await consultarAlunos(q =>
    q.eq('phone', digitos).eq('password', senha)
  );

  return data?.length ? data : null;
}
