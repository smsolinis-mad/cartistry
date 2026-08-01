import { NextRequest } from 'next/server';

function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function expandCandidates(rawUrl: string): string[] {
  const candidates: string[] = [];
  const isDrive = /drive\.google\.com|googleusercontent\.com/.test(rawUrl);

  if (isDrive) {
    const id = extractDriveFileId(rawUrl);
    if (id) {
      candidates.push(`https://drive.google.com/thumbnail?id=${id}&sz=w800`);
      candidates.push(`https://lh3.googleusercontent.com/d/${id}=w800`);
      candidates.push(`https://drive.google.com/uc?export=download&id=${id}`);
    }
  }

  candidates.push(rawUrl);
  return candidates;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return new Response('Missing url param', { status: 400 });
  }

  const candidates = expandCandidates(url);

  for (const candidate of candidates) {
    try {
      const upstream = await fetch(candidate, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      if (!upstream.ok) continue;

      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) continue;

      const buffer = await upstream.arrayBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      continue;
    }
  }

  return new Response('Image not retrievable', { status: 502 });
}
