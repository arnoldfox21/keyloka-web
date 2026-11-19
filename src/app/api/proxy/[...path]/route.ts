import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL, getServerToken, SESSION_COOKIE_NAME } from "@/lib/server-api";

const ALLOWED_PREFIXES = new Set([
  "kosts",
  "bookings",
  "reviews",
  "posts",
  "locations",
  "wallet",
  "chats",
  "auth",
  "notifications",
]);

async function forward(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (
    !path.length ||
    !ALLOWED_PREFIXES.has(path[0]) ||
    path.some((seg) => seg === ".." || seg.includes("\\"))
  ) {
    return NextResponse.json({ message: "Rute API tidak diizinkan." }, { status: 400 });
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
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isUpload =
    (path[0] === "kosts" && path[1] === "upload-image") ||
    Boolean(contentType?.includes("multipart/form-data"));

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(isUpload ? 30000 : 15000),
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const res = await fetch(targetUrl, init);
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
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { message: "Koneksi ke Keyloka API timeout. Silakan coba lagi." },
        { status: 504 },
      );
    }
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
