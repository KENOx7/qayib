// public/admin.js
async function apiLogin(u, p) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username: u, password: p })
  });
  return res.json();
}

async function fetchStudentsAndSubjects() {
  const sResp = await fetch('/api/students');
  const data = await sResp.json();
  return data;
}

async function fetchSubjects() {
  const res = await fetch('/api/subjects');
  return res.json();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await apiLogin(u, p);
  const msg = document.getElementById('login-msg');
  if (r.success) {
    msg.textContent = 'Giriş uğurlu.';
    showPanel();
  } else {
    msg.textContent = r.message || 'Xəta';
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.reload();
});

async function showPanel() {
  document.getElementById('login-wrap').classList.add('hidden');
  document.getElementById('panel').classList.remove('hidden');

  // load students and subjects
  const data = await fetchStudentsAndSubjects();
  const students = data.students;
  const subjects = data.subjects;

  const sel = document.getElementById('student-select');
  sel.innerHTML = students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  const subWrap = document.getElementById('subjects-list');
  subWrap.innerHTML = subjects.map(s => `<label><input type="checkbox" class="sub-chk" value="${s.id}" /> ${s.name}</label><br>`).join('');
}

document.getElementById('save-absence').addEventListener('click', async () => {
  const sid = document.getElementById('student-select').value;
  const checked = Array.from(document.querySelectorAll('.sub-chk')).filter(c=>c.checked).map(c=>parseInt(c.value));
  const msg = document.getElementById('save-msg');
  if (!sid || checked.length === 0) {
    msg.textContent = 'Şagird seç və ən azı 1 fənn işarələ.';
    return;
  }
  const res = await fetch('/api/absence', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ studentId: parseInt(sid), subjectIds: checked })
  });
  const j = await res.json();
  if (j.success) {
    msg.textContent = `Qayıb yazıldı: ${j.date}. İndi ictimai səhifədə yenilənəcək.`;
  } else {
    msg.textContent = `Xəta: ${j.message || '...'}`;
  }
});
