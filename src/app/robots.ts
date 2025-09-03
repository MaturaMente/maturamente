import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://maturamente.it";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/", // Allow homepage
          "/*.css", // Allow stylesheets
          "/*.js", // Allow JavaScript files
          "/*.png", // Allow images
          "/*.jpg",
          "/*.jpeg",
          "/*.gif",
          "/*.svg",
          "/*.webp",
          "/*.ico",
          "/pricing", // Allow pricing page
          "/privacy-policy", // Allow privacy policy
          "/terms-and-conditions", // Allow terms and conditions
        ],
        disallow: [
          "/api/", // Disallow all API routes
          "/admin/", // Disallow admin routes
          "/dashboard/", // Disallow user dashboard
          "/settings", // Disallow settings pages
          "/profile", // Disallow profile pages
          "/*?*", // Disallow URLs with query parameters
          "/auth/", // Disallow auth pages
          "/unsubscribe/", // Disallow unsubscribe pages
          "/stripe/", // Disallow Stripe related pages
          "/checkout", // Disallow checkout pages
          "/payment", // Disallow payment pages
          "/*.json", // Disallow JSON files
          "/*.xml", // Disallow XML files (except sitemap)
          "/node_modules/", // Disallow node_modules
          "/.next/", // Disallow Next.js build files
          "/tmp/", // Disallow temporary files
          "/cache/", // Disallow cache files
          "/logs/", // Disallow log files
        ],
      },
      // Special rules for search engines
      {
        userAgent: "Googlebot",
        allow: [
          "/",
          "/pricing",
          "/privacy-policy",
          "/terms-and-conditions",
          "/*.css",
          "/*.js",
          "/*.png",
          "/*.jpg",
          "/*.jpeg",
          "/*.gif",
          "/*.svg",
          "/*.webp",
          "/*.ico",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/auth/",
          "/unsubscribe/",
          "/*?*",
        ],
        crawlDelay: 1, // Be respectful to server resources
      },
      {
        userAgent: "Bingbot",
        allow: [
          "/",
          "/pricing",
          "/privacy-policy",
          "/terms-and-conditions",
          "/*.css",
          "/*.js",
          "/*.png",
          "/*.jpg",
          "/*.jpeg",
          "/*.gif",
          "/*.svg",
          "/*.webp",
          "/*.ico",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/auth/",
          "/unsubscribe/",
          "/*?*",
        ],
        crawlDelay: 2,
      },
      // Block aggressive bots
      {
        userAgent: [
          "AhrefsBot",
          "SemrushBot",
          "MJ12bot",
          "DotBot",
          "AspiegelBot",
          "SurveyBot",
          "MegaIndex.ru",
          "BLEXBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
