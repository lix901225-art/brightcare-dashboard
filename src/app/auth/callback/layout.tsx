import Auth0ProviderClient from "@/lib/auth0-provider";

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return <Auth0ProviderClient>{children}</Auth0ProviderClient>;
}
