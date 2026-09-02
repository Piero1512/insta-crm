// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Insta CRM - Gestión de Construcción & Remodelaciones",
  description: "Plataforma operativa y financiera para contratistas en Florida",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}