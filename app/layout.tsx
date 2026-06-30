import type { Metadata, Viewport } from "next";
import "./enhance.css";

export const metadata: Metadata = {
  title: {
    default: "Galvez & Partners | G&P Advertising",
    template: "%s",
  },
  description:
    "Galvez & Partners (G&P Advertising) — a multicultural advertising & marketing firm in Phoenix, AZ.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The captured Wix pages set <html lang="en"> and <body class="responsive">;
  // we mirror those so the inlined Wix CSS resolves exactly as on the original.
  return (
    <html lang="en">
      <body className="responsive">{children}</body>
    </html>
  );
}
