import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:3001';
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, backendUrl);
  return NextResponse.rewrite(target);
}

export const config = { matcher: ['/api/:path*', '/health'] };
