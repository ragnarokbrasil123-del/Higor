import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigir, paginarAdmin } from '@/lib/rota-protegida';
import { ehAdmin, ehMaster } from '@/lib/sessao-servidor';
import { gerarCodigoConvite, validadeConvite } from '@/lib/acesso';
import { auditar } from '@/lib/auditoria';

/* ============================================================
   /api/equipe — único caminho de servidor para `app_users`.

   A tabela guarda a SENHA em texto puro e o CÓDIGO DE CONVITE. Com
   a chave publishable lendo-a, qualquer visitante baixava a senha de
   todos os admins — e com senha de admin, a base inteira, RLS ou
   não. Fechar `students` sem fechar isto não fecharia nada.

   Duas faixas de permissão:
     - **admin**: lista a equipe e cuida do cadastro de professor
       (nome, horário, ativo, login).
     - **master**: só ele convida, gera código novo, corta e reativa
       acesso. É a regra que já existia na aba Acessos, agora imposta
       pelo servidor em vez da interface.

   O CÓDIGO DE CONVITE é gerado AQUI, não no navegador. Antes
   `gerarCodigoConvite()` rodava no cliente e o código ia no insert —
   quem chamasse a API escolheria o próprio código ("AAAA-AAAA") e
   depois o resgataria. Agora o cliente pede um convite e recebe o
   código de volta; ele não escolhe.
   ============================================================ */

export const dynamic = 'force-dynamic';

/** Nunca inclui `password`. */
const COLUNAS_EQUIPE =
  'id, username, role, name, active, schedule, status, is_master, created_at, liberado_em, liberado_por';

/** O master precisa ver o código para ditá-lo à pessoa. */
const COLUNAS_MASTER = `${COLUNAS_EQUIPE}, convite_codigo, convite_expira_em`;

const CAMPOS_PROFESSOR = ['name', 'active', 'schedule'] as const;

function soPermitidos(corpo: any, permitidos: readonly string[]) {
  const limpo: Record<string, any> = {};
  for (const k of permitidos) {
    if (corpo && Object.prototype.hasOwnProperty.call(corpo, k)) limpo[k] = corpo[k];
  }
  return limpo;
}

export async function GET(req: Request) {
  const g = exigir(req, ehAdmin);
  if (!g.ok) return g.resposta;

  const papelFiltro = new URL(req.url).searchParams.get('role');
  const colunas = ehMaster(g.sessao) ? COLUNAS_MASTER : COLUNAS_EQUIPE;

  try {
    const todos = await paginarAdmin<any>(supabaseAdmin(), 'app_users', colunas, 'name');
    const equipe = papelFiltro ? todos.filter(u => u.role === papelFiltro) : todos;
    return NextResponse.json({ equipe });
  } catch (e: any) {
    console.error('[equipe GET]', e?.message);
    return NextResponse.json({ erro: 'falha ao ler' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // a checagem de master vem por ação, logo abaixo
  const g = exigir(req, ehAdmin);
  if (!g.ok) return g.resposta;

  const admin = supabaseAdmin();
  const soMaster = () =>
    NextResponse.json({ erro: 'só o administrador master faz isso' }, { status: 403 });

  try {
    const corpo = await req.json().catch(() => ({} as any));

    switch (corpo.acao) {
      /* ---------------- cadastro de professor (admin) ---------------- */
      case 'salvar-professor': {
        const campos = soPermitidos(corpo, CAMPOS_PROFESSOR);
        if (!String(campos.name || '').trim()) {
          return NextResponse.json({ erro: 'nome obrigatório' }, { status: 400 });
        }
        const { error } = corpo.id
          ? await admin.from('app_users').update(campos).eq('id', corpo.id)
          : await admin.from('app_users').insert([{ ...campos, role: 'teacher' }]);
        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        return NextResponse.json({ ok: true });
      }

      case 'alternar-ativo': {
        // ação própria, e não um 'salvar-professor' com `name` de enfeite:
        // mandar nome só para passar na validação sobrescreveria o nome real
        if (!corpo.id) return NextResponse.json({ erro: 'sem id' }, { status: 400 });
        const { error } = await admin
          .from('app_users').update({ active: corpo.active === true }).eq('id', corpo.id);
        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        return NextResponse.json({ ok: true });
      }

      case 'semear-professores': {
        const linhas: any[] = Array.isArray(corpo.professores) ? corpo.professores : [];
        if (!linhas.length) return NextResponse.json({ erro: 'lista vazia' }, { status: 400 });
        const limpos = linhas.map(p => ({
          ...soPermitidos(p, CAMPOS_PROFESSOR),
          role: 'teacher',
          active: true,
        }));
        const { error } = await admin.from('app_users').insert(limpos);
        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        return NextResponse.json({ ok: true });
      }

      case 'definir-login': {
        const username = String(corpo.username || '').toLowerCase().trim();
        const password = String(corpo.password || '').trim();
        if (!corpo.id || !username || !password) {
          return NextResponse.json({ erro: 'preencha usuário e senha' }, { status: 400 });
        }
        const { error } = await admin
          .from('app_users').update({ username, password }).eq('id', corpo.id);
        if (error) {
          const duplicado = error.message.includes('duplicate');
          return NextResponse.json(
            { erro: duplicado ? 'Esse nome de usuário já está em uso por outra pessoa.' : error.message },
            { status: 400 }
          );
        }
        // quem ganhou poder de entrar no sistema, e por obra de quem
        await auditar(g.sessao, 'definir_login', { entidade: 'app_users', entidade_id: corpo.id });
        return NextResponse.json({ ok: true });
      }

      case 'remover-login': {
        if (!corpo.id) return NextResponse.json({ erro: 'sem id' }, { status: 400 });
        const { error } = await admin
          .from('app_users').update({ username: null, password: null }).eq('id', corpo.id);
        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        return NextResponse.json({ ok: true });
      }

      case 'apagar': {
        if (!corpo.id) return NextResponse.json({ erro: 'sem id' }, { status: 400 });
        // ninguém apaga a própria conta por acidente
        if (corpo.id === g.sessao.uid) {
          return NextResponse.json({ erro: 'não é possível apagar a própria conta' }, { status: 400 });
        }
        const { error } = await admin.from('app_users').delete().eq('id', corpo.id);
        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        await auditar(g.sessao, 'apagar_conta', { entidade: 'app_users', entidade_id: corpo.id });
        return NextResponse.json({ ok: true });
      }

      /* ---------------- convite e acesso (SÓ MASTER) ---------------- */
      case 'convidar': {
        if (!ehMaster(g.sessao)) return soMaster();

        const nome = String(corpo.name || '').trim();
        const papel = corpo.role === 'admin' ? 'admin' : 'teacher';
        const codigo = gerarCodigoConvite();
        const convite = {
          status: 'convidado',
          convite_codigo: codigo,
          convite_expira_em: validadeConvite(),
          role: papel,
          active: true,
        };

        // pessoa que já existe (os professores vieram da planilha) só recebe
        // o convite na linha dela — criar outra duplicaria o professor na Grade
        const { error } = corpo.id
          ? await admin.from('app_users').update(convite).eq('id', corpo.id)
          : await admin.from('app_users').insert([{ ...convite, name: nome }]);

        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        await auditar(g.sessao, 'convidar', { entidade: 'app_users', entidade_id: corpo.id });
        return NextResponse.json({ ok: true, codigo });
      }

      case 'novo-codigo': {
        if (!ehMaster(g.sessao)) return soMaster();
        if (!corpo.id) return NextResponse.json({ erro: 'sem id' }, { status: 400 });

        const codigo = gerarCodigoConvite();
        const { error } = await admin.from('app_users').update({
          convite_codigo: codigo,
          convite_expira_em: validadeConvite(),
          status: 'convidado',
        }).eq('id', corpo.id);
        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        return NextResponse.json({ ok: true, codigo });
      }

      case 'revogar': {
        if (!ehMaster(g.sessao)) return soMaster();
        if (!corpo.id) return NextResponse.json({ erro: 'sem id' }, { status: 400 });
        if (corpo.id === g.sessao.uid) {
          return NextResponse.json({ erro: 'não é possível cortar o próprio acesso' }, { status: 400 });
        }
        const { error } = await admin.from('app_users').update({
          status: 'revogado', convite_codigo: null, convite_expira_em: null,
        }).eq('id', corpo.id);
        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        await auditar(g.sessao, 'revogar_acesso', { entidade: 'app_users', entidade_id: corpo.id });
        return NextResponse.json({ ok: true });
      }

      case 'reativar': {
        if (!ehMaster(g.sessao)) return soMaster();
        if (!corpo.id) return NextResponse.json({ erro: 'sem id' }, { status: 400 });
        const { error } = await admin.from('app_users').update({
          status: 'aprovado',
          liberado_em: new Date().toISOString(),
          // quem liberou vem da SESSÃO, não do corpo: senão daria para
          // registrar a liberação no nome de outra pessoa
          liberado_por: g.sessao.nome ?? null,
        }).eq('id', corpo.id);
        if (error) return NextResponse.json({ erro: error.message }, { status: 400 });
        await auditar(g.sessao, 'reativar_acesso', { entidade: 'app_users', entidade_id: corpo.id });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ erro: 'ação desconhecida' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ erro: 'falha na operação' }, { status: 500 });
  }
}
