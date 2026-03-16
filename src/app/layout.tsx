import type { Metadata } from "next";
import "./globals.css";
import Auth0ProviderClient from "@/lib/auth0-provider";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Auth0ProviderClient>{children}</Auth0ProviderClient>
      </body>
    </html>
  );
}
