import { expect, test, type Page } from "@playwright/test";

const TENANT_EMAIL =
  process.env.E2E_TENANT_EMAIL || "e2e.tenant@keyloka.test";
const TENANT_PASSWORD =
  process.env.E2E_TENANT_PASSWORD || "KeylokaE2E!2026";
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || "e2e.owner@keyloka.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || "KeylokaE2E!2026";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("nama@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Masuk dengan Email" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.describe("Auth & Protected Routes", () => {
  test("shows error message on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("nama@email.com").fill("not-a-user@example.com");
    await page.getByPlaceholder("••••••••").fill("wrong-password-123");
    await page.getByRole("button", { name: "Masuk dengan Email" }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("div.bg-red-50")).toBeVisible({ timeout: 10000 });
  });

  for (const protectedPath of [
    "/favorites",
    "/bookings",
    "/profile",
    "/dashboard",
    "/chat",
  ]) {
    test(`redirects unauthenticated user from ${protectedPath} to /login`, async ({
      page,
    }) => {
      await page.goto(protectedPath);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("tenant can login, access tenant pages, and is redirected from /dashboard", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await loginAs(page, TENANT_EMAIL, TENANT_PASSWORD);

    for (const path of ["/favorites", "/bookings", "/profile", "/chat"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path));
    }

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByText(/Aktifkan Akun Pemilik|Beralih ke Mode Pemilik|Masuk ke Mode Pemilik/i).first(),
    ).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("owner can login and access /dashboard and /dashboard/new-property", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await loginAs(page, OWNER_EMAIL, OWNER_PASSWORD);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/dashboard/new-property");
    await expect(page).toHaveURL(/\/dashboard\/new-property/);

    expect(pageErrors).toEqual([]);
  });
});
