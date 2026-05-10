import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_STORAGE_KEY, THEMES } from "@/lib/themes";
import { Toaster } from "sonner";

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-press-start",
});

const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-vt323",
});

export const metadata: Metadata = {
  title: "SemesterSync",
  description:
    "Upload your syllabi, get every deadline auto-extracted onto one color-coded calendar.",
};

// Inline init script that runs before React hydrates so the chosen theme is
// applied on the very first paint — no flash of the default palette.
const themeInitScript = `
(function() {
  try {
    var valid = ${JSON.stringify(THEMES.map((theme) => theme.id))};
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (t && valid.indexOf(t) !== -1) document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${vt323.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
