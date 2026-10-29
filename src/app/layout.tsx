import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";

export const metadata: Metadata = { title: "Reference Letter Automation", description: "Reference letter requests, approvals and issue (Bank of Maldives · People & Culture).", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f7f5f4" };
// Applies the saved Light/Dark choice before the page paints; "System" (no value) follows the device.
const themeScript = `try{var t=localStorage.getItem("rl_theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><Script id="theme" strategy="beforeInteractive">{themeScript}</Script>{children}</body>
    </html>
  );
}
