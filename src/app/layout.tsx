import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  description: "Grayscale particle reconstruction of Picasso's Guernica.",
  title: "Guernica particles",
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    <body className="m-0 min-h-dvh overflow-hidden bg-black text-white">
      {children}
    </body>
  </html>
);

export default RootLayout;
