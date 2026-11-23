const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { encrypt } = require('../utils/encryption');
const { syncUserCourses } = require('../services/elearningDiscovery');
const { runScheduledAttendance } = require('../services/cronScheduler');

router.post('/sync-courses', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
  }

  try {
    const courses = await syncUserCourses(email, password);
    const encryptedPass = encrypt(password);

    db.prepare(`
      INSERT INTO users (email, encrypted_password, is_active)
      VALUES (?, ?, 1)
      ON CONFLICT(email) DO UPDATE SET encrypted_password = excluded.encrypted_password, is_active = 1
    `).run(email, encryptedPass);

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    const upsertCourse = db.prepare(`
      INSERT INTO courses (user_id, course_name, course_url, auto_absen_enabled)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, course_url) DO UPDATE SET course_name = excluded.course_name
    `);

    const saveAll = db.transaction((courseList) => {
      for (const c of courseList) {
        upsertCourse.run(user.id, c.courseName, c.courseUrl, c.autoAbsenEnabled ? 1 : 0);
      }
    });
    saveAll(courses);

    res.json({
      success: true,
      message: 'Akun dan daftar mata kuliah berhasil disimpan ke KampusMate!',
      total: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

router.get('/courses', (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Parameter email wajib diisi.' });
  }

  const user = db.prepare('SELECT id, email, is_active FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Akun belum terhubung.' });
  }

  const courses = db.prepare(
    'SELECT id, course_name AS courseName, course_url AS courseUrl, auto_absen_enabled AS autoAbsenEnabled FROM courses WHERE user_id = ?'
  ).all(user.id);

  res.json({ success: true, email: user.email, data: courses });
});

router.patch('/courses/:id/toggle', (req, res) => {
  const { enabled } = req.body;
  db.prepare('UPDATE courses SET auto_absen_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.get('/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM attendance_logs ORDER BY checked_at DESC LIMIT 30').all();
  res.json({ success: true, data: logs });
});

router.post('/run-now', async (req, res) => {
  runScheduledAttendance();
  res.json({ success: true, message: 'Siklus pengecekan auto-absen dijalankan di latar belakang.' });
});

module.exports = router;