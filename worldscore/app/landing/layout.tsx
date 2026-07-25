import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";

// The Figma template uses Geist inside the product mockup and Inter in
// the embedded video chrome. Marketing copy falls back to the Helvetica
// stack declared as --font-marketing in globals.css.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter-sans" });

export const metadata: Metadata = {
  title: "Worldscore — Music into living cinematic worlds",
  description:
    "A rough track becomes five visual directions, and each direction can be explored and steered live in real time.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${geist.variable} ${inter.variable} min-h-screen bg-[#0a0a0a] font-marketing text-white`}
    >
      {children}
    </div>
  );
}
