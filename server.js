// server.js
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'school.db');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'change_this_secret_for_prod', // dəyişdir
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 }
}));

// open (or create) database
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('DB open error', err);
    process.exit(1);
  }
});

// Initialize schema and seed if needed
function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY,
      name TEXT
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY,
      name TEXT
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS absences (
      id INTEGER PRIMARY KEY,
      student_id INTEGER,
      subject_id INTEGER,
      date TEXT,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );`);

    // seed admin if none
    db.get('SELECT COUNT(*) as c FROM admins', (err, row) => {
      if (err) return console.error(err);
      if (row.c === 0) {
        // default admin: username=admin, password=admin123
        const defaultHash = '$2b$12$qyuskrx7G8CKx1kvH6mJuuEt0CbnjlrYzgydOzc2Q/nhC46y4vhUq';
        db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', defaultHash]);
        console.log('Inserted default admin: admin / admin123');
      }
    });

    // seed subjects if none
    db.get('SELECT COUNT(*) as c FROM subjects', (err, row) => {
      if (err) return console.error(err);
      if (row.c === 0) {
        const subjects = ['Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya', 'Tarix', 'İnformatika'];
        const stmt = db.prepare('INSERT INTO subjects (name) VALUES (?)');
        subjects.forEach(s => stmt.run(s));
        stmt.finalize();
        console.log('Seeded subjects.');
      }
    });

    // seed 26 students if none
    db.get('SELECT COUNT(*) as c FROM students', (err, row) => {
      if (err) return console.error(err);
      if (row.c === 0) {
        const stmt = db.prepare('INSERT INTO students (name) VALUES (?)');
        for (let i = 1; i <= 26; i++) {
          stmt.run(`Şagird ${i}`);
        }
        stmt.finalize();
        console.log('Seeded 26 students.');
      }
    });
  });
}

initDB();

// Middleware to check admin session
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// API: login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'Enter username and password' });

  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (!row) return res.json({ success: false, message: 'User not found' });

    bcrypt.compare(password, row.password_hash, (err, ok) => {
      if (err) return res.status(500).json({ success: false, message: 'Compare error' });
      if (!ok) return res.json({ success: false, message: 'Wrong password' });
      req.session.admin = true;
      req.session.user = { id: row.id, username: row.username };
      res.json({ success: true, message: 'Logged in' });
    });
  });
});

// API: logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// API: list students with counts per subject
app.get('/api/students', (req, res) => {
  // fetch students
  db.all('SELECT * FROM students ORDER BY id', (err, students) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    // fetch subjects
    db.all('SELECT * FROM subjects ORDER BY id', (err, subjects) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      // For performance: aggregate counts by student and subject
      db.all(`SELECT student_id, subject_id, COUNT(*) as cnt FROM absences GROUP BY student_id, subject_id`, (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        const map = {};
        rows.forEach(r => {
          map[`${r.student_id}_${r.subject_id}`] = r.cnt;
        });
        // assemble response
        const result = students.map(s => {
          const counts = subjects.map(sub => ({
            subject_id: sub.id,
            subject_name: sub.name,
            count: map[`${s.id}_${sub.id}`] || 0
          }));
          return { id: s.id, name: s.name, counts };
        });
        res.json({ students: result, subjects });
      });
    });
  });
});

// API: get details for a student (dates per subject)
app.get('/api/student/:id/details', (req, res) => {
  const studentId = parseInt(req.params.id);
  if (isNaN(studentId)) return res.status(400).json({ error: 'Bad student id' });

  db.all(`SELECT a.subject_id, s.name as subject_name, a.date
          FROM absences a
          JOIN subjects s ON s.id = a.subject_id
          WHERE a.student_id = ?
          ORDER BY a.date DESC`, [studentId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    // group by subject
    const details = {};
    rows.forEach(r => {
      if (!details[r.subject_id]) details[r.subject_id] = { subject_name: r.subject_name, dates: [] };
      details[r.subject_id].dates.push(r.date);
    });
    res.json({ student_id: studentId, details });
  });
});

// API: add absences (admin only)
// body: { studentId: n, subjectIds: [1,2], date: 'YYYY-MM-DD' (optional) }
app.post('/api/absence', requireAdmin, (req, res) => {
  const { studentId, subjectIds, date } = req.body;
  const sId = parseInt(studentId);
  if (!sId || !Array.isArray(subjectIds) || subjectIds.length === 0) return res.status(400).json({ success: false, message: 'provide studentId and subjectIds array' });

  const d = date ? date : (new Date()).toISOString().slice(0,10); // YYYY-MM-DD
  const stmt = db.prepare('INSERT INTO absences (student_id, subject_id, date) VALUES (?, ?, ?)');
  db.serialize(() => {
    subjectIds.forEach(subId => {
      stmt.run(sId, subId, d);
    });
    stmt.finalize(err => {
      if (err) return res.status(500).json({ success: false, message: 'DB insert error' });
      res.json({ success: true, message: 'Absence(s) saved', date: d });
    });
  });
});

// API: get subjects (simple)
app.get('/api/subjects', (req, res) => {
  db.all('SELECT * FROM subjects ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// API: get single student (optional)
app.get('/api/student/:id', (req, res) => {
  const sid = parseInt(req.params.id);
  db.get('SELECT * FROM students WHERE id = ?', [sid], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// Serve index.html at root (static already)
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
