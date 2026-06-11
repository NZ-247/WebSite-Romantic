/**
 * admin.js
 * ------------------------------------------------------------------
 * Painel administrativo autenticado com persistencia no backend.
 */

const ADMIN_CONTENT_ENDPOINT = '/api/admin/content';
const IMAGE_UPLOAD_ENDPOINT = '/api/admin/uploads/images';
const MUSIC_UPLOAD_ENDPOINT = '/api/admin/uploads/music';
const DEFAULT_NAVIGATION = {
  autoRotate: true,
  intervalMs: 6500,
  pauseOnHover: true,
};

let messageTimer;

async function apiFetch(url, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    window.location.assign(`/pages/login.html?next=${encodeURIComponent('/pages/admin.html')}`);
    throw new Error('Sessao expirada.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Nao foi possivel concluir a operacao.');
  }

  return data;
}

async function getInitialContent() {
  return normalizeContent(await apiFetch(ADMIN_CONTENT_ENDPOINT));
}

function normalizeContent(content) {
  const fallbackLetter =
    content.sections?.find((section) => String(section.id || '').includes('carta'))?.text ??
    content.site?.subtitle ??
    'Você é a melhor parte dos meus dias.';

  return {
    ...content,
    site: {
      title: 'Para o Amor da Minha Vida',
      subtitle: '',
      footerMessage: 'Com amor.',
      ...(content.site ?? {}),
    },
    theme: {
      primaryColor: '#d91663',
      secondaryColor: '#6c4cf6',
      accentColor: '#ffb000',
      animationStyle: 'fade',
      ...(content.theme ?? {}),
    },
    navigation: {
      ...DEFAULT_NAVIGATION,
      ...(content.navigation ?? {}),
    },
    letter: {
      title: 'Uma carta para você',
      message: fallbackLetter,
      signature: content.site?.footerMessage ?? 'Com amor.',
      ...(content.letter ?? {}),
    },
    song: {
      title: 'Nossa música',
      artist: 'Trilha sonora do nosso amor',
      url: '',
      ...(content.song ?? {}),
    },
    sections: Array.isArray(content.sections) ? content.sections : [],
    photos: Array.isArray(content.photos) ? content.photos : [],
  };
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return String(text ?? '').replace(/[&<>"']/g, (char) => map[char]);
}

function sanitizeImageUrl(rawUrl) {
  const value = String(rawUrl ?? '').trim();

  if (!value || value.startsWith('//') || /["'<>]/.test(value)) {
    return '';
  }

  try {
    const parsed = new URL(value, window.location.origin);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    if (!/\.(jpe?g|png|webp|svg)$/i.test(parsed.pathname)) {
      return '';
    }

    return parsed.href;
  } catch {
    return '';
  }
}

function sectionEditor(section, index) {
  return `
    <article class="item" data-section-index="${index}">
      <div class="item-row">
        <label>Título
          <input type="text" data-field="title" value="${escapeHtml(section.title)}" />
        </label>
        <label>Texto
          <textarea rows="3" data-field="text">${escapeHtml(section.text)}</textarea>
        </label>
      </div>
      <div class="item-tools">
        <button type="button" data-action="up">Subir</button>
        <button type="button" data-action="down">Descer</button>
      </div>
    </article>
  `;
}

function photoEditor(photo, index) {
  const previewUrl = sanitizeImageUrl(photo.url);
  const preview = previewUrl
    ? `<img class="photo-preview" src="${escapeHtml(previewUrl)}" alt="Prévia da foto ${index + 1}" />`
    : '';

  return `
    <article class="item" data-photo-index="${index}">
      ${preview}
      <div class="item-row">
        <label>URL da foto
          <input type="text" data-field="url" value="${escapeHtml(photo.url)}" />
        </label>
        <label>Legenda
          <input type="text" data-field="caption" value="${escapeHtml(photo.caption)}" />
        </label>
        <label>Substituir imagem por upload
          <input type="file" data-action="upload-replace" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" />
        </label>
      </div>
      <div class="item-tools">
        <button type="button" data-action="remove-photo">Remover</button>
      </div>
    </article>
  `;
}

function fillForm(content) {
  document.getElementById('site-title').value = content.site.title;
  document.getElementById('site-subtitle').value = content.site.subtitle;
  document.getElementById('footer-message').value = content.site.footerMessage;

  document.getElementById('primary-color').value = content.theme.primaryColor;
  document.getElementById('secondary-color').value = content.theme.secondaryColor;
  document.getElementById('accent-color').value = content.theme.accentColor;
  document.getElementById('animation-style').value = content.theme.animationStyle;
  document.getElementById('auto-rotate').checked = Boolean(content.navigation.autoRotate);
  document.getElementById('auto-interval').value = Number(content.navigation.intervalMs) || DEFAULT_NAVIGATION.intervalMs;
  document.getElementById('pause-on-hover').checked = Boolean(content.navigation.pauseOnHover);
  document.getElementById('letter-title').value = content.letter.title;
  document.getElementById('letter-message').value = content.letter.message;
  document.getElementById('letter-signature').value = content.letter.signature;

  document.getElementById('song-title').value = content.song.title;
  document.getElementById('song-artist').value = content.song.artist;
  document.getElementById('song-url').value = content.song.url;

  document.getElementById('sections-list').innerHTML = content.sections
    .map((section, index) => sectionEditor(section, index))
    .join('');

  document.getElementById('photos-list').innerHTML = content.photos
    .map((photo, index) => photoEditor(photo, index))
    .join('');
}

function cloneContent(content) {
  return JSON.parse(JSON.stringify(content));
}

function collectForm(baseContent) {
  const next = cloneContent(baseContent);

  next.site.title = document.getElementById('site-title').value.trim();
  next.site.subtitle = document.getElementById('site-subtitle').value.trim();
  next.site.footerMessage = document.getElementById('footer-message').value.trim();

  next.theme.primaryColor = document.getElementById('primary-color').value;
  next.theme.secondaryColor = document.getElementById('secondary-color').value;
  next.theme.accentColor = document.getElementById('accent-color').value;
  next.theme.animationStyle = document.getElementById('animation-style').value;
  next.navigation.autoRotate = document.getElementById('auto-rotate').checked;
  next.navigation.intervalMs = Math.max(
    2500,
    Number(document.getElementById('auto-interval').value) || DEFAULT_NAVIGATION.intervalMs
  );
  next.navigation.pauseOnHover = document.getElementById('pause-on-hover').checked;
  next.letter.title = document.getElementById('letter-title').value.trim();
  next.letter.message = document.getElementById('letter-message').value.trim();
  next.letter.signature = document.getElementById('letter-signature').value.trim();

  next.song.title = document.getElementById('song-title').value.trim();
  next.song.artist = document.getElementById('song-artist').value.trim();
  next.song.url = document.getElementById('song-url').value.trim();

  next.sections = [...document.querySelectorAll('[data-section-index]')].map((node, idx) => ({
    ...(next.sections[idx] ?? { id: `section-${idx + 1}`, type: 'text' }),
    title: node.querySelector('[data-field="title"]').value.trim(),
    text: node.querySelector('[data-field="text"]').value.trim(),
  }));

  next.photos = [...document.querySelectorAll('[data-photo-index]')].map((node) => ({
    url: node.querySelector('[data-field="url"]').value.trim(),
    caption: node.querySelector('[data-field="caption"]').value.trim(),
  }));

  return next;
}

function downloadJson(content) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'content.personalizado.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function setMessage(text, type = 'info') {
  const target = document.getElementById('admin-message');
  target.textContent = text;
  target.dataset.type = type;

  window.clearTimeout(messageTimer);
  if (type === 'success') {
    messageTimer = window.setTimeout(() => {
      target.textContent = '';
      target.removeAttribute('data-type');
    }, 4200);
  }
}

function captionFromFilename(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Momento especial';
}

async function uploadFile(endpoint, file) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch(endpoint, {
    method: 'POST',
    body: formData,
  });
}

async function initAdmin() {
  let content;

  try {
    content = await getInitialContent();
    fillForm(content);
  } catch (error) {
    setMessage(error.message || 'Não foi possível carregar o conteúdo.', 'error');
    return;
  }

  document.getElementById('sections-list').addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (!action) return;

    content = collectForm(content);
    const card = event.target.closest('[data-section-index]');
    const index = Number(card.dataset.sectionIndex);

    if (action === 'up' && index > 0) {
      [content.sections[index - 1], content.sections[index]] = [content.sections[index], content.sections[index - 1]];
      fillForm(content);
    }

    if (action === 'down' && index < content.sections.length - 1) {
      [content.sections[index + 1], content.sections[index]] = [content.sections[index], content.sections[index + 1]];
      fillForm(content);
    }
  });

  document.getElementById('photos-list').addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (!action) return;

    content = collectForm(content);
    const card = event.target.closest('[data-photo-index]');
    const index = Number(card.dataset.photoIndex);

    if (action === 'remove-photo') {
      content.photos.splice(index, 1);
      fillForm(content);
      setMessage('Foto removida. Clique em salvar para persistir.', 'info');
    }
  });

  document.getElementById('photos-list').addEventListener('change', async (event) => {
    const action = event.target.dataset.action;
    if (action !== 'upload-replace') return;

    const card = event.target.closest('[data-photo-index]');
    const index = Number(card.dataset.photoIndex);
    const [file] = event.target.files || [];
    if (!file) return;

    try {
      content = collectForm(content);
      setMessage('Enviando imagem...', 'info');
      const upload = await uploadFile(IMAGE_UPLOAD_ENDPOINT, file);
      content.photos[index].url = upload.url;
      if (!content.photos[index].caption) {
        content.photos[index].caption = captionFromFilename(file.name);
      }
      fillForm(content);
      setMessage('Imagem enviada. Clique em salvar para publicar.', 'success');
    } catch (error) {
      setMessage(error.message || 'Não foi possível enviar a imagem.', 'error');
    }
  });

  document.getElementById('upload-photo').addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    try {
      content = collectForm(content);
      setMessage('Enviando imagem...', 'info');
      const upload = await uploadFile(IMAGE_UPLOAD_ENDPOINT, file);
      content.photos.push({
        url: upload.url,
        caption: captionFromFilename(file.name),
      });
      fillForm(content);
      event.target.value = '';
      setMessage('Imagem adicionada. Clique em salvar para publicar.', 'success');
    } catch (error) {
      setMessage(error.message || 'Não foi possível enviar a imagem.', 'error');
    }
  });

  document.getElementById('upload-music').addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    try {
      content = collectForm(content);
      setMessage('Enviando MP3...', 'info');
      const upload = await uploadFile(MUSIC_UPLOAD_ENDPOINT, file);
      content.song.url = upload.url;
      if (!content.song.title) {
        content.song.title = captionFromFilename(file.name);
      }
      fillForm(content);
      event.target.value = '';
      setMessage('MP3 enviado. Clique em salvar para publicar.', 'success');
    } catch (error) {
      setMessage(error.message || 'Não foi possível enviar o MP3.', 'error');
    }
  });

  document.getElementById('add-photo').addEventListener('click', () => {
    content = collectForm(content);
    content.photos.push({
      url: '/assets/images/foto-extra.svg',
      caption: 'Novo momento especial',
    });
    fillForm(content);
  });

  document.getElementById('save-content').addEventListener('click', async () => {
    try {
      content = collectForm(content);
      setMessage('Salvando alterações...', 'info');
      content = normalizeContent(await apiFetch(ADMIN_CONTENT_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      }));
      fillForm(content);
      setMessage('Alterações salvas e publicadas.', 'success');
    } catch (error) {
      setMessage(error.message || 'Não foi possível salvar.', 'error');
    }
  });

  document.getElementById('download-json').addEventListener('click', () => {
    content = collectForm(content);
    downloadJson(content);
  });

  document.getElementById('reload-content').addEventListener('click', async () => {
    try {
      content = await getInitialContent();
      fillForm(content);
      setMessage('Conteúdo recarregado do servidor.', 'success');
    } catch (error) {
      setMessage(error.message || 'Não foi possível recarregar.', 'error');
    }
  });

  document.getElementById('logout-admin').addEventListener('click', async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' });
    } finally {
      window.location.assign('/pages/login.html');
    }
  });
}

initAdmin();
