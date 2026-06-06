import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isEmployeeAppHost } from "@/lib/app-url";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, searchParams } = request.nextUrl;

  if (isEmployeeAppHost(host)) {
    if (pathname === "/login") {
      return NextResponse.rewrite(new URL("/employee/login", request.url));
    }
    if (pathname === "/employee/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url, 308);
    }
  }

  if (pathname === "/employee/activate") {
    const token = searchParams.get("token")?.trim();
    if (token) {
      return NextResponse.redirect(
        new URL(`/activate/${encodeURIComponent(token)}`, request.url),
        308,
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/employee/login", "/employee/activate"],
};
