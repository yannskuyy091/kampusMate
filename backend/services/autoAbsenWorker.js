const { chromium } = require('playwright');
const { loginToElearning } = require('./elearningDiscovery');

async function executeAutoAbsen(email, password, courses) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const report = [];

  try {
    await loginToElearning(page, email, password);

    for (const course of courses) {
      try {
        await page.goto(course.courseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        const moduleUrls = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href*="/mod/attendance/view.php?id="]')).map(
            (a) => a.href.split('#')[0]
          );
        });

        let sessionSubmitted = false;

        for (const modUrl of moduleUrls) {
          await page.goto(modUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

          const submitLink = page.locator('a:has-text("Submit attendance"), a:has-text("Ajukan kehadiran")').first();
          if (await submitLink.count() > 0) {
            await submitLink.click();
            await page.waitForLoadState('domcontentloaded');

            // Pilih opsi pertama ("Present" / "Hadir")
            const presentRadio = page.locator('input[type="radio"][name="status"]').first();
            if (await presentRadio.count() > 0) {
              await presentRadio.check();
              await page.locator('input[type="submit"]#id_submitbutton, button[type="submit"]').first().click();
              await page.waitForLoadState('networkidle');
              sessionSubmitted = true;
              break;
            }
          }
        }

        if (sessionSubmitted) {
          report.push({
            courseName: course.courseName,
            status: 'SUCCESS',
            message: 'Presensi berhasil dikirim (Present/Hadir).'
          });
        } else {
          report.push({
            courseName: course.courseName,
            status: 'NO_OPEN_SESSION',
            message: 'Tidak ada sesi presensi yang sedang dibuka saat ini (atau sudah terabsen).'
          });
        }
      } catch (courseErr) {
        report.push({
          courseName: course.courseName,
          status: 'ERROR',
          message: courseErr.message
        });
      }
    }
  } finally {
    await browser.close();
  }

  return report;
}

module.exports = { executeAutoAbsen };