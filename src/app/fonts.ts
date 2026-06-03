import { Plus_Jakarta_Sans as JakartaFont, Fraunces } from "next/font/google";

export const Plus_Jakarta_Sans = JakartaFont({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Editorial display serif for headlines.
export const Fraunhofer_or_fallback = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});
