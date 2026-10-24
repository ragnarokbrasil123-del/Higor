import { NextResponse } from 'next/server';
import { supabaseAdmin, temServiceRole } from '@/lib/supabase-admin';
import { COLUNAS_PORTAL, COLUNAS_PORTAL_SEM_CONSENTIMENTO } from '@/lib/login-responsavel';
import { gravarSessao, temSegredoSessao } from '@/lib/sessao-servidor';
import { auditar } from '@/lib/auditoria';

/* ============================================================
   POST /api/login-responsavel

   Confere telefone + senha NO SERVIDOR e devolve só as colunas do
   portal. A CREDENCIAL É A MESMA: telefone + 4 últimos dígitos. O
   cartão impresso continua valendo; o pai não percebe diferença.

   Por que esta rota existe: enquanto a conferência da senha acontecer
   no navegador, o RLS não pode ser ligado — a chave publishable é
   anônima para o Postgres, que não tem como saber quem está
   perguntando. Tirando a conferência daqui, a tabela `students` pode
   passar a recusar a chave pública por completo.

   Esta rota é o pré-requisito do RLS, não o RLS. Ela sozinha já ajuda
   (a senha deixa de ser comparada no cliente e só as colunas do portal
   saem do servidor), mas o fechamento real vem de
   `alter table students enable row level security` sem policy para
   `anon` — e isso só depois que TODA tela que lê/escreve `students`
   estiver passando por rota de servidor.
   ============================================================ */

/** Nunca cachear: é resposta com dado pessoal, específica de cada família. */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Sem a key configurada, avisa o cliente para seguir pelo caminho
  // antigo em vez de quebrar o login de todos os responsáveis.
  if (!temServiceRole()) {
    return NextResponse.json(
      { erro: 'service_role não configurada', fallback: true },
      { status: 503 }
    );
  }

  try {
    const { phone, password } = await req.json().catch(() => ({} as any));

    const digitos = String(phone || '').replace(/\D/g, '');
    const senha = String(password || '');
    if (digitos.length < 8 || !senha) {
      return NextResponse.json({ motivo: 'credencial' }, { status: 401 });
    }

    // mesma regra do cliente: casa pelo FINAL do telefone, nunca por
    // pedaço no meio do número de outra família
    const consulta = (colunas: string) =>
      supabaseAdmin()
        .from('students')
        .select(colunas)
        .ilike('phone', `%${digitos}`)
        .eq('password', senha)
        .order('name');

    let { data, error } = await consulta(COLUNAS_PORTAL);

    // 42703 = coluna inexistente: o SQL de consentimento ainda não rodou.
    // Repete sem essas colunas em vez de recusar o login de todo mundo
    // por causa da ordem entre o push e a migração.
    if (error?.code === '42703') {
      console.warn('[login-responsavel] Colunas de consentimento ausentes. Rode sql/2026-10-24-lgpd.sql.');
      ({ data, error } = await consulta(COLUNAS_PORTAL_SEM_CONSENTIMENTO));
    }

    if (error) {
      console.error('[login-responsavel]', error.message);
      return NextResponse.json({ motivo: 'erro' }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ motivo: 'credencial' }, { status: 401 });
    }

    // irmãos compartilham o MESMO telefone: dois números = outra família
    const telefones = new Set(data.map((a: any) => String(a.phone || '')));
    if (telefones.size > 1) {
      return NextResponse.json({ motivo: 'ambiguo' }, { status: 409 });
    }

    const resp = NextResponse.json({ filhos: data });

    // Emite a sessão assinada. O telefone vai no cookie (e não no corpo
    // das chamadas seguintes) porque é ele que delimita de quais fichas
    // este responsável pode tratar — se viesse do cliente, bastaria
    // mandar o telefone de outra família.
    const tel = [...telefones][0];
    if (temSegredoSessao()) {
      gravarSessao(resp, { papel: 'client', tel });
    }

    await auditar({ papel: 'client', tel, exp: 0 }, 'login', {
      entidade: 'students',
      quantidade: data.length,
    });

    return resp;
  } catch {
    return NextResponse.json({ motivo: 'erro' }, { status: 500 });
  }
}
