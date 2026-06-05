import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ),
  title: "Preço Justo — Consulte o Preço Máximo de Medicamentos",
  description: "Não pague mais do que o teto da ANVISA permite. Consulte o Preço Máximo ao Consumidor (PMC) de medicamentos oficial da CMED com o Preço Justo.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Preço Justo — Consulte o Preço Máximo de Medicamentos",
    description: "Evite cobranças abusivas. Consulte o teto legal de preços de remédios da ANVISA/CMED.",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Preço Justo Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Preço Justo — Consulte o Preço Máximo de Medicamentos",
    description: "Evite cobranças abusivas. Consulte o teto legal de preços de remédios da ANVISA/CMED.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Banner de MVP / Protótipo */}
        <div className="w-full bg-secondary border-b border-border text-center py-1 px-4 select-none prototype-banner">
          <div className="max-w-5xl mx-auto text-[9px] sm:text-[11px] font-medium text-muted-foreground leading-normal prototype-text">
            <span className="inline-block bg-primary/10 text-primary border border-primary/20 px-1.5 py-[1px] rounded text-[8px] sm:text-[9px] font-bold tracking-wider uppercase mr-1.5 prototype-badge">
              Protótipo
            </span>
            <span>
              Criado para demonstração. Preços sujeitos a alterações.
            </span>
            <span className="hidden sm:inline">
              {" "}Preços ao vivo sujeitos a bloqueios de scraping.
            </span>
          </div>
        </div>
        {children}
        <Footer />
      </body>
    </html>
  );
}
