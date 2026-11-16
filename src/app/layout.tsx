import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { LiveBackground } from "@/components/LiveBackground";

const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });

// Link previews need absolute URLs. Falls back to the live domain if NEXT_PUBLIC_SITE_URL isn't set.
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://thenotties.xyz");

export const metadata: Metadata = {
  metadataBase: site,
  title: { default: "The Lab · The Notties", template: "%s · The Notties" },
  description: "Vlad's lab is leaking. Raid crates, collect fragments, trade with other troublemakers and assemble your Nottie to lock a guaranteed mint spot. 5,760 coming through the portal.",
  openGraph: {
    title: "The Lab · The Notties",
    description: "Hunt crates. Collect fragments. Assemble a Nottie. Become one of us.",
    images: ["/brand/hero-img-night-v2.webp"],
    siteName: "The Notties",
  },
  twitter: { card: "summary_large_image", site: "@thenottiesworld" },
  icons: { icon: "/brand/logo.png" },
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
