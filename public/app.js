const form = document.getElementById('memory-form');
const list = document.getElementById('memory-list');

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderMemories(memories) {
  if (memories.length === 0) {
    list.innerHTML = '<li class="empty-state">No memories yet. Add your first one above!</li>';
    return;
  }

  list.innerHTML = memories.map((m) => `
    <li class="memory-card" data-id="${m.id}">
      <button class="delete-btn" title="Delete">✕</button>
      ${m.photoUrl ? `<img src="${escapeHtml(m.photoUrl)}" alt="${escapeHtml(m.title)}" />` : ''}
      <h3>${escapeHtml(m.title)}</h3>
      <time datetime="${m.date}">${new Date(m.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time>
      ${m.note ? `<p>${escapeHtml(m.note)}</p>` : ''}
    </li>
  `).join('');
}

async function loadMemories() {
  const res = await fetch('/api/memories');
  const memories = await res.json();
  renderMemories(memories);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value;
  const note = document.getElementById('note').value.trim();
  const photoUrl = document.getElementById('photoUrl').value.trim();

  const res = await fetch('/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, date, note, photoUrl }),
  });

  if (res.ok) {
    form.reset();
    loadMemories();
  } else {
    const { error } = await res.json();
    alert(error || 'Failed to add memory');
  }
});

list.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.delete-btn');
  if (!deleteBtn) return;
  const id = deleteBtn.closest('.memory-card').dataset.id;
  const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
  if (res.ok) loadMemories();
});

loadMemories();
