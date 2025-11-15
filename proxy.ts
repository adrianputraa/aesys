// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  // const { pathname } = req.nextUrl

  // // Example: using next-auth (you can replace with your own session function)
  // const session = req.cookies.get('session');

  // const isAuthPage = pathname.startsWith('/auth');
  // const isProtectedRoute = !isAuthPage && !pathname.startsWith('/api');

  // // If user is NOT logged in and tries to access a protected route → redirect to login
  // if (!session && isProtectedRoute) {
  //   const redirectUrl = new URL('/auth/login', req.url);
  //   redirectUrl.searchParams.set('callbackUrl', pathname); // optional: to return after login
  //   return NextResponse.redirect(redirectUrl);
  // }

  // // If user IS logged in and tries to access /auth/... → redirect to dashboard
  // if (session && isAuthPage) {
  //   return NextResponse.redirect(new URL('/dashboard', req.url));
  // }

  // // Otherwise, let the request pass through
  return NextResponse.next();
}

export const config = {
  /**
   * Run middleware on every route except:
   * - /_next/static/* and /_next/image/*
   * - any .png file
   */
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
