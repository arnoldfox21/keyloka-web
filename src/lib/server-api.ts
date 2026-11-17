import { cookies } from "next/headers";

export const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";

export const SESSION_COOKIE_NAME = "keyloka_token";

export async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function serverFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL or NEXT_PUBLIC_API_URL is not configured");
  }
  const token = await getServerToken();
  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
