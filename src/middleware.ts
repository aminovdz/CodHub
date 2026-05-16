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

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // Skip agent routes or specific paths that don't need region dynamic routing
  if (url.pathname.startsWith('/agent')) {
    return NextResponse.next();
  }

  // Get hostname (e.g., 'dz.localhost:3000', 'ro.mydomain.com')
  const hostname = req.headers.get('host') || '';

  // Extract subdomain assuming format: `subdomain.domain.com`
  // In a local environment it might be `dz.localhost:3000`
  const subdomain = hostname.split('.')[0];
  
  // Check if the subdomain is one of our supported regions
  const isRegion = SUPPORTED_REGIONS.includes(subdomain.toLowerCase());
  
  if (isRegion) {
    // Rewrite path to `/[region]/path`
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
  }

  // Fallback if no specific region matched, maybe redirect to a global landing or default
  // For now, we'll rewrite to dz as default if no subdomain is present during development
  // return NextResponse.rewrite(new URL(`/dz${url.pathname}`, req.url));
  return NextResponse.next();
}
