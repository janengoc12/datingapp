const express = require('express');
const path = require('path');
const memoryStore = require('./memoryStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/memories', (req, res) => {
  res.json(memoryStore.list());
});

app.post('/api/memories', (req, res) => {
  const { title, date, note, photoUrl } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ error: 'title and date are required' });
  }
  const memory = memoryStore.create({ title, date, note, photoUrl });
  res.status(201).json(memory);
});

app.delete('/api/memories/:id', (req, res) => {
  const removed = memoryStore.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'memory not found' });
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Couple Memories app listening on port ${PORT}`);
});
