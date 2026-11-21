import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp, verifySameOrigin } from "@/lib/request-security";
import { API_BASE_URL, getServerToken, SESSION_COOKIE_NAME } from "@/lib/server-api";

const ALLOWED_PREFIXES = new Set([
  "kosts",
  "bookings",
  "reviews",
  "posts",
  "articles",
  "locations",
  "wallet",
  "chats",
  "auth",
  "notifications",
  "admin",
]);

// Auth mutations that issue/rotate session cookies must go through /api/auth/*
const BLOCKED_AUTH_SUBPATHS = new Set([
  "login",
  "google",
  "register",
  "onboarding",
  "register-role",
  "switch-role",
]);

async function forward(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
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

  const { path } = await context.params;
  if (
    !path.length ||
    !ALLOWED_PREFIXES.has(path[0]) ||
    path.some(
      (seg) =>
        !seg ||
        seg === "." ||
        seg === ".." ||
        seg.includes("\\") ||
        /[\r\n\0]/.test(seg),
    )
  ) {
    return NextResponse.json({ message: "Rute API tidak diizinkan." }, { status: 400 });
  }

  if (path[0] === "auth" && BLOCKED_AUTH_SUBPATHS.has(path[1] || "")) {
    return NextResponse.json(
      { message: "Gunakan endpoint /api/auth untuk operasi autentikasi ini." },
      { status: 403 },
    );
  }

  const isChatSend =
    req.method === "POST" &&
    path[0] === "chats" &&
    (path.length === 1 || (path[1] === "groups" && path[3] === "messages"));
  if (isChatSend) {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`chat-send:${ip}`, 12, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          message:
            "Terlalu banyak pesan dikirim dalam waktu singkat. Tunggu sebentar sebelum mengirim lagi.",
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
  }
  const targetPath = path.join("/");
  const search = req.nextUrl.search || "";
  const targetUrl = `${API_BASE_URL}/${targetPath}${search}`;

  const token = await getServerToken();
  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const clientIp = getClientIp(req);
  if (clientIp && clientIp !== "unknown") {
    headers.set("x-client-ip", clientIp);
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isMultipart = Boolean(contentType?.includes("multipart/form-data"));
  const isUpload =
    (path[0] === "kosts" && path[1] === "upload-image") ||
    (path[0] === "articles" && path[1] === "upload-image") ||
    isMultipart;

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(isUpload ? 30000 : 15000),
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = isMultipart ? await req.arrayBuffer() : await req.text();
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(targetUrl, init);
    const durationMs = Date.now() - startedAt;
    if (res.status >= 500) {
      logger.error("ApiProxy", "Upstream API 5xx response", {
        method: req.method,
        path: targetPath,
        status: res.status,
        durationMs,
      });
    } else if (res.status >= 400 && res.status !== 401 && res.status !== 404) {
      logger.warn("ApiProxy", "Upstream API 4xx response", {
        method: req.method,
        path: targetPath,
        status: res.status,
        durationMs,
      });
    }
    const bodyText = await res.text();
    const response = new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
    if (res.status === 401) {
      response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    }
    return response;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    if (err instanceof Error && err.name === "TimeoutError") {
      logger.error("ApiProxy", "Upstream API timeout", {
        method: req.method,
        path: targetPath,
        durationMs,
      });
      return NextResponse.json(
        { message: "Koneksi ke Keyloka API timeout. Silakan coba lagi." },
        { status: 504 },
      );
    }
    logger.error("ApiProxy", "Upstream API connection failed", {
      method: req.method,
      path: targetPath,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { message: "Gagal terhubung ke Keyloka API." },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
