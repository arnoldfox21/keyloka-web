import { NextResponse } from "next/server";
import { API_BASE_URL, getServerToken, SESSION_COOKIE_NAME } from "@/lib/server-api";

export async function GET() {
  const token = await getServerToken();
  if (!token) {
    return NextResponse.json({ user: null });
  }
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const response = NextResponse.json({ user: null });
      if (res.status === 401 || res.status === 403) {
        response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      }
      return response;
    }
    const user = await res.json();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
