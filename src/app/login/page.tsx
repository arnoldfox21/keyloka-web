import { LoginClient } from "@/components/LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Read dynamically at runtime so Turbopack does not inline an empty build-time NEXT_PUBLIC_* value.
  const googleClientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env["NEXT_PUBLIC_" + "GOOGLE_CLIENT_ID"] ||
    "";

  return <LoginClient googleClientId={googleClientId} />;
}
