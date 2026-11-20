import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { verifySameOrigin } from "@/lib/request-security";
import { API_BASE_URL, SESSION_COOKIE_NAME } from "@/lib/server-api";

export async function POST(req: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "Konfigurasi API server belum tersedia." },
      { status: 500 },
    );
  }
  if (!verifySameOrigin(req)) {
    return NextResponse.json(
      { message: "Permintaan lintas situs tidak diizinkan." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const idToken = String(body?.idToken || "").trim();
    if (!idToken) {
      return NextResponse.json(
        { message: "Token Google tidak ditemukan." },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Autentikasi Google gagal." },
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

    const response = NextResponse.json({
      user: data.user,
      isNewUser: Boolean(data.isNewUser),
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err) {
    logger.error("AuthGoogle", "Failed to reach auth backend", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { message: "Gagal menghubungi server autentikasi." },
      { status: 500 },
    );
  }
}
