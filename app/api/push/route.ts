import { NextResponse } from 'next/server';
// @ts-ignore
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { supabaseAdmin, temServiceRole } from '@/lib/supabase-admin';

/**
 * Chaves VAPID — vêm do ambiente, nunca do código.
 *
 * A privada ficava escrita aqui. Como o repositório é público, quem a
 * copiou pode enviar push ASSINADO COMO O CLUBE para os responsáveis
 * inscritos: golpe com a marca da escola, chegando como notificação do
 * app. Por isso não basta mover daqui — o par tem de ser GERADO DE NOVO
 * (veja o README de operação), senão a chave antiga continua valendo.
 *
 * A pública também vem do ambiente para não haver duas fontes: se o
 * navegador se inscrever com uma pública e o servidor assinar com outra
 * privada, o push falha silenciosamente em todos os aparelhos.
 */
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contato@clubeolimpo.com';

const vapidOk = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (vapidOk) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * POST /api/push
 *  - { student_id }  -> avisa o responsável daquele aluno que a avaliação saiu
 *  - { title }       -> aviso de manutenção/limpeza para a equipe (comportamento antigo)
 */
export async function POST(req: Request) {
  try {
    // Sem chave configurada não há como assinar: avisa em vez de estourar
    // em toda chamada. A avaliação em si já foi salva quando chegamos aqui,
    // então o certo é não derrubar o fluxo do professor por causa do aviso.
    if (!vapidOk) {
      console.error('[push] VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY não configuradas.');
      return NextResponse.json({ success: false, sent: 0, motivo: 'push não configurado' });
    }

    // Esta rota é servidor: usa a service_role quando houver, senão a
    // publishable. Depois do RLS a publishable não lê mais `students`, e
    // sem isto o aviso ao responsável pararia de sair.
    const supabase = temServiceRole()
      ? supabaseAdmin()
      : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const body = await req.json().catch(() => ({} as any));

    let alvos: any[] = [];
    let titulo = '🔧 Clube Olimpo';
    let mensagem = body.title ? `Nova Manutenção: ${body.title}` : 'Nova solicitação!';

    if (body.student_id) {
      // O telefone fica só no servidor — a tela do professor nunca o recebe.
      const { data: aluno } = await supabase
        .from('students')
        .select('name, phone')
        .eq('id', body.student_id)
        .single();

      if (!aluno?.phone) return NextResponse.json({ success: true, sent: 0, motivo: 'aluno sem telefone' });

      const primeiroNome = String(aluno.name || '').split(' ')[0];
      titulo = '🏊 Clube Olimpo';
      mensagem = `A avaliação de ${primeiroNome} já está disponível. Toque para ver.`;

      const { data } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('phone', aluno.phone)
        .eq('tipo', 'responsavel');
      alvos = data || [];
    } else {
      // equipe: inscrições de admin (e as antigas, que não têm tipo definido)
      const { data } = await supabase.from('push_subscriptions').select('subscription, tipo, phone');
      alvos = (data || []).filter((r: any) => r.tipo !== 'responsavel');
    }

    // dedup por aparelho
    const vistos = new Set<string>();
    const unicos = alvos.filter((row: any) => {
      const ep = row?.subscription?.endpoint;
      if (!ep || vistos.has(ep)) return false;
      vistos.add(ep);
      return true;
    });

    const payload = JSON.stringify({ title: titulo, body: mensagem });
    let enviados = 0;
    await Promise.all(
      unicos.map(async (row: any) => {
        try {
          await webpush.sendNotification(row.subscription, payload);
          enviados++;
        } catch {
          console.error('Push expirado ou bloqueado.');
        }
      })
    );

    return NextResponse.json({ success: true, sent: enviados });
  } catch (err) {
    return NextResponse.json({ error: 'Falha no servidor' }, { status: 500 });
  }
}
