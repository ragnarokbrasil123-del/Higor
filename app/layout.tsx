import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Nautilus Eval & CleanList',
  description: 'Swimming evaluations and corporative checklists.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning className="font-sans bg-slate-50 text-slate-900 rendering-auto">
        {children}
      </body>
    </html>
  );
}
