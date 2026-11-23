const express = require('express');
const router = express.Router();
const db = require('../config/database');

function getUserId(email) {
  if (!email) return null;
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  return user ? user.id : null;
}

// ==================== JADWAL KULIAH ====================

router.get('/schedules', (req, res) => {
  const userId = getUserId(req.query.email);
  if (!userId) return res.status(404).json({ success: false, message: 'Akun belum terhubung.' });

  const data = db
    .prepare('SELECT * FROM schedules WHERE user_id = ? ORDER BY day_of_week ASC, start_time ASC')
    .all(userId);
  res.json({ success: true, data });
});

router.post('/schedules', (req, res) => {
  const { email, courseName, dayOfWeek, startTime, endTime, room } = req.body;
  const userId = getUserId(email);
  if (!userId) return res.status(404).json({ success: false, message: 'Akun belum terhubung.' });

  if (!courseName || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'Nama matkul, hari, jam mulai, dan jam selesai wajib diisi.' });
  }

  db.prepare(
    'INSERT INTO schedules (user_id, course_name, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, courseName, Number(dayOfWeek), startTime, endTime, room || '-');

  res.json({ success: true, message: 'Jadwal kuliah berhasil ditambahkan!' });
});

router.delete('/schedules/:id', (req, res) => {
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== TUGAS & DEADLINE ====================

router.get('/tasks', (req, res) => {
  const userId = getUserId(req.query.email);
  if (!userId) return res.status(404).json({ success: false, message: 'Akun belum terhubung.' });

  const data = db
    .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY is_completed ASC, due_datetime ASC')
    .all(userId);
  res.json({ success: true, data });
});

router.post('/tasks', (req, res) => {
  const { email, title, courseName, dueDatetime } = req.body;
  const userId = getUserId(email);
  if (!userId) return res.status(404).json({ success: false, message: 'Akun belum terhubung.' });

  if (!title || !courseName || !dueDatetime) {
    return res.status(400).json({ success: false, message: 'Judul tugas, mata kuliah, dan deadline wajib diisi.' });
  }

  db.prepare(
    'INSERT INTO tasks (user_id, title, course_name, due_datetime) VALUES (?, ?, ?, ?)'
  ).run(userId, title, courseName, dueDatetime);

  res.json({ success: true, message: 'Tugas berhasil ditambahkan!' });
});

router.patch('/tasks/:id/toggle', (req, res) => {
  const { isCompleted } = req.body;
  db.prepare('UPDATE tasks SET is_completed = ? WHERE id = ?').run(isCompleted ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;