import { expect, test } from "@playwright/test";

test.describe("Smoke & Public Health", () => {
  test("home page loads without fatal errors and displays navbar", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);

    await expect(page.getByRole("link", { name: /Key\s*loka/i }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Jelajah Hunian" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Temukan Hunian Nyaman — Survei Mudah, Booking Aman/i,
      }),
    ).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("user guide modal opens from navbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Panduan", exact: true }).click();
    await expect(
      page.getByText("1. Cari & Bandingkan Hunian"),
    ).toBeVisible();
  });

  test("login page renders email/password form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /Masuk \/ Daftar Keyloka/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("nama@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Masuk dengan Email" }),
    ).toBeVisible();
  });

  test("SEO metadata endpoints return 200", async ({ request }) => {
    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    expect(await robotsRes.text()).toContain("User-Agent");

    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    expect(await sitemapRes.text()).toContain("<urlset");
  });
});
