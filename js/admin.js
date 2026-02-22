/**
 * admin.js
 * ------------------------------------------------------------------
 * Painel administrativo simples para editar conteúdo do site romântico.
 * Persistência no localStorage e opção de exportar JSON para deploy.
 */

const CONTENT_PATH = '../config/content.json';
const STORAGE_KEY = 'romanticSiteContent';
const DEFAULT_NAVIGATION = {
  autoRotate: true,
  intervalMs: 6500,
  pauseOnHover: true,
};

/** Carrega dados padrão e mescla com localStorage quando existir. */
async function getInitialContent() {
  const response = await fetch(CONTENT_PATH);
  const defaults = await response.json();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return normalizeContent(defaults);

  try {
    return normalizeContent(JSON.parse(stored));
  } catch {
    return normalizeContent(defaults);
  }
}

/** Mantém retrocompatibilidade com JSONs antigos salvos no navegador. */
function normalizeContent(content) {
  const fallbackLetter =
    content.sections?.find((section) => section.id.includes('carta'))?.text ??
    content.site?.subtitle ??
    'Você é a melhor parte dos meus dias.';

  return {
    ...content,
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

/** Campos base para edição rápida de seções. */
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
        <button type="button" data-action="up">↑ Subir</button>
        <button type="button" data-action="down">↓ Descer</button>
      </div>
    </article>
  `;
}

/** Campos de fotos (URL + legenda + upload). */
function photoEditor(photo, index) {
  const preview = photo.url ? `<img class="photo-preview" src="${photo.url}" alt="Prévia da foto ${index + 1}" />` : '';

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
          <input type="file" data-action="upload-replace" accept="image/*" />
        </label>
      </div>
      <div class="item-tools">
        <button type="button" data-action="remove-photo">Remover</button>
      </div>
    </article>
  `;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    reader.readAsDataURL(file);
  });
}

/** Preenche o formulário com dados atuais. */
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

/** Coleta todos os dados do formulário e recria o objeto final. */
function collectForm(baseContent) {
  const next = structuredClone(baseContent);

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
    ...next.sections[idx],
    title: node.querySelector('[data-field="title"]').value.trim(),
    text: node.querySelector('[data-field="text"]').value.trim(),
  }));

  next.photos = [...document.querySelectorAll('[data-photo-index]')].map((node) => ({
    url: node.querySelector('[data-field="url"]').value.trim(),
    caption: node.querySelector('[data-field="caption"]').value.trim(),
  }));

  return next;
}

/** Faz download de um arquivo JSON para backup/deploy. */
function downloadJson(content) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'content.personalizado.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Inicializa eventos do formulário. */
async function initAdmin() {
  let content = await getInitialContent();
  fillForm(content);

  document.getElementById('sections-list').addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (!action) return;

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

    const card = event.target.closest('[data-photo-index]');
    const index = Number(card.dataset.photoIndex);

    if (action === 'remove-photo') {
      content.photos.splice(index, 1);
      fillForm(content);
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
      const dataUrl = await readFileAsDataUrl(file);
      content.photos[index].url = dataUrl;
      fillForm(content);
    } catch {
      alert('Não foi possível carregar a imagem selecionada.');
    }
  });

  document.getElementById('upload-photo').addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      content.photos.push({
        url: dataUrl,
        caption: file.name.replace(/\.[^.]+$/, ''),
      });
      fillForm(content);
      event.target.value = '';
    } catch {
      alert('Não foi possível carregar a imagem selecionada.');
    }
  });

  document.getElementById('add-photo').addEventListener('click', () => {
    content.photos.push({
      url: '../assets/images/foto-extra.svg',
      caption: 'Novo momento especial',
    });
    fillForm(content);
  });

  document.getElementById('save-content').addEventListener('click', () => {
    content = collectForm(content);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    alert('Alterações salvas! Abra a página pública para visualizar.');
  });

  document.getElementById('download-json').addEventListener('click', () => {
    content = collectForm(content);
    downloadJson(content);
  });

  document.getElementById('reset-default').addEventListener('click', async () => {
    localStorage.removeItem(STORAGE_KEY);
    content = await getInitialContent();
    fillForm(content);
    alert('Conteúdo restaurado para o padrão.');
  });
}

initAdmin();
