import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SemesterSync - AI Academic Copilot",
  description: "Survive the semester with AI. Upload your syllabi and instantly generate your master calendar, task breakdowns, and survival strategies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col text-white relative overflow-x-hidden selection:bg-blue-500/30" style={{ backgroundColor: 'var(--theme-bg, #0c0e14)' }}>
        {/* Mesh Gradient Background — colors driven by ThemeContext */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-700" style={{ backgroundColor: 'var(--theme-mesh-a, rgba(147,51,234,0.20))' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] transition-colors duration-700" style={{ backgroundColor: 'var(--theme-mesh-b, rgba(59,130,246,0.20))' }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col min-h-full">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
