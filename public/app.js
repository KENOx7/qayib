// public/app.js
async function fetchData() {
  const res = await fetch('/api/students');
  const data = await res.json();
  return data;
}

function buildTable(data) {
  const { students, subjects } = data;
  const wrap = document.getElementById('table-wrap');
  wrap.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'main-table';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  trh.innerHTML = `<th>Şagird</th>` + subjects.map(s => `<th>${s.name}</th>`).join('') + `<th>Ətraflı</th>`;
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  students.forEach(st => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${st.name}</td>` + st.counts.map(c => `<td class="center">${c.count}</td>`).join('') + `<td><button class="detail-btn" data-id="${st.id}">Ətraflı gör</button></td>`;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);

  document.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const res = await fetch(`/api/student/${id}/details`);
      const json = await res.json();
      showModal(json);
    });
  });
}

function showModal(json) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  title.textContent = `Şagird #${json.student_id} - Ətraflı qayıblar`;
  body.innerHTML = '';

  const details = json.details;
  if (Object.keys(details).length === 0) {
    body.innerHTML = '<p>Qayıb yoxdur.</p>';
  } else {
    for (const sid in details) {
      const obj = details[sid];
      const div = document.createElement('div');
      div.className = 'subject-block';
      div.innerHTML = `<h4>${obj.subject_name} (${obj.dates.length})</h4>
                       <ul>${obj.dates.map(d => `<li>${d}</li>`).join('')}</ul>`;
      body.appendChild(div);
    }
  }
  modal.classList.remove('hidden');
}

document.getElementById('close-modal').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});

(async function init() {
  const data = await fetchData();
  buildTable(data);
})();
