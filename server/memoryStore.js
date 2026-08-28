const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data', 'memories.json');

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  return raw ? JSON.parse(raw) : [];
}

function writeAll(memories) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(memories, null, 2));
}

function list() {
  return readAll().sort((a, b) => (a.date < b.date ? 1 : -1));
}

function create({ title, date, note, photoUrl }) {
  const memories = readAll();
  const memory = {
    id: crypto.randomUUID(),
    title,
    date,
    note: note || '',
    photoUrl: photoUrl || '',
    createdAt: new Date().toISOString(),
  };
  memories.push(memory);
  writeAll(memories);
  return memory;
}

function remove(id) {
  const memories = readAll();
  const next = memories.filter((m) => m.id !== id);
  const removed = next.length !== memories.length;
  if (removed) writeAll(next);
  return removed;
}

module.exports = { list, create, remove };
