import type { Metadata } from "next";
import { Fraunces, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Good News Weekly Edition",
    template: "%s · Good News Weekly Edition",
  },
  description:
    "Ten good things that happened this week, in science, health, nature, and discovery. No politics. No fear.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${newsreader.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
