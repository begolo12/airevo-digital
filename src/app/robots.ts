import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Halaman transaksi dan area pribadi tidak untuk diindeks.
        disallow: ["/keluarga", "/admin", "/pesanan", "/beli", "/login", "/api"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
