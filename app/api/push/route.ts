import { NextResponse } from 'next/server';
// @ts-ignore
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Suas senhas (já injetadas)
webpush.setVapidDetails(
  'mailto:contato@clubeolimpo.com',
  'BJx64L626N6Y5tY_D7goVf4l-PO2vpgax3PXFSDN59avftuq8_hWN3Neor_yff2j4GVwWhdWMKC1luKocmhClrg',
  'Hwrxh7oRzI_kxtcjXYLlPDgKMvHH3kmWmOaJ0Hofv8U'
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();

    const title = '🔧 Clube Olimpo';
    const message = body.title ? `Nova Manutenção: ${body.title}` : 'Nova solicitação!';

    const payload = JSON.stringify({ title, body: message });

    // Busca todos os celulares autorizados
    const { data: subs } = await supabase.from('push_subscriptions').select('subscription');
    
    if (subs && subs.length > 0) {
      await Promise.all(subs.map(async (row) => {
        try {
          await webpush.sendNotification(row.subscription, payload);
        } catch (e) {
          console.error('Push expirado ou bloqueado.');
        }
      }));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Falha no servidor' }, { status: 500 });
  }
}
