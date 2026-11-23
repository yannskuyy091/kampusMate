const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../kampusmate.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_name TEXT NOT NULL,
    course_url TEXT NOT NULL,
    auto_absen_enabled INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, course_url)
  );

  CREATE TABLE IF NOT EXISTS attendance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_name TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL, -- 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
    start_time TEXT NOT NULL,     -- Format HH:MM (contoh: 08:00)
    end_time TEXT NOT NULL,       -- Format HH:MM (contoh: 10:30)
    room TEXT,
    reminded_date TEXT,           -- Tanggal terakhir notif terkirim (YYYY-MM-DD)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    course_name TEXT NOT NULL,
    due_datetime TEXT NOT NULL,   -- Format YYYY-MM-DD HH:MM (contoh: 2026-11-25 23:59)
    is_completed INTEGER DEFAULT 0,
    reminded_level INTEGER DEFAULT 0, -- 0=belum, 1=H-1 (24 jam), 2=H-3 jam
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

module.exports = db;