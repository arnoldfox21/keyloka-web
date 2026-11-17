import { expect, test } from "@playwright/test";

test.describe("Discovery & Public Flows", () => {
  test("can filter by category, type, and search keyword", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Cari nama kost, area, kampus, atau jalan...",
    );
    await expect(searchInput).toBeVisible();

    await page.getByRole("button", { name: "Kost", exact: true }).click();
    await page.locator("select").first().selectOption("Putri");

    await searchInput.fill("Malang");
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/proxy/kosts") && res.request().method() === "GET",
    );
    await page.getByRole("button", { name: "Cari Hunian" }).click();
    const res = await responsePromise;
    expect(res.status()).toBe(200);
  });

  test("can toggle between List and Map view", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Peta" }).click();
    await expect(page.locator(".leaflet-container")).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: "Daftar" }).click();
    await expect(page.locator(".leaflet-container")).toBeHidden();
  });

  test("can open kost detail page from listing if data exists", async ({
    page,
  }) => {
    await page.goto("/");

    const firstCard = page.locator('a[href^="/kost/"]').first();
    const count = await page.locator('a[href^="/kost/"]').count();
    test.skip(count === 0, "Tidak ada data kost di backend lokal untuk diuji.");

    const href = await firstCard.getAttribute("href");
    await firstCard.click();
    await expect(page).toHaveURL(new RegExp(href!.replace("/", "\\/")));
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
