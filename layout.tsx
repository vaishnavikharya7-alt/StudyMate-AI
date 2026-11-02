import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyMate AI — Your Personal AI Learning Companion",
  description:
    "Learn Smarter. Build Faster. Achieve More. StudyMate AI is an AI-powered study companion with a smart assistant, notes & quiz generators, study planner, assignment helper, code assistant and progress tracking.",
  keywords: [
    "StudyMate AI",
    "AI study assistant",
    "student productivity",
    "quiz generator",
    "notes generator",
    "study planner",
  ],
  authors: [{ name: "StudyMate AI" }],
  openGraph: {
    title: "StudyMate AI",
    description: "Your Personal AI Learning Companion — Learn Smarter. Build Faster. Achieve More.",
    siteName: "StudyMate AI",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#15161d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
