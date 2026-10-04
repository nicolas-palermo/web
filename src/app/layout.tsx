import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});

export const metadata: Metadata = {
  description:
    "Nicolas Palermo — ML engineer turned product engineer at Plaude.",
  title: "Nicolas Palermo",
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html className={`${manrope.variable} ${instrumentSerif.variable}`} lang="en">
    <body className="bg-background text-foreground m-0 min-h-dvh font-sans antialiased">
      {children}
    </body>
  </html>
);

export default RootLayout;
