import type { Metadata } from 'next';

/* A vitrine é temporária e não faz parte do app. Indo para produção
   junto com o resto, ela fica aberta no endereço público — este
   `noindex` evita que o Google a liste como se fosse uma tela do
   Clube Olimpo. Apagar a pasta inteira quando a vitrine sair. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
