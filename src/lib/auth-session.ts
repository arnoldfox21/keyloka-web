import { NextRequest, NextResponse } from "next/server";
import { verifySameOrigin } from "@/lib/request-security";
import {
  API_BASE_URL,
  getServerToken,
  SESSION_COOKIE_NAME,
} from "@/lib/server-api";

export async function forwardAuthRoleMutation(
  req: NextRequest,
  backendPath: string,
  fallbackError: string,
): Promise<NextResponse> {
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

  const token = await getServerToken();
  if (!token) {
    return NextResponse.json(
      { message: "Sesi login tidak ditemukan. Silakan masuk ulang." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${API_BASE_URL}${backendPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMessage = Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message;
      const errRes = NextResponse.json(
        { message: errorMessage || fallbackError },
        { status: res.status },
      );
      if (res.status === 401) {
        errRes.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      }
      return errRes;
    }

    const response = NextResponse.json({ user: data.user });
    const nextToken = String(data?.accessToken || "");
    if (nextToken) {
      response.cookies.set(SESSION_COOKIE_NAME, nextToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch {
    return NextResponse.json(
      { message: "Gagal menghubungi server autentikasi." },
      { status: 502 },
    );
  }
}
