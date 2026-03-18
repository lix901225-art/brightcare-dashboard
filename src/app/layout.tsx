import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://brightcareos.com"),
  title: {
    default: "BrightCare OS — Childcare Management Software for BC",
    template: "%s | BrightCare OS",
  },
  description:
    "All-in-one childcare management platform for licensed BC daycare centres and preschools. Enrollment, attendance, billing, ACCB & CCFRI support, parent messaging, and licensing compliance.",
  keywords: [
    "childcare management software",
    "daycare software BC",
    "childcare attendance tracking",
    "daycare billing ACCB",
    "BC childcare centre software",
    "Vancouver daycare management",
    "preschool management",
    "parent communication childcare",
    "licensed capacity tracking",
    "CCFRI childcare",
  ],
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "https://brightcareos.com",
    siteName: "BrightCare OS",
    title: "BrightCare OS — Childcare Management Software for BC",
    description: "All-in-one childcare management platform for licensed BC daycare centres and preschools.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BrightCare OS — Childcare Management for BC",
    description: "Enrollment, attendance, billing, ACCB & CCFRI, parent messaging, and licensing compliance.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BrightCare",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "BrightCare OS",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Childcare management software for licensed BC daycare centres. Enrollment, attendance, billing, parent messaging, and licensing compliance.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "CAD",
              },
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
