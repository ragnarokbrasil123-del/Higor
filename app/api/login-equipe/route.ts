import { NextResponse } from 'next/server';
import { supabaseAdmin, temServiceRole } from '@/lib/supabase-admin';
import { gravarSessao, temSegredoSessao } from '@/lib/sessao-servidor';
import { contaLiberada, conviteExpirado, normalizarCodigo } from '@/lib/acesso';
import { respostaNaoConfigurado } from '@/lib/rota-protegida';
import { auditar } from '@/lib/auditoria';

/* ============================================================
   /api/login-equipe — login da equipe e resgate de convite.

   A CREDENCIAL NÃO MUDA: mesmo usuário, mesma senha.

   Por que tem de ser no servidor: as três operações aqui precisam
   ler colunas que o navegador não pode mais receber —
   `app_users.password` (comparação do login) e
   `app_users.convite_codigo` (resgate). Enquanto a tela de login
   fizesse `.eq('password', ...)` pela chave publishable, a coluna
   teria de continuar legível por qualquer visitante, e com ela a
   senha de toda a equipe.

   Três ações num arquivo porque compartilham a mesma regra de
   liberação (`contaLiberada`) e as mesmas travas gerais:

     { acao: 'login',          usuario, senha }
     { acao: 'conferir-codigo', codigo }
     { acao: 'criar-acesso',    codigo, usuario, senha }

   `criar-acesso` recebe o CÓDIGO de novo, e não um id vindo do
   cliente: confiar no id permitiria pedir "crie acesso para o id do
   admin" sem ter convite nenhum.
   ============================================================ */

export const dynamic = 'force-dynamic';

/** Só o que a interface precisa — nunca `password` nem o código. */
const COLUNAS_PUBLICAS =
  'id, username, role, name, active, schedule, status, is_master, created_at';

export async function POST(req: Request) {
  if (!temServiceRole()) return respostaNaoConfigurado();

  try {
    const corpo = await req.json().catch(() => ({} as any));
    const admin = supabaseAdmin();

    /* ---------------- login ---------------- */
    if (corpo.acao === 'login') {
      const usuario = String(corpo.usuario || '').toLowerCase().trim();
      const senha = String(corpo.senha || '');
      if (!usuario || !senha) {
        return NextResponse.json({ motivo: 'credencial' }, { status: 401 });
      }

      const { data, error } = await admin
        .from('app_users')
        .select('*')
        .eq('username', usuario)
        .eq('password', senha)
        .maybeSingle();

      if (error) {
        console.error('[login-equipe]', error.message);
        return NextResponse.json({ motivo: 'erro' }, { status: 500 });
      }
      if (!data) return NextResponse.json({ motivo: 'credencial' }, { status: 401 });
      if (!contaLiberada(data)) return NextResponse.json({ motivo: 'bloqueada' }, { status: 403 });

      return await responderComSessao(data);
    }

    /* ---------------- conferir código ---------------- */
    if (corpo.acao === 'conferir-codigo') {
      const codigo = normalizarCodigo(String(corpo.codigo || ''));
      if (!codigo) return NextResponse.json({ motivo: 'nao-encontrado' }, { status: 404 });

      const { data } = await admin
        .from('app_users')
        .select('id, name, role, status, convite_expira_em')
        .eq('convite_codigo', codigo)
        .maybeSingle();

      if (!data) return NextResponse.json({ motivo: 'nao-encontrado' }, { status: 404 });
      if (data.status !== 'convidado') return NextResponse.json({ motivo: 'usado' }, { status: 409 });
      if (conviteExpirado(data.convite_expira_em)) {
        return NextResponse.json({ motivo: 'expirado' }, { status: 410 });
      }

      // devolve só nome e papel: o cliente não precisa do id para nada
      return NextResponse.json({ convidado: { name: data.name, role: data.role } });
    }

    /* ---------------- criar acesso ---------------- */
    if (corpo.acao === 'criar-acesso') {
      const codigo = normalizarCodigo(String(corpo.codigo || ''));
      const usuario = String(corpo.usuario || '').toLowerCase().trim();
      const senha = String(corpo.senha || '');

      if (usuario.length < 4) return NextResponse.json({ motivo: 'usuario-curto' }, { status: 400 });
      if (senha.length < 6) return NextResponse.json({ motivo: 'senha-curta' }, { status: 400 });

      const { data: convidado } = await admin
        .from('app_users')
        .select('id, status, convite_expira_em')
        .eq('convite_codigo', codigo)
        .maybeSingle();

      if (!convidado) return NextResponse.json({ motivo: 'nao-encontrado' }, { status: 404 });
      if (convidado.status !== 'convidado') return NextResponse.json({ motivo: 'usado' }, { status: 409 });
      if (conviteExpirado(convidado.convite_expira_em)) {
        return NextResponse.json({ motivo: 'expirado' }, { status: 410 });
      }

      // usuário é como a pessoa entra: não pode repetir
      const { data: existe } = await admin
        .from('app_users').select('id').eq('username', usuario).maybeSingle();
      if (existe && existe.id !== convidado.id) {
        return NextResponse.json({ motivo: 'usuario-em-uso' }, { status: 409 });
      }

      const { data, error } = await admin
        .from('app_users')
        .update({
          username: usuario,
          password: senha,
          status: 'aprovado',
          convite_codigo: null,
          convite_expira_em: null,
          liberado_em: new Date().toISOString(),
        })
        .eq('id', convidado.id)
        .eq('status', 'convidado') // trava: se alguém usou no meio, não sobrescreve
        .select('*')
        .maybeSingle();

      if (error || !data) return NextResponse.json({ motivo: 'erro' }, { status: 500 });

      return await responderComSessao(data);
    }

    return NextResponse.json({ erro: 'ação desconhecida' }, { status: 400 });
  } catch {
    return NextResponse.json({ motivo: 'erro' }, { status: 500 });
  }
}

/**
 * Devolve a linha SEM a senha e emite a sessão assinada.
 *
 * A interface guarda esta linha no localStorage para saber que abas
 * mostrar. Mandar a senha de volta a gravaria em texto puro no
 * aparelho, sem nenhuma tela precisar dela.
 */
async function responderComSessao(linha: any) {
  const publico: Record<string, any> = {};
  for (const c of COLUNAS_PUBLICAS.split(',').map(s => s.trim())) {
    if (c in linha) publico[c] = linha[c];
  }

  const resp = NextResponse.json({ usuario: publico });

  const sessao = {
    papel: (linha.role === 'admin' ? 'admin' : 'teacher') as 'admin' | 'teacher',
    uid: linha.id,
    // o nome é o que casa as turmas do professor (`lecionaEm`)
    nome: linha.name || linha.username || undefined,
    master: linha.is_master === true,
  };

  if (temSegredoSessao()) gravarSessao(resp, sessao);

  // Entrada de equipe é o evento mais importante do log: é por onde se
  // reconstrói quem teve acesso a quê, e quando.
  await auditar({ ...sessao, exp: 0 }, 'login', { entidade: 'app_users', entidade_id: linha.id });

  return resp;
}
