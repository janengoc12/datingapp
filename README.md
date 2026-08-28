# datingapp

## Couple Memories

An app for couples to save and browse shared memories (a title, date, note, and optional photo). Sign-in is Google-only via Supabase Auth, and each memory belongs to a couple — never visible to anyone outside the pair.

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates the tables (`profiles`, `couples`, `couple_members`, `couple_invites`, `memories`), the pairing functions, and Row Level Security policies that scope every row to its couple.

### 2. Enable Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Client ID (Web application). Add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
2. In the Supabase dashboard, go to **Authentication → Providers → Google**, enable it, and paste in the Client ID and Client Secret from step 1.
3. In **Authentication → URL Configuration**, set the Site URL (and add Redirect URLs) to wherever the app is running — e.g. `http://localhost:3000` for local dev.

### 3. Configure the app

```bash
cp public/config.example.js public/config.js
```

Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` from **Settings → API** in the Supabase dashboard. The anon key is safe to expose in the browser — Row Level Security is what actually protects the data.

### 4. Run it

```bash
npm install
npm start
```

Then open http://localhost:3000, sign in with Google, and either generate an invite code to send your partner or redeem the one they sent you.

### How data access works

There's no custom backend API for memories — the browser talks directly to Supabase's Postgres REST API using `@supabase/supabase-js`, and Row Level Security enforces that a user can only read or write memories belonging to their own couple. The Express server (`server/index.js`) just serves the static front end.
