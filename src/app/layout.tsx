import type { Metadata } from "next";
import "./globals.css";
import Auth0ProviderClient from "@/lib/auth0-provider";

export const metadata: Metadata = {
  title: "BrightCare OS",
  description: "All-in-one childcare management platform for daycare centers and preschools.",
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
