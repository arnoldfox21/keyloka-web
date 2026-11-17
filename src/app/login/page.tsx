import { LoginClient } from "@/components/LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const googleClientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "";

  return <LoginClient googleClientId={googleClientId} />;
}
