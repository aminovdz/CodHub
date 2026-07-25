import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 });

    const html = await res.text();

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    
    // Extract images (e.g. from meta og:image or standard img tags)
    const images: string[] = [];
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) images.push(ogImageMatch[1]);
    
    // Match standard img tags
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let imgMatch;
    let imgCount = 0;
    while ((imgMatch = imgRegex.exec(html)) !== null && imgCount < 10) {
      const src = imgMatch[1];
      if (src.startsWith('http') && !src.includes('icon') && !src.includes('logo') && !src.includes('pixel')) {
        if (!images.includes(src)) {
          images.push(src);
          imgCount++;
        }
      }
    }

    const bodyText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);

    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const description = metaMatch?.[1] || '';

    return NextResponse.json({
      title,
      description,
      images: images.slice(0, 5), // Return top 5 images
      text: bodyText,
      url,
    });
  } catch (err: any) {
    console.error('Fetch URL error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch URL' }, { status: 500 });
  }
}
