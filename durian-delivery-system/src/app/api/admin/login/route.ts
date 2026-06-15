import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminSessionSecret,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const sessionSecret = getAdminSessionSecret();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!sessionSecret || !adminPassword) {
    return NextResponse.json(
      { error: "Admin login is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim();

    if (!password || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, sessionSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
