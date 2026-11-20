import { NextRequest } from "next/server";
import { forwardAuthRoleMutation } from "@/lib/auth-session";

export async function POST(req: NextRequest) {
  return forwardAuthRoleMutation(
    req,
    "/auth/onboarding",
    "Gagal menyimpan onboarding.",
  );
}
