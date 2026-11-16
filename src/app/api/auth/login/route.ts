import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL, SESSION_COOKIE_NAME } from "@/lib/server-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email dan password wajib diisi." },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMessage = Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message;
      return NextResponse.json(
        { message: errorMessage || "Email atau password salah." },
        { status: res.status },
      );
    }

    const token = String(data?.accessToken || "");
    if (!token) {
      return NextResponse.json(
        { message: "Token autentikasi tidak diterima dari server." },
        { status: 502 },
      );
    }

    const response = NextResponse.json({ user: data.user });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.json(
      { message: "Gagal menghubungi server autentikasi." },
      { status: 500 },
    );
  }
}
