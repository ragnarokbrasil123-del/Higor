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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
