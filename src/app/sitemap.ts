import { MetadataRoute } from 'next';

// In a real application, you would fetch this from Supabase.
// For now, we generate the sitemap based on the active regions/stores.
const ACTIVE_REGIONS = ['dz', 'ro', 'co'];
const PRODUCT_SLUGS = [
  'magnetic-posture-corrector',
  'massage-gun-elite',
  'smart-led-strip',
  'wireless-earbuds-x1'
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add the base region URLs
  ACTIVE_REGIONS.forEach((region) => {
    sitemapEntries.push({
      url: `${baseUrl}/${region}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    });

    // Add product URLs for each region
    PRODUCT_SLUGS.forEach((slug) => {
      sitemapEntries.push({
        url: `${baseUrl}/${region}/products/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });
  });

  return sitemapEntries;
}
