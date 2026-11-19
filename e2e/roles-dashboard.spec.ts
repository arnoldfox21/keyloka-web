import { expect, test, type Page } from "@playwright/test";

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || "e2e.owner@keyloka.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || "KeylokaE2E!2026";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "e2e.staff@keyloka.test";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "KeylokaE2E!2026";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e.admin@keyloka.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "KeylokaE2E!2026";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("nama@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Masuk dengan Email" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.describe("Role-based Dashboard Flows (Owner, Staff, Administrator)", () => {
  test("PEMILIK_KOST can switch all owner dashboard tabs and open new-property form", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await loginAs(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    await expect(
      page.getByRole("button", { name: /Properti Saya/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Sengketa/i }).click();
    await page.getByRole("button", { name: /Dompet & Tarik Dana/i }).click();

    await page.goto("/dashboard/new-property");
    await expect(page).toHaveURL(/\/dashboard\/new-property/);
    await expect(
      page.getByPlaceholder("Contoh: Kost Eksklusif Melati Lowokwaru"),
    ).toBeVisible();

    // Pastikan tidak ada teks teknikal dan pilih foto tidak langsung upload ke R2
    await expect(page.getByText("Pilih Foto Properti")).toBeVisible();
    await expect(page.getByText(/WebP|kompres/i)).toHaveCount(0);

    let uploadImageCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/upload-image")) {
        uploadImageCalled = true;
      }
    });

    const tinyPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "test-room.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });

    await expect(page.getByText("1 foto ditambahkan")).toBeVisible();
    await expect(page.locator('img[alt="Foto properti 1"]')).toHaveAttribute(
      "src",
      /^blob:/,
    );
    expect(uploadImageCalled).toBe(false);

    await page.locator('button[title="Hapus foto"]').click();
    await expect(page.getByText("0 foto ditambahkan")).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("STAFF can access all moderation and management tabs in /dashboard", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    for (const tabLabel of [
      /Approval & Moderasi/i,
      /^Sengketa/i,
      /Ajuan Withdraw/i,
      /Kelola Pengguna/i,
      /Semua Properti/i,
    ]) {
      const tabBtn = page.getByRole("button", { name: tabLabel });
      await expect(tabBtn).toBeVisible();
      await tabBtn.click();
    }

    expect(pageErrors).toEqual([]);
  });

  test("ADMINISTRATOR can access all admin tabs including user role management", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    for (const tabLabel of [
      /Approval & Moderasi/i,
      /^Sengketa/i,
      /Ajuan Withdraw/i,
      /Semua Properti/i,
    ]) {
      await page.getByRole("button", { name: tabLabel }).click();
    }

    await page.getByRole("button", { name: /Kelola Pengguna/i }).click();
    await expect(
      page.locator('select option[value="ADMINISTRATOR"]').first(),
    ).toBeAttached();

    expect(pageErrors).toEqual([]);
  });
});
