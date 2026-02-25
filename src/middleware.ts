import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Root serves landing page; auth check is client-side
  return NextResponse.next();
}
