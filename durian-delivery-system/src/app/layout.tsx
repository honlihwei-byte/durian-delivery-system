import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Musang King Preorder",
  description: "Preorder Musang King durian delivery with COD payment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-[#f7f3ea] font-sans text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
