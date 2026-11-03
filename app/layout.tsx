import type { Metadata, Viewport } from "next";
import { Radio_Canada_Big, Chivo_Mono } from "next/font/google";
import "./globals.css";

// Radio Canada Big: broadcast-captioning lettering for the caller's words and the UI.
// Chivo Mono: only for ANI/ALI-style readouts (address, callback, timer).
const display = Radio_Canada_Big({ variable: "--ff-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = Chivo_Mono({ variable: "--ff-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Rookie Line: practice 911 calls",
  description:
    "A practice 911 line for trainee call-takers. The caller panics, stammers and gets cut off, voiced live by AssemblyAI's text-to-speech, and a scorecard checks what you caught.",
};

export const viewport: Viewport = { themeColor: "#13161B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
