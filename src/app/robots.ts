import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/demo",
        "/dashboard",
        "/children",
        "/attendance",
        "/billing",
        "/messages",
        "/incidents",
        "/daily-reports",
        "/guardians",
        "/staff-management",
        "/settings",
        "/enrollment",
        "/rooms",
        "/audit",
        "/policies",
        "/parent",
        "/unauthorized",
        "/api",
      ],
    },
    sitemap: "https://brightcareos.com/sitemap.xml",
  };
}
