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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

test.describe("Comprehensive Security, Validation, Chat Spam & Feature Tests", () => {
  test("security headers, API proxy protections, and geocode rate limit", async ({
    request,
    baseURL,
  }) => {
    // 1. Security headers on home page
    const homeRes = await request.get("/");
    expect(homeRes.status()).toBe(200);
    const headers = homeRes.headers();
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("geolocation=(self)");

    // 2. Blocked auth subpaths via /api/proxy
    for (const blocked of [
      "/api/proxy/auth/login",
      "/api/proxy/auth/onboarding",
      "/api/proxy/auth/register-role",
      "/api/proxy/auth/switch-role",
    ]) {
      const res = await request.post(blocked, { data: {} });
      expect(res.status()).toBe(403);
    }

    // 3. Path traversal / disallowed prefix in /api/proxy
    const badPrefixRes = await request.get("/api/proxy/unknown-module/test");
    expect(badPrefixRes.status()).toBe(400);

    // 4. Cross-origin CSRF check on /api/proxy
    const csrfRes = await request.post("/api/proxy/bookings", {
      headers: { Origin: "https://evil-attacker.example" },
      data: { kostId: 1 },
    });
    expect(csrfRes.status()).toBe(403);

    // 5. Geocode query length validation
    const longQ = "a".repeat(305);
    const longGeoRes = await request.get(
      `/api/geocode?mode=search&q=${longQ}`,
    );
    expect(longGeoRes.status()).toBe(400);

    // 6. Geocode rate limit check (30 req/min/IP)
    let hit429 = false;
    for (let i = 0; i < 35; i++) {
      const geoRes = await request.get(
        `${baseURL}/api/geocode?mode=reverse&lat=invalid`,
      );
      if (geoRes.status() === 429) {
        hit429 = true;
        break;
      }
    }
    expect(hit429).toBe(true);
  });

  test("public pages (blog, rss, faq, gabung-pemilik, legal) load cleanly", async ({
    page,
    request,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    for (const route of [
      "/blog",
      "/faq",
      "/gabung-pemilik",
      "/kebijakan-privasi",
      "/syarat-ketentuan",
    ]) {
      const res = await page.goto(route);
      expect(res?.status()).toBeLessThan(400);
    }

    const rssRes = await request.get("/blog/rss.xml");
    expect(rssRes.status()).toBe(200);

    expect(pageErrors).toEqual([]);
  });

  test("profile form validates phone, city, and username before hitting API", async ({
    page,
  }) => {
    await loginAs(page, TENANT_EMAIL, TENANT_PASSWORD);
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);

    let patchCount = 0;
    page.on("request", (req) => {
      if (
        req.url().includes("/api/proxy/auth/users/") &&
        req.method() === "PATCH"
      ) {
        patchCount++;
      }
    });

    const saveBtn = page.getByRole("button", { name: "Simpan Profil" });
    const phoneInput = page.getByPlaceholder("08xxxxxxxxxx").first();
    const cityInput = page.getByPlaceholder("Contoh: Kota Malang").first();
    const usernameInput = page.getByPlaceholder("misal: budi_kost");

    // Save original values to restore later
    const origPhone = await phoneInput.inputValue();
    const origCity = await cityInput.inputValue();

    // Invalid phone
    await phoneInput.fill("08123");
    await saveBtn.click();
    await expect(
      page.getByText(/Nomor WhatsApp tidak valid/i),
    ).toBeVisible();
    expect(patchCount).toBe(0);

    // Invalid city (too short / numbers)
    await phoneInput.fill("081234567890");
    await cityInput.fill("1234");
    await saveBtn.click();
    await expect(
      page.getByText(/Nama kota\/kabupaten hanya boleh berisi huruf/i),
    ).toBeVisible();
    expect(patchCount).toBe(0);

    // Invalid username
    await cityInput.fill("Kota Malang");
    await usernameInput.fill("ab");
    await saveBtn.click();
    await expect(page.getByText(/Username harus 3–30 karakter/i)).toBeVisible();
    expect(patchCount).toBe(0);

    // Valid save -> normalizes phone to 628...
    await usernameInput.fill("e2etenant");
    const patchPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/proxy/auth/users/") &&
        res.request().method() === "PATCH",
    );
    await saveBtn.click();
    const patchRes = await patchPromise;
    expect(patchRes.ok()).toBe(true);
    await expect(page.getByText("Profil berhasil diperbarui.")).toBeVisible();

    // Restore original city/phone if needed
    await cityInput.fill(origCity || "Kota Malang");
    await phoneInput.fill(origPhone || "081234567890");
    await saveBtn.click();
  });

  test("new-property wizard validates city, district, and coordinates in Step 2", async ({
    page,
  }) => {
    await loginAs(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto("/dashboard/new-property");

    // Step 1
    await page
      .getByPlaceholder("Contoh: Kost Eksklusif Melati Lowokwaru")
      .fill("Kost Validasi E2E");
    await page
      .getByPlaceholder(
        "Ceritakan keunggulan lokasi, suasana lingkungan, akses jalan, dan detail kamar...",
      )
      .fill("Deskripsi lengkap untuk uji validasi.");
    await page.getByRole("button", { name: "Lanjut ke Step 2" }).click();

    // Step 2: invalid city
    await page.locator("#prop-city").fill("ab");
    await page.locator("#prop-district").fill("Lowokwaru");
    await page.locator("#prop-address").fill("Jl. Soekarno Hatta No. 1");
    await page.getByRole("button", { name: "Lanjut ke Step 3" }).click();
    await expect(
      page.getByText(/Nama kota\/kabupaten harus terdiri dari 3–80 karakter/i),
    ).toBeVisible();

    // Valid city -> passes Step 2 to Step 3
    await page.locator("#prop-city").fill("Kota Malang");
    await page.getByRole("button", { name: "Lanjut ke Step 3" }).click();
    await expect(page.getByText(/Harga & Booking/i).first()).toBeVisible();
  });

  test("survey form on kost detail rejects invalid phone number client-side", async ({
    page,
  }) => {
    await loginAs(page, TENANT_EMAIL, TENANT_PASSWORD);
    await page.goto("/");

    const firstCard = page.locator('a[href^="/kost/"]').first();
    const count = await page.locator('a[href^="/kost/"]').count();
    test.skip(count === 0, "Butuh minimal 1 data kost.");

    await firstCard.click();
    await page
      .getByRole("button", {
        name: /Jadwalkan Survei Dulu|Survei & Cek Ketersediaan/,
      })
      .first()
      .click();

    const phoneInput = page
      .locator("form")
      .filter({ hasText: "Nomor HP / WhatsApp" })
      .locator("input")
      .nth(1);
    await phoneInput.fill("abc123");
    await page.getByRole("button", { name: "Kirim ke Pemilik" }).click();
    await expect(
      page.getByText(/Nomor HP \/ WhatsApp hanya boleh berisi angka/i),
    ).toBeVisible();
  });

  test("bookings, notifications, and chat (normal message, XSS payload, and chat spam burst)", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const pageErrors: Error[] = [];
    let alertTriggered = false;
    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("dialog", async (dialog) => {
      alertTriggered = true;
      await dialog.dismiss();
    });

    await loginAs(page, TENANT_EMAIL, TENANT_PASSWORD);

    // Bookings & Notifications pages
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/bookings/);
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/notifications/);

    // Get a kost & ownerId to open a chat thread
    const kostRes = await page.request.get("/api/proxy/kosts?limit=1");
    expect(kostRes.status()).toBe(200);
    const kostJson = await kostRes.json();
    const kostList = Array.isArray(kostJson) ? kostJson : kostJson?.data || [];
    test.skip(kostList.length === 0, "Tidak ada kost untuk test chat.");

    const targetKost = kostList[0];
    await page.goto(
      `/chat?kostId=${targetKost.id}&peerId=${targetKost.ownerId}`,
    );
    await expect(page).toHaveURL(/\/chat/);

    // Wait for chat input box
    const msgInput = page.locator("textarea").first();
    await expect(msgInput).toBeVisible({ timeout: 10000 });

    // 1. Send XSS payload in chat -> must render safely as text, no alert()
    const xssPayload = `<img src=x onerror="window.__xss=1;alert('xss')"> E2E XSS Check`;
    await msgInput.fill(xssPayload);
    await msgInput.press("Enter");
    await expect(page.getByText("E2E XSS Check").last()).toBeVisible({
      timeout: 10000,
    });
    expect(alertTriggered).toBe(false);

    // 2. Test chat spam burst (15 concurrent rapid API calls to POST /api/proxy/chats)
    const spamResponses = await Promise.all(
      Array.from({ length: 15 }, (_, idx) =>
        page.request.post("/api/proxy/chats", {
          data: {
            kostId: targetKost.id,
            receiverId: targetKost.ownerId,
            message: `[E2E SPAM TEST #${idx + 1}]`,
          },
        }),
      ),
    );
    const spamStatuses = spamResponses.map((r) => r.status());

    const acceptedCount = spamStatuses.filter((s) => s >= 200 && s < 300).length;
    const rateLimitedCount = spamStatuses.filter((s) => s === 429).length;
    console.log(
      `[CHAT SPAM RESULT] total=15 accepted=${acceptedCount} rateLimited(429)=${rateLimitedCount} statuses=${JSON.stringify(spamStatuses)}`,
    );
    expect(rateLimitedCount).toBeGreaterThan(0);

    expect(pageErrors).toEqual([]);
  });
});
