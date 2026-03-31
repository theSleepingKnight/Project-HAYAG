import type { Metadata } from "next";
import { Inter, Zilla_Slab } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const zillaSlab = Zilla_Slab({
  variable: "--font-zilla-slab",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "H·A·Y·A·G | DepEd Region IX",
  description: "Holistic Analysis of Yearly Accomplishments and Governance - DepEd Region IX",
  icons: {
    icon: '/favicon.png?v=2',
    shortcut: '/favicon.png?v=2',
    apple: '/favicon.png?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${zillaSlab.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
