const cron = require('node-cron');
const db = require('../config/database');
const { decrypt } = require('../utils/encryption');
const { executeAutoAbsen } = require('./autoAbsenWorker');
const { sendTelegramMessage } = require('./telegramNotifier');

let isRunning = false;

function getJakartaNow() {
  const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  return new Date(nowStr);
}

async function runScheduledAttendance() {
  if (isRunning) {
    console.log('[CRON] Worker absensi sebelumnya masih berjalan, melewati siklus ini.');
    return;
  }

  isRunning = true;
  console.log(`\n[CRON ${new Date().toLocaleTimeString('id-ID')}] Memulai pengecekan jadwal auto-absen...`);

  try {
    const activeUsers = db.prepare('SELECT * FROM users WHERE is_active = 1').all();

    for (const user of activeUsers) {
      const enabledCourses = db.prepare(
        'SELECT course_name AS courseName, course_url AS courseUrl FROM courses WHERE user_id = ? AND auto_absen_enabled = 1'
      ).all(user.id);

      if (enabledCourses.length === 0) continue;

      const plainPassword = decrypt(user.encrypted_password);
      const report = await executeAutoAbsen(user.email, plainPassword, enabledCourses);

      const insertLog = db.prepare(
        'INSERT INTO attendance_logs (user_id, course_name, status, message) VALUES (?, ?, ?, ?)'
      );

      for (const item of report) {
        insertLog.run(user.id, item.courseName, item.status, item.message);

        if (item.status === 'SUCCESS') {
          await sendTelegramMessage(
            `✅ <b>AUTO-ABSEN BERHASIL!</b>\n\n` +
            `📚 <b>Matkul:</b> ${item.courseName}\n` +
            `👤 <b>Akun:</b> ${user.email}\n` +
            `⏰ <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
          );
        } else if (item.status === 'ERROR') {
          await sendTelegramMessage(
            `⚠️ <b>GAGAL AUTO-ABSEN</b>\n\n` +
            `📚 <b>Matkul:</b> ${item.courseName}\n` +
            `❌ <b>Error:</b> ${item.message}`
          );
        }
      }
    }
  } catch (err) {
    console.error('[CRON ERROR]', err.message);
  } finally {
    isRunning = false;
  }
}

async function checkReminders() {
  try {
    const now = getJakartaNow();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = now.getDay(); // 0=Minggu, 1=Senin..6=Sabtu
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Cek Jadwal Kuliah (ingatkan 15-35 menit sebelum mulai)
    const todaySchedules = db
      .prepare('SELECT * FROM schedules WHERE day_of_week = ? AND (reminded_date IS NULL OR reminded_date != ?)')
      .all(dayOfWeek, todayStr);

    for (const sched of todaySchedules) {
      const [h, m] = sched.start_time.split(':').map(Number);
      const schedMinutes = h * 60 + m;
      const diff = schedMinutes - currentMinutes;

      if (diff > 0 && diff <= 30) {
        await sendTelegramMessage(
          `🔔 <b>PENGINGAT JADWAL KULIAH (${diff} Menit Lagi)</b>\n\n` +
          `📚 <b>Matkul:</b> ${sched.course_name}\n` +
          `🕒 <b>Jam:</b> ${sched.start_time} - ${sched.end_time} WIB\n` +
          `📍 <b>Ruangan:</b> ${sched.room || '-'}`
        );
        db.prepare('UPDATE schedules SET reminded_date = ? WHERE id = ?').run(todayStr, sched.id);
      }
    }

    // 2. Cek Deadline Tugas Belum Selesai
    const pendingTasks = db.prepare('SELECT * FROM tasks WHERE is_completed = 0').all();

    for (const task of pendingTasks) {
      const dueDate = new Date(task.due_datetime.replace(' ', 'T'));
      if (isNaN(dueDate.getTime())) continue;

      const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Pengingat H-3 Jam (level 2)
      if (hoursLeft > 0 && hoursLeft <= 3 && task.reminded_level < 2) {
        await sendTelegramMessage(
          `🚨 <b>DEADLINE TUGAS TINGGAL ${Math.ceil(hoursLeft)} JAM LAGI!</b>\n\n` +
          `📝 <b>Tugas:</b> ${task.title}\n` +
          `📚 <b>Matkul:</b> ${task.course_name}\n` +
          `⏳ <b>Batas Waktu:</b> ${task.due_datetime} WIB`
        );
        db.prepare('UPDATE tasks SET reminded_level = 2 WHERE id = ?').run(task.id);
      }
      // Pengingat H-24 Jam (level 1)
      else if (hoursLeft > 3 && hoursLeft <= 24 && task.reminded_level < 1) {
        await sendTelegramMessage(
          `📌 <b>PENGINGAT TUGAS (H-1 Deadline)</b>\n\n` +
          `📝 <b>Tugas:</b> ${task.title}\n` +
          `📚 <b>Matkul:</b> ${task.course_name}\n` +
          `⏳ <b>Batas Waktu:</b> ${task.due_datetime} WIB`
        );
        db.prepare('UPDATE tasks SET reminded_level = 1 WHERE id = ?').run(task.id);
      }
    }
  } catch (err) {
    console.error('[REMINDER ERROR]', err.message);
  }
}

function startCronJobs() {
  // Auto-absen setiap 15 menit (Senin-Sabtu, 07:00-21:00 WIB)
  cron.schedule('*/15 7-21 * * 1-6', () => {
    runScheduledAttendance();
  }, { timezone: 'Asia/Jakarta' });

  // Cek pengingat jadwal kuliah & tugas setiap 5 menit
  cron.schedule('*/5 * * * *', () => {
    checkReminders();
  }, { timezone: 'Asia/Jakarta' });

  console.log('[CRON] Auto-Absen (15m) & Pengingat Jadwal/Tugas Telegram (5m) aktif.');
}

module.exports = { startCronJobs, runScheduledAttendance };