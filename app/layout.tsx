import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Avisos } from "@/components/ui/Avisos";

const inter = Inter({ subsets: ["latin"] });

/**
 * Fonte de títulos e números de destaque (Olimpo Aqua).
 *
 * `preload: false` DE PROPÓSITO enquanto o visual novo está em
 * aprovação: só a página /design usa a fonte, e pré-carregar um
 * arquivo que o app não desenha custaria LCP em todo mundo à toa.
 * Quando a Etapa 3 aplicar o visual nas abas, isto vira `true`.
 *
 * Só os pesos usados: 600 para título, 700 para número grande.
 */
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--fonte-titulo",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Clube Olimpo",
  description: "Sistema Oficial do Clube Olimpo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clube Olimpo",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  // Necessário para env(safe-area-inset-*) funcionar no iPhone com notch.
  viewportFit: "cover",
  // O zoom volta a ser permitido: os campos agora têm 16px no celular, que
  // era o motivo real de terem travado o zoom (o iOS dava zoom sozinho ao
  // focar um input menor que isso). Bloquear o zoom impede um responsável
  // com baixa visão de ampliar a ficha do filho.
  maximumScale: 5,
  userScalable: true,
  // Sem isto, o teclado do celular sobe POR CIMA da tela: numa ficha longa
  // ele cobre o botão Salvar, a pessoa digita, não alcança o botão, fecha
  // e perde o que escreveu. Com "resizes-content" a página encolhe e o
  // rodapé do diálogo continua alcançável.
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/*
          O Next emite só `mobile-web-app-capable`, o nome padronizado.
          O Safari do iPhone historicamente lê a versão com prefixo — sem
          ela, o atalho na Tela de Início pode abrir dentro do navegador,
          com barra de endereço, em vez de abrir como app. Custa nada ter
          as duas.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} ${sora.variable}`}>
        {children}
        {/* Host dos avisos e diálogos. Fica aqui, e não na página,
            porque o portal dos pais e a tela de login renderizam
            fora da casca principal e também precisam avisar. */}
        <Avisos />
      </body>
    </html>
  );
}
