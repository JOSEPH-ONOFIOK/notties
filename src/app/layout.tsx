import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { LiveBackground } from "@/components/LiveBackground";
import { BRAND } from "@/lib/game/config";

const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });

// Link previews need absolute URLs. Falls back to the live domain (nottiesraid.fun) if NEXT_PUBLIC_SITE_URL isn't set.
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || BRAND.app);

const description =
  "Vlad's lab is leaking. Raid crates, collect 8 parts, trade with other troublemakers and assemble your Nottie to lock a guaranteed spot in the free mint. 5,760 coming through the portal.";

export const metadata: Metadata = {
  metadataBase: site,
  title: { default: "The Lab · The Notties", template: "%s · The Notties" },
  description,
  applicationName: "The Notties: The Lab",
  keywords: ["The Notties", "Notties", "NFT", "free mint", "Vlad's Lab", "Robinhood City", "pre-mint game", "GTD"],
  authors: [{ name: "The Notties", url: BRAND.site }],
  creator: "The Notties",
  publisher: "The Notties",
  category: "games",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  // Icons and share images come from the files in src/app: favicon.ico, icon.png, apple-icon.png,
  // opengraph-image.jpg and twitter-image.jpg.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "The Notties",
    title: "The Lab · The Notties",
    description: "Free mint. Raid crates, finish missions twice a day, collect 8 parts and assemble your Nottie.",
  },
  twitter: {
    card: "summary_large_image",
    site: BRAND.xHandle,
    creator: BRAND.xHandle,
    title: "The Lab · The Notties",
    description: "Free mint. Raid crates, finish missions twice a day, collect 8 parts and assemble your Nottie.",
  },
  other: { "main-site": BRAND.site },
};

export const viewport: Viewport = { themeColor: "#090a07", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dm.variable}>
      <body className="min-h-dvh">
        <LiveBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
