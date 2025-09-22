// admin.js
let students = [], subjects = [];
const token = null;

document.getElementById('loginBtn').addEventListener('click', async ()=>{
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})});
  const j = await r.json();
  if (j.ok) {
    document.getElementById('auth').style.display='none';
    document.getElementById('app').style.display='block';
    loadMeta();
  } else {
    document.getElementById('loginMsg').innerText = 'Login xətası';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  await fetch('/api/logout',{method:'POST'});
  location.reload();
});

async function loadMeta(){
  const m = await (await fetch('/api/admin/meta')).json();
  students = m.students;
  subjects = m.subjects;
  renderTable();
  loadCounts();
}

async function loadCounts(){
  const rows = await (await fetch('/api/admin/counts')).json();
  // make map
  const map = {};
  rows.forEach(r => {
    map[`${r.student_id}_${r.subject_id}`] = r.cnt;
  });
  // update UI
  students.forEach(s=>{
    subjects.forEach(sub=>{
      const id = `cell_${s.id}_${sub.id}`;
      const el = document.getElementById(id);
      if (el) el.dataset.count = map[`${s.id}_${sub.id}`] || 0, el.querySelector('.num').innerText = el.dataset.count;
    });
  });
}

function renderTable(){
  const wrap = document.getElementById('tableWrap');
  let html = '<table><thead><tr><th>Şagird</th>';
  subjects.forEach(sub=> html += `<th>${sub.name}</th>`);
  html += '</tr></thead><tbody>';
  students.forEach(s=>{
    html += `<tr><td style="text-align:left">${s.full_name}</td>`;
    subjects.forEach(sub=>{
      const id = `cell_${s.id}_${sub.id}`;
      html += `<td id="${id}" data-student="${s.id}" data-subject="${sub.id}">
        <div><strong class="num">0</strong></div>
        <div style="margin-top:6px">
          <button class="btn viewBtn" data-student="${s.id}" data-subject="${sub.id}">Ətraflı gör</button>
          <button class="btn addBtn" data-student="${s.id}" data-subject="${sub.id}">+ Qayıb</button>
        </div>
      </td>`;
    });
    html += `</tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;

  // attach events
  document.querySelectorAll('.viewBtn').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const sid = e.target.dataset.student, subid = e.target.dataset.subject;
      const rows = await (await fetch(`/api/admin/absences/${sid}/${subid}`)).json();
      showModal(`Şagird: ${sid} — Fənn: ${subid}`, rows.map(r=>`<div>${r.date} ${r.note?('- ' + r.note):''}</div>`).join('') || '<div>Qayıb yoxdur</div>');
    });
  });
  document.querySelectorAll('.addBtn').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const sid = e.target.dataset.student, subid = e.target.dataset.subject;
      const today = new Date().toISOString().slice(0,10);
      const note = prompt('Qeyd (istəyə bağlı):','');
      const r = await fetch('/api/admin/absences',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({student_id: sid, subject_id: subid, date: today, note})});
      const j = await r.json();
      if (j.ok) { alert('Qayıb əlavə olundu'); loadCounts(); } else alert('Xəta');
    });
  });
}

function showModal(title, html){
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modal').style.display = 'flex';
}
document.getElementById('closeModal').addEventListener('click', ()=> document.getElementById('modal').style.display='none');
