import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  description: "Grayscale particle reconstruction of the Techint mark.",
  title: "Techint particles",
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en">
    <body className="particle-stage m-0 min-h-dvh overflow-hidden">
      {children}
    </body>
  </html>
);

export default RootLayout;
