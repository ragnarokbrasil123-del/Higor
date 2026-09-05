import { NextResponse } from 'next/server';
// @ts-ignore
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

// TODO(segurança): mover a chave VAPID privada para variável de ambiente antes de abrir o repositório.
webpush.setVapidDetails(
  'mailto:contato@clubeolimpo.com',
  'BJx64L626N6Y5tY_D7goVf4l-PO2vpgax3PXFSDN59avftuq8_hWN3Neor_yff2j4GVwWhdWMKC1luKocmhClrg',
  'Hwrxh7oRzI_kxtcjXYLlPDgKMvHH3kmWmOaJ0Hofv8U'
);

/**
 * POST /api/push
 *  - { student_id }  -> avisa o responsável daquele aluno que a avaliação saiu
 *  - { title }       -> aviso de manutenção/limpeza para a equipe (comportamento antigo)
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
