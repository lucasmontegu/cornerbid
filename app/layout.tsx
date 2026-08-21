import type { Metadata } from "next"
import { IBM_Plex_Sans, Outfit } from "next/font/google"
import Script from "next/script"

import "./globals.css"
import { LocaleProvider } from "@/components/locale-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { DATAFAST_DOMAIN, DATAFAST_WEBSITE_ID } from "@/lib/datafast"
import { messages } from "@/lib/i18n"
import { getLocale } from "@/lib/i18n-server"
import { cn } from "@/lib/utils"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
})

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const copy = messages[locale]
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("light antialiased", outfit.variable, ibmPlex.variable, "font-sans")}
    >
      <body className="bg-paper text-ink">
        <ThemeProvider>
          <LocaleProvider initial={locale}>{children}</LocaleProvider>
        </ThemeProvider>
        <Script id="datafast-queue" strategy="beforeInteractive">
          {`window.datafast = window.datafast || function () {
            window.datafast.q = window.datafast.q || [];
            window.datafast.q.push(arguments);
          };`}
        </Script>
        <Script
          src="https://datafa.st/js/script.js"
          strategy="afterInteractive"
          defer
          data-website-id={DATAFAST_WEBSITE_ID}
          data-domain={DATAFAST_DOMAIN}
        />
      </body>
    </html>
  )
}
