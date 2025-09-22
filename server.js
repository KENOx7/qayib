// server.js
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'data.db');
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'change_this_to_a_strong_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12 } // 12 hours
}));

// Init DB if not exists
const firstTime = !fs.existsSync(DB_FILE);
const db = new sqlite3.Database(DB_FILE);

function runSql(sql, params=[]) {
  return new Promise((res, rej) => {
    db.run(sql, params, function(err){
      if (err) rej(err); else res(this);
    });
  });
}
function allSql(sql, params=[]){
  return new Promise((res, rej) => {
    db.all(sql, params, function(err, rows){
      if (err) rej(err); else res(rows);
    });
  });
}
function getSql(sql, params=[]){
  return new Promise((res, rej) => {
    db.get(sql, params, function(err, row){
      if (err) rej(err); else res(row);
    });
  });
}

async function initDb() {
  // create tables
  await runSql(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
  )`);
  await runSql(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL
  )`);
  await runSql(`CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);
  await runSql(`CREATE TABLE IF NOT EXISTS absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
  )`);

  // seed subjects if empty
  const subs = await allSql(`SELECT * FROM subjects`);
  if (subs.length === 0) {
    const names = ['Riyaziyyat','Fizika','Kimya','Tarix','Azərbaycan dili','İngilis dili'];
    for (const n of names) await runSql(`INSERT INTO subjects(name) VALUES (?)`, [n]);
  }

  // seed students if empty
  const studs = await allSql(`SELECT * FROM students`);
  if (studs.length === 0) {
    const list = ['Əli Məmmədov','Nərmin Hüseynova','Tural Əliyev','Leyla Quliyeva','Zaur Rəhimov',
    'Aynur Məmmədzadə','Orxan Məmmədli','Səbinə Əliyeva','Murad Həsənov','Rəvan Nəsirov',
    'Günay İsmayılova','Muradə Quliyev','Sabir Məlikov','Aysel Sultanova','Fərhad Əsədov',
    'Nijat Abbasov','Sənan Qurbanov','Aida Məmmədova','Kamran Yaqubov','Leyla Məmmədli',
    'Səid Hüseynli','Fatimə Rəhimova','Rovshan Məmmədli','Zeynəb Əliyeva','Elvin Həsənzadə','Mehriban Quliyeva'];
    for (const s of list) await runSql(`INSERT INTO students(full_name) VALUES (?)`, [s]);
  }

  // seed admin user if none
  const users = await allSql(`SELECT * FROM users`);
  if (users.length === 0) {
    const username = 'admin';
    const password = 'admin123'; // mütləq dəyişdirin productionda
    const hash = bcrypt.hashSync(password, 10);
    await runSql(`INSERT INTO users(username,password_hash,role) VALUES (?,?,?)`, [username, hash, 'admin']);
    console.log('Seeded admin user -> username: admin, password: admin123 (change immediately)');
  }
}
initDb().catch(err => console.error(err));

// middleware: require login for /api/admin/*
function requireLogin(req, res, next){
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  res.status(401).json({ error: 'unauthorized' });
}

/* AUTH routes */
app.post('/api/login', async (req,res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  const user = await getSql(`SELECT * FROM users WHERE username = ?`, [username]);
  if (!user) return res.status(401).json({ error: 'invalid' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid' });
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ ok: true });
});

app.post('/api/logout', (req,res)=>{
  req.session.destroy(()=>res.json({ ok:true }));
});

/* Data endpoints (protected) */
app.get('/api/admin/meta', requireLogin, async (req,res) => {
  const students = await allSql(`SELECT * FROM students ORDER BY id`);
  const subjects = await allSql(`SELECT * FROM subjects ORDER BY id`);
  res.json({ students, subjects });
});

// returns counts matrix: for each student & subject number of absences
app.get('/api/admin/counts', requireLogin, async (req,res) => {
  const rows = await allSql(`
    SELECT a.student_id, a.subject_id, COUNT(*) AS cnt
    FROM absences a
    GROUP BY a.student_id, a.subject_id
  `);
  res.json(rows);
});

// add absence
app.post('/api/admin/absences', requireLogin, async (req,res) => {
  try {
    const { student_id, subject_id, date, note } = req.body;
    if (!student_id || !subject_id || !date) return res.status(400).json({ error: 'missing' });
    await runSql(`INSERT INTO absences(student_id, subject_id, date, note, created_by) VALUES (?,?,?,?,?)`,
      [student_id, subject_id, date, note || '', req.session.user.id]);
    res.json({ ok: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'db' });
  }
});

// get detailed absences for student+subject
app.get('/api/admin/absences/:student_id/:subject_id', requireLogin, async (req,res) => {
  const { student_id, subject_id } = req.params;
  const rows = await allSql(`
    SELECT id, date, note, created_at, created_by
    FROM absences
    WHERE student_id = ? AND subject_id = ?
    ORDER BY date DESC
  `, [student_id, subject_id]);
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname,'public','index.html'));
});
app.listen(PORT, ()=> console.log('Server on', PORT));
