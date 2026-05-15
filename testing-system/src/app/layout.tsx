import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Delivery Operations Management Platform",
  description:
    "Manage drivers, routes, deliveries, and field operations in one centralized system. Route assignment, driver tracking, analytics, and real-time visibility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="font-sans">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
