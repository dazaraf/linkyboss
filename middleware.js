import { NextResponse } from "next/server";

export async function middleware(req) {
  const { nextUrl } = req;

  // Always allow these paths without any auth check
  if (
    nextUrl.pathname.startsWith("/signin") ||
    nextUrl.pathname.startsWith("/signup") ||
    nextUrl.pathname.startsWith("/api/") ||
    nextUrl.pathname.startsWith("/_next/") ||
    nextUrl.pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // For all other routes, check auth via session token cookie
  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value;

  // If no session token and trying to access protected route, redirect to signin
  if (!sessionToken && nextUrl.pathname !== "/") {
    const signInUrl = new URL("/signin", nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
