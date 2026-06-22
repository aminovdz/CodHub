import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * We INCLUDE /api so we can protect it, but we bypass auth routes inside the middleware logic.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

const SUPPORTED_REGIONS = ['dz', 'ro', 'co'];

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}


export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // --- AUTHENTICATION LAYER ---
  const isApiAuthRoute = url.pathname.startsWith('/api/auth');
  const isApiNotifyRoute = url.pathname.startsWith('/api/notify'); // Webhooks/Public
  const isAdminRoute = url.pathname.startsWith('/admin') || url.pathname.startsWith('/superadmin');
  const isLoginRoute = url.pathname === '/admin/login' || url.pathname === '/superadmin/login';
  const isProtectedApi = url.pathname.startsWith('/api') && !isApiAuthRoute && !isApiNotifyRoute;

  // If going to a protected route (admin or api)
  if ((isAdminRoute || isProtectedApi) && !isLoginRoute) {
    const token = req.cookies.get('codadmin_token')?.value;

    if (!token) {
      if (isProtectedApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL(url.pathname.startsWith('/superadmin') ? '/superadmin/login' : '/admin/login', req.url));
    }

    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
      }
      const key = new TextEncoder().encode(JWT_SECRET);
      const { jwtVerify } = await import('jose');
      await jwtVerify(token, key);
    } catch (err) {
      if (isProtectedApi) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      return NextResponse.redirect(new URL(url.pathname.startsWith('/superadmin') ? '/superadmin/login' : '/admin/login', req.url));
    }
  }

  // If going to login but already authenticated, redirect to dashboard
  if (isLoginRoute) {
    const token = req.cookies.get('codadmin_token')?.value;
    if (token) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
          throw new Error('JWT_SECRET is not configured');
        }
        const key = new TextEncoder().encode(JWT_SECRET);
        const { jwtVerify } = await import('jose');
        await jwtVerify(token, key);
        const basePath = url.pathname.startsWith('/superadmin') ? '/superadmin' : '/admin';
        return NextResponse.redirect(new URL(basePath, req.url));
      } catch (err) {
        // Token invalid, let them see login page
      }
    }
  }

  // --- STOREFRONT REWRITE LAYER ---
  // Skip system routes that do not need storefront rewriting
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/superadmin') ||
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

  // Custom domain resolution logic moved to the application layer (React Server Components)
  // to avoid runtime database fetches in the Edge Middleware.
  // We pass the resolved host via headers so the layout/page can use standard caching.
  const response = NextResponse.next();
  response.headers.set('x-cod-domain', host);
  return response;

  return NextResponse.next();
}
