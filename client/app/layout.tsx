import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Podium — AI Debate Platform",
  description: "Real-time AI debate platform with multi-agent intelligence. Solo, 1v1, and group debates with live fallacy detection, coaching, and performance analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#08080f] text-white">{children}</body>
    </html>
  );
}
