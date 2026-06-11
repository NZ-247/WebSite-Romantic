const form = document.getElementById('login-form');
const tokenInput = document.getElementById('admin-token');
const message = document.getElementById('login-message');

const params = new URLSearchParams(window.location.search);
const nextPath = params.get('next') || '/pages/admin.html';

async function checkSession() {
  try {
    const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
    const data = await response.json();

    if (data.authenticated) {
      window.location.assign(nextPath);
    }
  } catch {
    // A tela de login continua disponivel se a consulta de sessao falhar.
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  form.classList.add('is-busy');

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ token: tokenInput.value }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      message.textContent = data.error || 'Nao foi possivel entrar. Confira o token.';
      tokenInput.select();
      return;
    }

    window.location.assign(nextPath);
  } catch {
    message.textContent = 'Nao foi possivel conectar ao servidor.';
  } finally {
    form.classList.remove('is-busy');
  }
});

checkSession();
