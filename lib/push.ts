import { supabase } from '@/lib/supabase';

/**
 * Chave VAPID pública — fonte única do lado do cliente.
 *
 * Esta pode ser pública (é ela que o navegador usa para se inscrever); a
 * PRIVADA é que não podia estar no código, e saiu para o ambiente em
 * app/api/push/route.ts. As duas têm de ser do MESMO par: inscrição feita
 * com uma pública e assinatura com outra privada falha em silêncio, em
 * todos os aparelhos ao mesmo tempo.
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function suportaAvisos() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/** true se este aparelho já está inscrito para receber avisos */
export async function jaInscrito() {
  if (!suportaAvisos()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * Pede permissão e registra o aparelho.
 * `phone` liga a inscrição ao responsável (todos os filhos daquele telefone).
 */
export async function ativarAvisos(phone: string, tipo: 'responsavel' | 'admin' = 'responsavel') {
  if (!suportaAvisos()) {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    throw new Error(
      iOS
        ? 'No iPhone os avisos só funcionam depois de adicionar o app à Tela de Início (botão Compartilhar → Adicionar à Tela de Início).'
        : 'Este navegador não suporta avisos. Tente pelo Google Chrome.'
    );
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Os avisos ainda não estão configurados no servidor. Fale com a administração.');
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('Você precisa tocar em "Permitir" para receber os avisos.');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const digitos = (phone || '').replace(/\D/g, '');
  const endpoint = sub.toJSON().endpoint;

  // não duplica o mesmo aparelho
  const { data: existentes } = await supabase.from('push_subscriptions').select('id, subscription').eq('phone', digitos);
  const jaTem = (existentes || []).some((r: any) => r.subscription?.endpoint === endpoint);
  if (!jaTem) {
    const { error } = await supabase.from('push_subscriptions').insert([{ subscription: sub, phone: digitos, tipo }]);
    if (error) throw new Error('Não consegui salvar seu aparelho: ' + error.message);
  }
  return true;
}
