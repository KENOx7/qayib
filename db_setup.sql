-- db_setup.sql  (for reference)
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS absences (
  id INTEGER PRIMARY KEY,
  student_id INTEGER,
  subject_id INTEGER,
  date TEXT
);

-- Default admin (password: admin123) hashed with bcrypt
INSERT OR IGNORE INTO admins (id, username, password_hash) VALUES (1, 'admin', '$2b$12$qyuskrx7G8CKx1kvH6mJuuEt0CbnjlrYzgydOzc2Q/nhC46y4vhUq');

-- Subjects (Azerbaijani)
INSERT OR IGNORE INTO subjects (id, name) VALUES (1, 'Riyaziyyat'), (2, 'Fizika'), (3, 'Kimya'), (4, 'Biologiya'), (5, 'Tarix'), (6, 'İnformatika');

-- Students Şagird 1 ... Şagird 26
-- (server seeds them automatically)
