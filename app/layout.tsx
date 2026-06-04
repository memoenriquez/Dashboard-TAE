import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { Providers } from "./providers";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard de Tiempo Aire",
  description: "Consulta y exporta transacciones de tiempo aire.",
  icons: {
    icon: "/logo/logo.png",
    shortcut: "/logo/logo.png",
    apple: "/logo/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <Script id="strip-cursor-browser-refs" strategy="beforeInteractive">
          {`
            (() => {
              const stripCursorRefs = () => {
                document
                  .querySelectorAll("[data-cursor-ref]")
                  .forEach((element) => element.removeAttribute("data-cursor-ref"));
              };

              stripCursorRefs();

              const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                  if (mutation.type === "attributes") {
                    mutation.target.removeAttribute("data-cursor-ref");
                    continue;
                  }

                  mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) {
                      return;
                    }

                    node.removeAttribute("data-cursor-ref");
                    node
                      .querySelectorAll("[data-cursor-ref]")
                      .forEach((element) => element.removeAttribute("data-cursor-ref"));
                  });
                }
              });

              observer.observe(document.documentElement, {
                attributeFilter: ["data-cursor-ref"],
                attributes: true,
                childList: true,
                subtree: true,
              });

              window.setTimeout(() => observer.disconnect(), 10000);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
