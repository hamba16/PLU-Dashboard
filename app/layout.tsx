import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PreviewProvider } from "@/src/Dashboard";
import "@/src/styles.css";
import "@/src/login.css";

const geist = localFont({
  src: "../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PLU | Youth Registration",
  description: "Patriotic League of Uganda youth registration workspace.",
  icons: { icon: "/brand/plu-logo.webp" },
};
export const viewport: Viewport = { themeColor: "#fff200" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <PreviewProvider>{children}</PreviewProvider>
      </body>
    </html>
  );
}
