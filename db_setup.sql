-- tables
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL -- e.g. 'admin'
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS absences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  note TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(subject_id) REFERENCES subjects(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
);

-- seed 6 subjects
INSERT INTO subjects(name) VALUES ('Riyaziyyat'), ('Fizika'), ('Kimya'), ('Tarix'), ('Azərbaycan dili'), ('İngilis dili');

-- seed 26 students (adları nümunə üçün)
INSERT INTO students(full_name) VALUES
('Əli Məmmədov'),('Nərmin Hüseynova'),('Tural Əliyev'),('Leyla Quliyeva'),('Zaur Rəhimov'),
('Aynur Məmmədzadə'),('Orxan Məmmədli'),('Səbinə Əliyeva'),('Murad Həsənov'),('Rəvan Nəsirov'),
('Günay İsmayılova'),('Muradə Quliyev'),('Sabir Məlikov'),('Aysel Sultanova'),('Fərhad Əsədov'),
('Nijat Abbasov'),('Sənan Qurbanov'),('Aida Məmmədova'),('Kamran Yaqubov'),('Leyla Məmmədli'),
('Səid Hüseynli'),('Fatimə Rəhimova'),('Rovshan Məmmədli'),('Zeynəb Əliyeva'),('Elvin Həsənzadə'),('Mehriban Quliyeva');
