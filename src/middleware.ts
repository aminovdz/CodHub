import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

const SUPPORTED_REGIONS = ['dz', 'ro', 'co'];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // Skip system routes that do not need storefront rewriting
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/agent') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Get hostname (e.g., 'dz.localhost:3000', 'algerian-beauty.com')
  const hostname = req.headers.get('host') || '';
  const host = hostname.replace('www.', '').split(':')[0].toLowerCase();

  // Extract subdomain assuming format: `subdomain.domain.com`
  // In a local environment it might be `dz.localhost:3000`
  const subdomain = hostname.split('.')[0];
  
  // Check if the subdomain is one of our supported regions
  const isRegion = SUPPORTED_REGIONS.includes(subdomain.toLowerCase());
  
  if (isRegion) {
    // Rewrite path to `/[region]/path`
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
  }

  // Query Supabase dynamic custom domains matching this host
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && host !== 'localhost' && !host.endsWith('.vercel.app')) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/stores?custom_domain=eq.${host}&select=region`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          next: { revalidate: 60 }
        }
      );
      if (res.ok) {
        const stores = await res.json();
        if (stores && stores.length > 0) {
          const region = stores[0].region.toLowerCase();
          return NextResponse.rewrite(new URL(`/${region}${url.pathname}`, req.url));
        }
      }
    } catch (e) {
      console.error("Middleware Supabase custom domain fetch error:", e);
    }
  }

  return NextResponse.next();
}
