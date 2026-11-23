const { chromium } = require('playwright');

async function loginToElearning(page, email, password) {
  // 1. Buka halaman login SIPT2 UBP Karawang
  await page.goto('https://sipt2.ubpkarawang.ac.id/login', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // 2. Isi kolom Email & Password lalu klik tombol "Masuk"
  const emailInput = page.locator('input[type="email"]').first();
  const passInput = page.locator('input[type="password"]').first();

  await emailInput.waitFor({ state: 'visible', timeout: 20000 });
  await emailInput.click();
  await emailInput.fill(email);

  await passInput.click();
  await passInput.fill(password);

  await page.locator('button:has-text("Masuk")').first().click();

  // 3. Tunggu sampai keluar dari halaman /login
  try {
    await page.waitForFunction(
      () => !window.location.pathname.includes('/login'),
      { timeout: 30000 }
    );
  } catch (e) {
    throw new Error(`Login SIPT2 gagal. Pastikan email dan password benar.`);
  }

  // Pastikan berada di halaman /apps tempat kartu Elearning (BOC) berada
  if (!page.url().includes('/apps')) {
    await page.goto('https://sipt2.ubpkarawang.ac.id/apps', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
  }

  // Tunggu sebentar agar daftar kartu aplikasi selesai di-render oleh frontend SIPT2
  await page.getByText('Elearning (BOC)').first().waitFor({ state: 'visible', timeout: 20000 });

  // 4. Klik tombol "Masuk SSO" secara langsung
  const ssoButton = page.getByText('Masuk SSO', { exact: false }).first();
  await ssoButton.waitFor({ state: 'visible', timeout: 15000 });

  // Tangkap tab baru jika "Masuk SSO" membuka tab baru
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
    ssoButton.click()
  ]);

  const targetPage = newPage || page;

  // Tunggu sampai redirect SSO selesai dan masuk ke halaman utama E-Learning Moodle
  await targetPage.waitForURL(
    (url) => url.hostname === 'elearning.ubpkarawang.ac.id' && !url.pathname.includes('/login/'),
    { timeout: 60000 }
  );

  if (newPage) {
    await page.goto(targetPage.url(), { waitUntil: 'networkidle', timeout: 60000 });
  }
}

async function syncUserCourses(email, password) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginToElearning(page, email, password);

    await page.goto('https://elearning.ubpkarawang.ac.id/my/courses.php', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.waitForTimeout(2500);

    // Ambil semua link mata kuliah unik
    const rawCourses = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/course/view.php?id="]'));
      const map = new Map();
      for (const a of links) {
        const url = a.href.split('#')[0];
        const name = a.innerText.trim().split('\n')[0].trim();
        if (name && name.length > 3 && !map.has(url)) {
          map.set(url, { courseName: name, courseUrl: url });
        }
      }
      return Array.from(map.values());
    });

    const results = [];
    for (const course of rawCourses) {
      await page.goto(course.courseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const modules = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="/mod/attendance/view.php?id="]')).map(
          (a) => ({
            title: a.innerText.trim(),
            url: a.href.split('#')[0]
          })
        );
      });

      results.push({
        courseName: course.courseName,
        courseUrl: course.courseUrl,
        attendanceModules: modules,
        autoAbsenEnabled: modules.length > 0
      });
    }

    return results;
  } finally {
    await browser.close();
  }
}

module.exports = { loginToElearning, syncUserCourses };