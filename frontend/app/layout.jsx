import { Gelasio, Lato, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const gelasio = Gelasio({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-gelasio",
  display: "swap",
});
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-spline-mono",
  display: "swap",
});

export const metadata = {
  title: "Common Ground — A better kind of everyday",
  description:
    "Thoughtful finds for home, tech and everyday life. Shop the Common Ground edit.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${gelasio.variable} ${lato.variable} ${splineMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
