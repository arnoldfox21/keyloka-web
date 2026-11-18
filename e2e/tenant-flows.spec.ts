import { expect, test, type Page } from "@playwright/test";

const TENANT_EMAIL =
  process.env.E2E_TENANT_EMAIL || "e2e.tenant@keyloka.test";
const TENANT_PASSWORD =
  process.env.E2E_TENANT_PASSWORD || "KeylokaE2E!2026";

async function loginAsTenant(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("nama@email.com").fill(TENANT_EMAIL);
  await page.getByPlaceholder("••••••••").fill(TENANT_PASSWORD);
  await page.getByRole("button", { name: "Masuk dengan Email" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.describe("Tenant & Interactive Public Flows", () => {
  test("can compare 2 properties in CompareModal", async ({ page }) => {
    await page.goto("/");

    const cards = page.locator('a[href^="/kost/"]');
    const count = await cards.count();
    test.skip(count < 2, "Butuh minimal 2 data kost untuk menguji CompareModal.");

    await page.getByRole("button", { name: "Bandingkan" }).click();
    await page.getByRole("button", { name: "Pilih bandingkan" }).first().click();
    await page.getByRole("button", { name: "Pilih bandingkan" }).first().click();

    const compareBtn = page.getByRole("button", { name: /Bandingkan \(2\/3\)/ });
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();

    await expect(
      page.getByRole("heading", { name: /Perbandingan Properti/i }),
    ).toBeVisible();
  });

  test("tenant can favorite/unfavorite a kost, view /favorites, /profile, /chat, and logout", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await loginAsTenant(page);

    // 1. Buka halaman kost pertama jika ada, lalu toggle favorit
    const firstCard = page.locator('a[href^="/kost/"]').first();
    if ((await page.locator('a[href^="/kost/"]').count()) > 0) {
      const kostHref = await firstCard.getAttribute("href");
      const kostName = (await firstCard.locator("h3").first().textContent())?.trim();

      await firstCard.click();
      await expect(page).toHaveURL(new RegExp(kostHref!.replace("/", "\\/")));

      const favBtn = page.locator('button[title="Simpan ke Favorit"]');
      await expect(favBtn).toBeVisible();
      const favPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/favorite") && res.request().method() === "PATCH",
      );
      await favBtn.click();
      const favRes = await favPromise;
      expect(favRes.ok()).toBeTruthy();
      const favJson = await favRes.json().catch(() => ({}));
      if (favJson?.isFavorite === false) {
        const refavPromise = page.waitForResponse(
          (res) =>
            res.url().includes("/favorite") &&
            res.request().method() === "PATCH",
        );
        await favBtn.click();
        const refavRes = await refavPromise;
        expect(refavRes.ok()).toBeTruthy();
      }

      await page.goto("/favorites");
      await expect(page).toHaveURL(/\/favorites/);
      if (kostName) {
        await expect(page.getByText(kostName).first()).toBeVisible({
          timeout: 10000,
        });
      }

      // Kembalikan state favorit agar bersih
      await page.goto(kostHref!);
      const unfavPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/favorite") && res.request().method() === "PATCH",
      );
      await page.locator('button[title="Simpan ke Favorit"]').click();
      await unfavPromise;
    }

    // 2. Cek halaman Profil
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByText("E2E Tenant").first()).toBeVisible();

    // 3. Cek halaman Chat
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/chat/);

    // 4. Logout dari Navbar
    await page.locator('button[title="Keluar"]').click();
    await expect(page).toHaveURL("/");

    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/login/);

    expect(pageErrors).toEqual([]);
  });

  test("tenant can submit a survey request from kost detail", async ({
    page,
  }) => {
    await loginAsTenant(page);

    const firstCard = page.locator('a[href^="/kost/"]').first();
    const count = await page.locator('a[href^="/kost/"]').count();
    test.skip(count === 0, "Tidak ada data kost di backend lokal.");

    await firstCard.click();

    const surveyBtn = page
      .getByRole("button", { name: "Tanyakan Ketersediaan" })
      .first();
    await expect(surveyBtn).toBeVisible();
    await surveyBtn.click();

    await expect(
      page.getByText("Tanya Ketersediaan & Survei"),
    ).toBeVisible();
    const phoneInput = page
      .locator("form")
      .filter({ hasText: "Nomor HP / WhatsApp" })
      .locator("input")
      .nth(1);
    await phoneInput.fill("081234567890");
    await page.getByRole("button", { name: "Kirim ke Pemilik" }).click();

    await expect(
      page.getByText(
        /Pertanyaan ketersediaan & survei berhasil dikirim|Jadwal survei berhasil dikirim|Anda sudah memiliki jadwal survei yang masih dalam proses/i,
      ),
    ).toBeVisible({ timeout: 10000 });
  });
});
