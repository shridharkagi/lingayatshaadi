import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Redirect root to onboarding - avoids client-side redirect issues
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  return NextResponse.next();
}
