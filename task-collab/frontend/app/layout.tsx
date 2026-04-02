import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "task-collab",
  description: "Collaboration app scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen flex bg-background text-foreground"
        suppressHydrationWarning
      >
        <div className="flex min-h-screen w-full">
          <aside className="w-64 shrink-0 border-r bg-white/50 dark:bg-black/10">
            <Sidebar />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="shrink-0 border-b bg-white/60 dark:bg-black/10">
              <Header />
            </header>
            <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
