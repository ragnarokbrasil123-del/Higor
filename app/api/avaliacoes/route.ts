import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigir } from '@/lib/rota-protegida';
import { ehAdmin, ehEquipe } from '@/lib/sessao-servidor';
import { auditar } from '@/lib/auditoria';

/* ============================================================
   /api/avaliacoes — lançar e apagar avaliação, com autoria.

   A autoria sai da SESSÃO ASSINADA, nunca do corpo da requisição.
   É a diferença entre um registro que serve de prova e um campo
   que o navegador preenche com o nome que quiser.

   POST   equipe   lança a avaliação assinada por quem está logado
   DELETE ADMIN    apaga do histórico, deixando rastro no audit_log

   Apagar é a operação mais delicada: ela remove justamente o
   registro que diria quem errou. Por isso a linha vai para o
   `audit_log` ANTES de ser apagada, com nome do aluno e de quem
   havia avaliado — senão apagar a avaliação apagaria também o
   rastro de que ela existiu.
   ============================================================ */

export const dynamic = 'force-dynamic';

/** Só o que compõe uma avaliação. `avaliador_*` NUNCA vem do cliente. */
const CAMPOS = ['student_id', 'date', 'level', 'scores', 'notes', 'approved'] as const;

export async function POST(req: Request) {
  const g = exigir(req, ehEquipe);
  if (!g.ok) return g.resposta;

  try {
    const corpo = await req.json().catch(() => ({}));

    const limpo: Record<string, any> = {};
    for (const c of CAMPOS) {
      if (Object.prototype.hasOwnProperty.call(corpo, c)) limpo[c] = corpo[c];
    }
    if (!limpo.student_id) return NextResponse.json({ erro: 'sem aluno' }, { status: 400 });

    const { data, error } = await supabaseAdmin()
      .from('evaluations')
      .insert([{
        ...limpo,
        avaliador_id: g.sessao.uid ?? null,
        avaliador_nome: g.sessao.nome ?? null,
        avaliador_papel: g.sessao.papel,
        // veio da sessão conferida no servidor: é autoria de verdade
        avaliador_verificado: true,
      }])
      .select('id')
      .single();

    if (error) return NextResponse.json({ erro: error.message }, { status: 400 });

    await auditar(g.sessao, 'avaliar', {
      entidade: 'students',
      entidade_id: limpo.student_id,
      campos: ['scores', 'approved'],
    });

    return NextResponse.json({ avaliacao: data });
  } catch {
    return NextResponse.json({ erro: 'falha ao salvar' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const g = exigir(req, ehAdmin);
  if (!g.ok) return g.resposta;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ erro: 'sem id' }, { status: 400 });

  const admin = supabaseAdmin();

  // lê antes de apagar: depois do delete não há mais de quem era
  const { data: antes } = await admin
    .from('evaluations')
    .select('student_id, date, avaliador_nome')
    .eq('id', id)
    .maybeSingle();

  const { error } = await admin.from('evaluations').delete().eq('id', id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 400 });

  await auditar(g.sessao, 'apagar_avaliacao', {
    entidade: 'students',
    entidade_id: antes?.student_id,
    // guarda de quem era a avaliação apagada, não o conteúdo dela
    campos: antes?.avaliador_nome ? [`avaliacao_de:${antes.avaliador_nome}`] : undefined,
  });

  return NextResponse.json({ ok: true });
}
