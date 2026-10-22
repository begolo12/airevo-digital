import type { MetadataRoute } from "next";
import { visibleApps } from "@/config/apps";
import { site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const now = new Date();

  const staticRoutes = [
    "",
    "/aplikasi",
    "/work",
    "/about",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : path.startsWith("/legal") ? 0.3 : 0.8,
  }));

  // Halaman checkout dan pesanan sengaja tidak masuk sitemap.
  const appRoutes = visibleApps.map((app) => ({
    url: `${base}${app.marketingHref}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...appRoutes];
}
