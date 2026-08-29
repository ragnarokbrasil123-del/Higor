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

export async function POST(req: Request) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const body = await req.json().catch(() => ({}));

    const title = '🔧 Clube Olimpo';
    const message = body.title ? `Nova Manutenção: ${body.title}` : 'Nova solicitação!';
    const payload = JSON.stringify({ title, body: message });

    const { data: subs } = await supabase.from('push_subscriptions').select('subscription');

    // Dedup por endpoint: o mesmo aparelho pode ter várias inscrições salvas.
    const seen = new Set<string>();
    const unique = (subs || []).filter((row: any) => {
      const ep = row?.subscription?.endpoint;
      if (!ep || seen.has(ep)) return false;
      seen.add(ep);
      return true;
    });

    await Promise.all(
      unique.map(async (row: any) => {
        try {
          await webpush.sendNotification(row.subscription, payload);
        } catch {
          console.error('Push expirado ou bloqueado.');
        }
      })
    );

    return NextResponse.json({ success: true, sent: unique.length });
  } catch (err) {
    return NextResponse.json({ error: 'Falha no servidor' }, { status: 500 });
  }
}
