import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunhofer_or_fallback } from "./fonts";
import { getLocale } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lingo — voices that keep a language alive",
  description:
    "A collaborative platform to record, verify and reward spoken contributions in low-resource languages — and build voice models that preserve them.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Lingo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#de9b10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${Plus_Jakarta_Sans.variable} ${Fraunhofer_or_fallback.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
