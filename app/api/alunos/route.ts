import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigir, paginarAdmin, servidorPronto, respostaNaoConfigurado } from '@/lib/rota-protegida';
import { ehAdmin, ehEquipe, sessaoDaRequisicao } from '@/lib/sessao-servidor';
import { auditar } from '@/lib/auditoria';
import {
  CAMPOS_ADMIN, CAMPOS_CONSENTIMENTO, CAMPOS_PROFESSOR,
  COLUNAS_POR_ESCOPO, filtrarCampos, type EscopoAluno,
} from '@/lib/alunos-colunas';

/* ============================================================
   /api/alunos — único caminho de servidor para a tabela `students`.

   Existe para `students` poder recusar a chave publishable (RLS).
   Enquanto qualquer tela ler a tabela direto do navegador, ligar o
   RLS quebra aquela tela — então esta rota é o pré-requisito, e a
   migração das telas é o que de fato permite virar a chave.

   MATRIZ DE PERMISSÃO (a única fonte dela é este arquivo):

     GET  ?escopo=avaliacao   equipe   id, name, level, ativo, modalidade
          ?escopo=nomes       equipe   id, name
          ?escopo=basico      equipe   id, name, level
          ?escopo=completo    ADMIN    ficha inteira (endereço, saúde)
     POST                     ADMIN    cria aluno
     PATCH                    ADMIN    campos da ficha
                              professor  SÓ `level` (promoção de touca)
                              responsável SÓ consentimento, SÓ nos
                                          próprios filhos
     DELETE                   ADMIN    apaga

   O professor não entra em `completo` e não escreve nada além da
   touca. Isso não é cosmético: é a regra de que ele não tem acesso
   ao contato dos pais, agora imposta pelo servidor e não pela tela.
   ============================================================ */

export const dynamic = 'force-dynamic';

const ESCOPOS: EscopoAluno[] = ['avaliacao', 'nomes', 'basico', 'completo'];

export async function GET(req: Request) {
  const escopoBruto = new URL(req.url).searchParams.get('escopo') || 'avaliacao';
  if (!ESCOPOS.includes(escopoBruto as EscopoAluno)) {
    return NextResponse.json({ erro: 'escopo inválido' }, { status: 400 });
  }
  const escopo = escopoBruto as EscopoAluno;

  // a ficha completa tem endereço e dado de saúde: só admin
  const g = exigir(req, escopo === 'completo' ? ehAdmin : ehEquipe);
  if (!g.ok) return g.resposta;

  try {
    const alunos = await paginarAdmin(supabaseAdmin(), 'students', COLUNAS_POR_ESCOPO[escopo], 'name');

    // Audita só `completo`, que é o escopo com endereço e dado de saúde.
    // Auditar `avaliacao` geraria uma linha por abertura de tela do
    // professor, com colunas não sensíveis: ruído que esconderia o que
    // importa quando alguém precisar ler este log de verdade.
    if (escopo === 'completo') {
      await auditar(g.sessao, 'ver_ficha_completa', { entidade: 'students', quantidade: alunos.length });
    }

    return NextResponse.json({ alunos });
  } catch (e: any) {
    console.error('[alunos GET]', e?.message);
    return NextResponse.json({ erro: 'falha ao ler' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = exigir(req, ehAdmin);
  if (!g.ok) return g.resposta;

  try {
    const corpo = await req.json().catch(() => ({}));
    // aceita um aluno ou uma lista (a importação em massa manda lista)
    const lista: any[] = Array.isArray(corpo?.alunos) ? corpo.alunos : [corpo];

    const limpos = lista.map(a => filtrarCampos(a, CAMPOS_ADMIN));
    if (limpos.some(a => !a.name)) {
      return NextResponse.json({ erro: 'aluno sem nome' }, { status: 400 });
    }
    // telefone é sempre gravado só com dígitos — o login do responsável
    // procura por dígitos, e um número formatado nunca casaria
    limpos.forEach(a => {
      if (typeof a.phone === 'string') a.phone = a.phone.replace(/\D/g, '');
    });

    const { data, error } = await supabaseAdmin().from('students').insert(limpos).select('id, name');
    if (error) return NextResponse.json({ erro: error.message }, { status: 400 });

    await auditar(g.sessao, 'criar_aluno', {
      entidade: 'students',
      entidade_id: data?.length === 1 ? data[0].id : undefined,
      quantidade: data?.length,
    });

    return NextResponse.json({ alunos: data });
  } catch {
    return NextResponse.json({ erro: 'falha ao criar' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!servidorPronto()) return respostaNaoConfigurado();

  const sessao = sessaoDaRequisicao(req);
  if (!sessao) return NextResponse.json({ erro: 'sem sessão' }, { status: 401 });

  try {
    const corpo = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(corpo?.ids) ? corpo.ids : corpo?.id ? [corpo.id] : [];
    if (!ids.length) return NextResponse.json({ erro: 'sem id' }, { status: 400 });

    const admin = supabaseAdmin();
    let campos: Record<string, any>;

    if (sessao.papel === 'admin') {
      campos = filtrarCampos(corpo.campos, CAMPOS_ADMIN);
      if (typeof campos.phone === 'string') campos.phone = campos.phone.replace(/\D/g, '');
    } else if (sessao.papel === 'teacher') {
      campos = filtrarCampos(corpo.campos, CAMPOS_PROFESSOR);
    } else {
      // responsável: só consentimento, e só nos filhos DELE. O telefone
      // vem do cookie assinado, não do corpo — senão bastaria mandar o
      // telefone de outra família para escrever na ficha dela.
      campos = filtrarCampos(corpo.campos, CAMPOS_CONSENTIMENTO);
      if (!sessao.tel) return NextResponse.json({ erro: 'sem permissão' }, { status: 403 });

      const { data: meus } = await admin
        .from('students')
        .select('id')
        .eq('phone', sessao.tel)
        .in('id', ids);

      if ((meus?.length ?? 0) !== ids.length) {
        return NextResponse.json({ erro: 'sem permissão' }, { status: 403 });
      }
    }

    if (!Object.keys(campos).length) {
      return NextResponse.json({ erro: 'nenhum campo permitido' }, { status: 400 });
    }

    const { error } = await admin.from('students').update(campos).in('id', ids);
    if (error) return NextResponse.json({ erro: error.message }, { status: 400 });

    // Distingue a ação pelo que foi tocado: "editou a ficha", "cancelou a
    // matrícula" e "promoveu a touca" são eventos diferentes para quem
    // for ler este log depois, mesmo sendo todos um UPDATE.
    const acao =
      sessao.papel === 'client' ? 'consentimento'
      : sessao.papel === 'teacher' ? 'promover_touca'
      : campos.ativo === false ? 'cancelar_matricula'
      : 'editar_ficha';

    await auditar(sessao, acao, {
      entidade: 'students',
      entidade_id: ids.length === 1 ? ids[0] : undefined,
      // só os NOMES dos campos: o valor viraria uma segunda cópia do dado
      campos: Object.keys(campos),
      quantidade: ids.length,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'falha ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const g = exigir(req, ehAdmin);
  if (!g.ok) return g.resposta;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ erro: 'sem id' }, { status: 400 });

  const { error } = await supabaseAdmin().from('students').delete().eq('id', id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 400 });

  await auditar(g.sessao, 'apagar_aluno', { entidade: 'students', entidade_id: id });
  return NextResponse.json({ ok: true });
}
