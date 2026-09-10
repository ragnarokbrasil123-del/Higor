import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
