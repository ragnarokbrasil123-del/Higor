import { NextResponse } from 'next/server';
import { apagarSessao } from '@/lib/sessao-servidor';

/* ============================================================
   /api/logout — apaga o cookie de sessão.

   O botão Sair já limpa o `localStorage`, mas isso só esvazia a
   INTERFACE. O cookie é que autoriza as rotas, e ele é HttpOnly:
   o JavaScript da página não consegue apagá-lo. Sem esta rota,
   "sair" deixaria a sessão de servidor viva por 30 dias — num
   aparelho compartilhado da recepção, a pessoa seguinte continuaria
   autorizada a ler a ficha dos alunos.
   ============================================================ */

export const dynamic = 'force-dynamic';

export async function POST() {
  return apagarSessao(NextResponse.json({ ok: true }));
}
