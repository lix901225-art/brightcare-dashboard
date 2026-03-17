import type { NextConfig } from "next";

// Build the CSP directives — Auth0 domains are included when configured
const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "";
const auth0Src = auth0Domain ? ` https://${auth0Domain}` : "";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${auth0Src}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data:${auth0Src}`,
  "font-src 'self'",
  `connect-src 'self'${auth0Src}`,
  `frame-src 'self'${auth0Src}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: cspDirectives },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

export default nextConfig;
