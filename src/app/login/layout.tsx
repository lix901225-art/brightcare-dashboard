import type { Metadata } from "next";
import Auth0ProviderClient from "@/lib/auth0-provider";

export const metadata: Metadata = {
  title: "Sign In — BrightCare OS",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <Auth0ProviderClient>{children}</Auth0ProviderClient>;
}
