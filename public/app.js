const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const userBar = document.getElementById('user-bar');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const signOutBtn = document.getElementById('sign-out-btn');
const googleSignInBtn = document.getElementById('google-sign-in-btn');

const signedOutView = document.getElementById('signed-out-view');
const pairingView = document.getElementById('pairing-view');
const memoriesView = document.getElementById('memories-view');

const createInviteBtn = document.getElementById('create-invite-btn');
const inviteCodeDisplay = document.getElementById('invite-code-display');
const redeemInviteForm = document.getElementById('redeem-invite-form');
const redeemError = document.getElementById('redeem-error');

const memoryForm = document.getElementById('memory-form');
const memoryList = document.getElementById('memory-list');

let coupleId = null;

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function showView(view) {
  signedOutView.hidden = view !== 'signed-out';
  pairingView.hidden = view !== 'pairing';
  memoriesView.hidden = view !== 'memories';
}

async function findMyCoupleId() {
  const { data, error } = await supabase
    .from('couple_members')
    .select('couple_id')
    .maybeSingle();
  if (error) throw error;
  return data ? data.couple_id : null;
}

async function loadMemories() {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('couple_id', coupleId)
    .order('date', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }
  renderMemories(data);
}

function renderMemories(memories) {
  if (memories.length === 0) {
    memoryList.innerHTML = '<li class="empty-state">No memories yet. Add your first one above!</li>';
    return;
  }

  memoryList.innerHTML = memories.map((m) => `
    <li class="memory-card" data-id="${m.id}">
      <button class="delete-btn" title="Delete">✕</button>
      ${m.photo_url ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.title)}" />` : ''}
      <h3>${escapeHtml(m.title)}</h3>
      <time datetime="${m.date}">${new Date(m.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time>
      ${m.note ? `<p>${escapeHtml(m.note)}</p>` : ''}
    </li>
  `).join('');
}

async function enterApp(session) {
  const user = session.user;
  userAvatar.src = user.user_metadata?.avatar_url || '';
  userName.textContent = user.user_metadata?.full_name || user.email;
  userBar.hidden = false;

  coupleId = await findMyCoupleId();

  if (!coupleId) {
    showView('pairing');
    return;
  }

  showView('memories');
  await loadMemories();
}

function showSignedOut() {
  userBar.hidden = true;
  coupleId = null;
  showView('signed-out');
}

googleSignInBtn.addEventListener('click', async () => {
  await supabase.auth.signInWithOAuth({ provider: 'google' });
});

signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

createInviteBtn.addEventListener('click', async () => {
  const { data, error } = await supabase.rpc('create_invite');
  if (error) {
    inviteCodeDisplay.textContent = error.message;
    return;
  }
  inviteCodeDisplay.textContent = `Your invite code: ${data}`;
});

redeemInviteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  redeemError.textContent = '';
  const code = document.getElementById('invite-code-input').value.trim();

  const { data, error } = await supabase.rpc('redeem_invite', { invite_code: code });
  if (error) {
    redeemError.textContent = error.message;
    return;
  }

  coupleId = data;
  showView('memories');
  await loadMemories();
});

memoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value;
  const note = document.getElementById('note').value.trim();
  const photoUrl = document.getElementById('photoUrl').value.trim();

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('memories').insert({
    couple_id: coupleId,
    created_by: user.id,
    title,
    date,
    note,
    photo_url: photoUrl,
  });

  if (error) {
    alert(error.message);
    return;
  }
  memoryForm.reset();
  await loadMemories();
});

memoryList.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.delete-btn');
  if (!deleteBtn) return;
  const id = deleteBtn.closest('.memory-card').dataset.id;
  const { error } = await supabase.from('memories').delete().eq('id', id);
  if (!error) await loadMemories();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    enterApp(session);
  } else {
    showSignedOut();
  }
});
