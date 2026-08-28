# datingapp

## Couple Memories

A small app for couples to save and browse shared memories (a title, date, note, and optional photo).

### Running locally

```bash
npm install
npm start
```

Then open http://localhost:3000.

Memories are persisted to `server/data/memories.json`.

### API

- `GET /api/memories` — list memories, newest first
- `POST /api/memories` — create a memory (`title`, `date` required; `note`, `photoUrl` optional)
- `DELETE /api/memories/:id` — delete a memory
