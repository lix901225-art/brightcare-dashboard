import type { Metadata } from "next";
import "./globals.css";
import Auth0ProviderClient from "@/lib/auth0-provider";

export const metadata: Metadata = {
  title: {
    default: "BrightCare OS",
    template: "%s | BrightCare OS",
  },
  description:
    "All-in-one childcare management platform for daycare centers and preschools. Enrollment, attendance, billing, messaging, and more.",
  keywords: [
    "childcare management",
    "daycare software",
    "preschool admin",
    "attendance tracking",
    "childcare billing",
  ],
  robots: { index: false, follow: false },
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
