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
const MEMORY_LAYOUTS = ['left-photo', 'right-photo'];
const WIDGET_TYPES = ['photo', 'postit', 'text', 'heart', 'star', 'flower', 'tape', 'pin'];
const RESIZABLE_WIDGET_TYPES = new Set(['photo', 'postit']);
const WIDGET_LIMIT = 24;
const WIDGET_ROTATION_LIMIT = 45;
const WIDGET_LABELS = {
  photo: 'Foto principal',
  postit: 'Post-it / poesia',
  text: 'Texto maior',
  heart: 'Adesivo de coração',
  star: 'Estrela',
  flower: 'Flor',
  tape: 'Fita adesiva',
  pin: 'Alfinete',
};

let messageTimer;
let activeWidgetInteraction;

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
    photos: Array.isArray(content.photos) ? content.photos.map(normalizePhotoMemory) : [],
  };
}

function normalizePhotoMemory(photo, index = 0) {
  const caption = String(photo?.caption ?? '').trim();
  const poem = String(photo?.poem ?? '').trim();
  const layout = MEMORY_LAYOUTS.includes(photo?.layout) ? photo.layout : 'left-photo';
  const widgets = normalizeMemoryWidgets(photo?.widgets, layout);

  const normalized = {
    id: String(photo?.id || `memory-${index + 1}`).trim(),
    url: String(photo?.url ?? '').trim(),
    caption,
    poem,
    story: String(photo?.story ?? '').trim(),
    date: String(photo?.date ?? '').trim(),
    layout,
  };

  if (widgets.length) {
    normalized.widgets = widgets;
  }

  return normalized;
}

function getDefaultWidgets(layout = 'left-photo') {
  const isRightPhoto = layout === 'right-photo';

  return [
    {
      id: 'photo-main',
      type: 'photo',
      x: isRightPhoto ? 50 : 8,
      y: 19,
      width: 40,
      height: 48,
      rotation: isRightPhoto ? 2 : -2,
    },
    {
      id: 'poem-note',
      type: 'postit',
      x: isRightPhoto ? 12 : 58,
      y: 24,
      width: 30,
      height: 25,
      rotation: isRightPhoto ? -2 : 2,
    },
    {
      id: 'story-text',
      type: 'text',
      x: 12,
      y: 74,
      width: 76,
      height: 16,
      rotation: 0,
    },
    { id: 'sticker-heart', type: 'heart', x: 84, y: 82, width: 5, height: 5, rotation: 4 },
    { id: 'sticker-star', type: 'star', x: 84, y: 16, width: 5, height: 5, rotation: 14 },
    { id: 'sticker-flower', type: 'flower', x: 89, y: 72, width: 7, height: 7, rotation: 0 },
    { id: 'sticker-tape', type: 'tape', x: 7, y: 49, width: 11, height: 4, rotation: -12 },
    { id: 'sticker-pin', type: 'pin', x: 47, y: 15, width: 4, height: 6, rotation: 8 },
  ];
}

function normalizeMemoryWidgets(widgets, layout = 'left-photo') {
  if (!Array.isArray(widgets)) {
    return [];
  }

  const defaults = getDefaultWidgets(layout);
  const defaultsById = new Map(defaults.map((widget) => [widget.id, widget]));
  const seenIds = new Set();

  return widgets
    .slice(0, WIDGET_LIMIT)
    .map((widget, index) => normalizeMemoryWidget(widget, index, defaults, defaultsById))
    .filter((widget) => {
      if (!widget || seenIds.has(widget.id)) {
        return false;
      }

      seenIds.add(widget.id);
      return true;
    });
}

function normalizeMemoryWidget(widget, index, defaults, defaultsById) {
  const input = widget && typeof widget === 'object' && !Array.isArray(widget) ? widget : {};
  const rawId = String(input.id ?? '').trim();
  const id = rawId
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const fallbackById = defaultsById.get(id);
  const type = WIDGET_TYPES.includes(input.type) ? input.type : fallbackById?.type;

  if (!type) {
    return null;
  }

  const fallback = fallbackById ?? defaults.find((defaultWidget) => defaultWidget.type === type) ?? {
    id: id || `widget-${index + 1}`,
    type,
    x: 10,
    y: 10,
    width: 12,
    height: 12,
    rotation: 0,
  };
  const width = clampNumber(input.width, fallback.width, 2, 100);
  const height = clampNumber(input.height, fallback.height, 2, 100);

  return {
    id: id || fallback.id,
    type,
    x: clampNumber(input.x, fallback.x, 0, 100 - width),
    y: clampNumber(input.y, fallback.y, 0, 100 - height),
    width,
    height,
    rotation: clampNumber(input.rotation, fallback.rotation, -WIDGET_ROTATION_LIMIT, WIDGET_ROTATION_LIMIT),
  };
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  const finiteValue = Number.isFinite(parsed) ? parsed : fallback;
  const lower = Number.isFinite(min) ? min : -Infinity;
  const upper = Number.isFinite(max) ? Math.max(lower, max) : Infinity;

  return roundPercent(Math.min(Math.max(finiteValue, lower), upper));
}

function roundPercent(value) {
  return Math.round(Number(value) * 100) / 100;
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

function widgetStyle(widget) {
  return [
    `left: ${widget.x}%`,
    `top: ${widget.y}%`,
    `width: ${widget.width}%`,
    `height: ${widget.height}%`,
    `--widget-rotation: ${widget.rotation}deg`,
  ].join('; ');
}

function visualEditor(photo, index) {
  const hasCustomLayout = Array.isArray(photo.widgets) && photo.widgets.length > 0;
  const widgets = hasCustomLayout ? photo.widgets : getDefaultWidgets(photo.layout);
  const status = hasCustomLayout ? 'Layout personalizado' : 'Layout padrão';

  return `
    <div
      class="visual-editor"
      data-visual-editor
      data-has-custom-layout="${hasCustomLayout ? 'true' : 'false'}"
    >
      <div class="visual-editor-bar">
        <div>
          <h4>Editor visual da folha</h4>
          <p data-widget-status>${status}</p>
        </div>
        <div class="visual-editor-actions" role="group" aria-label="Ações do editor visual">
          <button type="button" class="ghost-btn" data-action="reset-layout">Restaurar layout padrão</button>
          <button type="button" class="ghost-btn" data-action="center-widget" disabled>Centralizar item selecionado</button>
        </div>
      </div>
      <div
        class="visual-sheet"
        data-visual-sheet
        tabindex="0"
        aria-label="Editor visual da memória ${index + 1}"
      >
        ${renderVisualWidgets(widgets, photo, index)}
      </div>
    </div>
  `;
}

function renderVisualWidgets(widgets, photo, index) {
  return widgets.map((widget) => visualWidget(widget, photo, index)).join('');
}

function visualWidget(widget, photo, index) {
  const label = WIDGET_LABELS[widget.type] || 'Widget';
  const isResizable = RESIZABLE_WIDGET_TYPES.has(widget.type);

  return `
    <div
      class="admin-widget admin-widget-${escapeHtml(widget.type)} ${isResizable ? 'is-resizable' : ''}"
      role="button"
      tabindex="0"
      aria-pressed="false"
      aria-label="${escapeHtml(label)}"
      data-widget-id="${escapeHtml(widget.id)}"
      data-widget-type="${escapeHtml(widget.type)}"
      data-x="${widget.x}"
      data-y="${widget.y}"
      data-width="${widget.width}"
      data-height="${widget.height}"
      data-rotation="${widget.rotation}"
      style="${widgetStyle(widget)}"
    >
      ${visualWidgetContent(widget, photo, index)}
      ${isResizable ? '<span class="admin-widget-resize" data-resize-handle aria-hidden="true"></span>' : ''}
    </div>
  `;
}

function visualWidgetContent(widget, photo, index) {
  const previewUrl = sanitizeImageUrl(photo.url);

  if (widget.type === 'photo') {
    return `
      <span class="admin-photo-frame">
        ${
          previewUrl
            ? `<img src="${escapeHtml(previewUrl)}" alt="Prévia da foto ${index + 1}" />`
            : '<span class="admin-widget-placeholder">Foto principal</span>'
        }
        <span class="admin-widget-caption">${escapeHtml(photo.caption || 'Legenda da foto')}</span>
      </span>
    `;
  }

  if (widget.type === 'postit') {
    return `<span class="admin-widget-text">${renderPreviewText(photo.poem || 'Post-it / poesia')}</span>`;
  }

  if (widget.type === 'text') {
    return `<span class="admin-widget-text">${renderPreviewText(photo.story || 'Texto maior')}</span>`;
  }

  return '<span class="admin-decor-shape" aria-hidden="true"></span>';
}

function renderPreviewText(text) {
  return escapeHtml(String(text ?? '').trim()).replace(/\n/g, '<br />');
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
  const memory = normalizePhotoMemory(photo, index);
  const previewUrl = sanitizeImageUrl(memory.url);
  const preview = previewUrl
    ? `<img class="photo-preview" src="${escapeHtml(previewUrl)}" alt="Prévia da foto ${index + 1}" />`
    : '';

  return `
    <article class="item" data-photo-index="${index}">
      ${preview}
      <div class="item-row">
        <label>ID da memória
          <input type="text" data-field="id" value="${escapeHtml(memory.id)}" />
        </label>
        <label>URL da foto
          <input type="text" data-field="url" value="${escapeHtml(memory.url)}" />
        </label>
        <label>Legenda
          <input type="text" data-field="caption" value="${escapeHtml(memory.caption)}" />
        </label>
        <label>Bilhete / poesia curta
          <textarea rows="2" data-field="poem">${escapeHtml(memory.poem)}</textarea>
        </label>
        <label>Anotação do diário
          <textarea rows="4" data-field="story">${escapeHtml(memory.story)}</textarea>
        </label>
        <label>Data do momento
          <input type="text" data-field="date" value="${escapeHtml(memory.date)}" />
        </label>
        <label>Layout
          <select data-field="layout">
            <option value="left-photo" ${memory.layout === 'left-photo' ? 'selected' : ''}>Foto à esquerda</option>
            <option value="right-photo" ${memory.layout === 'right-photo' ? 'selected' : ''}>Foto à direita</option>
          </select>
        </label>
        <label>Substituir imagem por upload
          <input type="file" data-action="upload-replace" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" />
        </label>
      </div>
      ${visualEditor(memory, index)}
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

function readPhotoEditorFields(node, index) {
  const photo = {
    id: node.querySelector('[data-field="id"]').value.trim() || `memory-${index + 1}`,
    url: node.querySelector('[data-field="url"]').value.trim(),
    caption: node.querySelector('[data-field="caption"]').value.trim(),
    poem: node.querySelector('[data-field="poem"]').value.trim(),
    story: node.querySelector('[data-field="story"]').value.trim(),
    date: node.querySelector('[data-field="date"]').value.trim(),
    layout: node.querySelector('[data-field="layout"]').value,
  };
  const widgets = collectVisualWidgets(node.querySelector('[data-visual-editor]'));

  if (widgets.length) {
    photo.widgets = widgets;
  }

  return photo;
}

function collectVisualWidgets(editor) {
  if (!editor || editor.dataset.hasCustomLayout !== 'true') {
    return [];
  }

  return [...editor.querySelectorAll('[data-widget-id]')].map((node) => widgetFromNode(node));
}

function widgetFromNode(node) {
  return {
    id: node.dataset.widgetId,
    type: node.dataset.widgetType,
    x: roundPercent(node.dataset.x),
    y: roundPercent(node.dataset.y),
    width: roundPercent(node.dataset.width),
    height: roundPercent(node.dataset.height),
    rotation: roundPercent(node.dataset.rotation),
  };
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

  next.photos = [...document.querySelectorAll('[data-photo-index]')].map((node, index) =>
    normalizePhotoMemory(readPhotoEditorFields(node, index), index)
  );

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

function markEditorCustom(editor) {
  if (!editor) return;

  editor.dataset.hasCustomLayout = 'true';
  updateVisualStatus(editor);
}

function clearVisualSelection(editor) {
  if (!editor) return;

  editor.querySelectorAll('[data-widget-id].is-selected').forEach((node) => {
    node.classList.remove('is-selected');
    node.setAttribute('aria-pressed', 'false');
  });
  editor.dataset.selectedWidgetId = '';
  const centerButton = editor.querySelector('[data-action="center-widget"]');
  if (centerButton) {
    centerButton.disabled = true;
  }
  updateVisualStatus(editor);
}

function selectVisualWidget(widget) {
  const editor = widget?.closest('[data-visual-editor]');
  if (!editor) return;

  editor.querySelectorAll('[data-widget-id].is-selected').forEach((node) => {
    node.classList.remove('is-selected');
    node.setAttribute('aria-pressed', 'false');
  });
  widget.classList.add('is-selected');
  widget.setAttribute('aria-pressed', 'true');
  editor.dataset.selectedWidgetId = widget.dataset.widgetId;

  const centerButton = editor.querySelector('[data-action="center-widget"]');
  if (centerButton) {
    centerButton.disabled = false;
  }

  updateVisualStatus(editor);
}

function updateVisualStatus(editor) {
  const status = editor?.querySelector('[data-widget-status]');
  if (!status) return;

  const selectedWidget = editor.querySelector('[data-widget-id].is-selected');
  const layoutStatus = editor.dataset.hasCustomLayout === 'true' ? 'Layout personalizado' : 'Layout padrão';

  if (!selectedWidget) {
    status.textContent = layoutStatus;
    return;
  }

  status.textContent = `${WIDGET_LABELS[selectedWidget.dataset.widgetType] || 'Widget'} selecionado - ${layoutStatus}`;
}

function applyWidgetPosition(widgetNode, widget) {
  const next = {
    x: roundPercent(widget.x),
    y: roundPercent(widget.y),
    width: roundPercent(widget.width),
    height: roundPercent(widget.height),
    rotation: roundPercent(widget.rotation),
  };

  widgetNode.dataset.x = next.x;
  widgetNode.dataset.y = next.y;
  widgetNode.dataset.width = next.width;
  widgetNode.dataset.height = next.height;
  widgetNode.dataset.rotation = next.rotation;
  widgetNode.style.left = `${next.x}%`;
  widgetNode.style.top = `${next.y}%`;
  widgetNode.style.width = `${next.width}%`;
  widgetNode.style.height = `${next.height}%`;
  widgetNode.style.setProperty('--widget-rotation', `${next.rotation}deg`);
}

function getWidgetMinimumSize(type) {
  if (type === 'photo') return { width: 16, height: 18 };
  if (type === 'postit') return { width: 14, height: 12 };
  return { width: 3, height: 3 };
}

function constrainWidgetBox(widget) {
  const minimum = getWidgetMinimumSize(widget.type);
  const width = clampNumber(widget.width, minimum.width, minimum.width, 100);
  const height = clampNumber(widget.height, minimum.height, minimum.height, 100);

  return {
    ...widget,
    width,
    height,
    x: clampNumber(widget.x, 0, 0, 100 - width),
    y: clampNumber(widget.y, 0, 0, 100 - height),
  };
}

function setVisualEditorWidgets(editor, widgets, photo, index) {
  const sheet = editor?.querySelector('[data-visual-sheet]');
  if (!sheet) return;

  sheet.innerHTML = renderVisualWidgets(widgets, photo, index);
  clearVisualSelection(editor);
}

function resetVisualEditor(card, index) {
  const editor = card.querySelector('[data-visual-editor]');
  if (!editor) return;

  const photo = normalizePhotoMemory(readPhotoEditorFields(card, index), index);
  editor.dataset.hasCustomLayout = 'false';
  setVisualEditorWidgets(editor, getDefaultWidgets(photo.layout), photo, index);
  updateVisualStatus(editor);
}

function centerSelectedWidget(card) {
  const editor = card.querySelector('[data-visual-editor]');
  const selectedWidget = editor?.querySelector('[data-widget-id].is-selected');

  if (!selectedWidget) {
    return false;
  }

  const widget = widgetFromNode(selectedWidget);
  applyWidgetPosition(
    selectedWidget,
    constrainWidgetBox({
      ...widget,
      x: (100 - widget.width) / 2,
      y: (100 - widget.height) / 2,
    })
  );
  markEditorCustom(editor);
  selectVisualWidget(selectedWidget);
  return true;
}

function refreshDefaultVisualEditor(card, index) {
  const editor = card.querySelector('[data-visual-editor]');
  if (!editor || editor.dataset.hasCustomLayout === 'true') {
    return;
  }

  const photo = normalizePhotoMemory(readPhotoEditorFields(card, index), index);
  setVisualEditorWidgets(editor, getDefaultWidgets(photo.layout), photo, index);
  updateVisualStatus(editor);
}

function refreshVisualEditorContent(card) {
  const index = Number(card.dataset.photoIndex);
  const photo = normalizePhotoMemory(readPhotoEditorFields(card, index), index);
  const editor = card.querySelector('[data-visual-editor]');
  if (!editor) return;

  const photoWidget = editor.querySelector('[data-widget-type="photo"]');
  const postitWidget = editor.querySelector('[data-widget-type="postit"]');
  const textWidget = editor.querySelector('[data-widget-type="text"]');
  const previewUrl = sanitizeImageUrl(photo.url);

  if (photoWidget) {
    const frame = photoWidget.querySelector('.admin-photo-frame');
    if (frame) {
      frame.innerHTML = `
        ${
          previewUrl
            ? `<img src="${escapeHtml(previewUrl)}" alt="Prévia da foto ${index + 1}" />`
            : '<span class="admin-widget-placeholder">Foto principal</span>'
        }
        <span class="admin-widget-caption">${escapeHtml(photo.caption || 'Legenda da foto')}</span>
      `;
    }
  }

  if (postitWidget) {
    const text = postitWidget.querySelector('.admin-widget-text');
    if (text) {
      text.innerHTML = renderPreviewText(photo.poem || 'Post-it / poesia');
    }
  }

  if (textWidget) {
    const text = textWidget.querySelector('.admin-widget-text');
    if (text) {
      text.innerHTML = renderPreviewText(photo.story || 'Texto maior');
    }
  }
}

function startWidgetInteraction(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const widget = event.target.closest('[data-widget-id]');
  if (!widget || !event.target.closest('[data-visual-sheet]')) {
    return;
  }

  const editor = widget.closest('[data-visual-editor]');
  const sheet = widget.closest('[data-visual-sheet]');
  const isResize = Boolean(event.target.closest('[data-resize-handle]'));

  if (isResize && !RESIZABLE_WIDGET_TYPES.has(widget.dataset.widgetType)) {
    return;
  }

  const sheetRect = sheet.getBoundingClientRect();
  if (!sheetRect.width || !sheetRect.height) {
    return;
  }

  event.preventDefault();
  selectVisualWidget(widget);

  activeWidgetInteraction = {
    pointerId: event.pointerId,
    widget,
    editor,
    sheetRect,
    isResize,
    hasChanged: false,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startWidget: widgetFromNode(widget),
  };

  try {
    widget.setPointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture can fail when the pointer has already been released.
  }
}

function moveWidgetInteraction(event) {
  if (!activeWidgetInteraction || activeWidgetInteraction.pointerId !== event.pointerId) {
    return;
  }

  const state = activeWidgetInteraction;
  const deltaX = ((event.clientX - state.startClientX) / state.sheetRect.width) * 100;
  const deltaY = ((event.clientY - state.startClientY) / state.sheetRect.height) * 100;

  if (!deltaX && !deltaY) {
    return;
  }

  const start = state.startWidget;
  const next = state.isResize
    ? constrainWidgetBox({
        ...start,
        width: start.width + deltaX,
        height: start.height + deltaY,
      })
    : constrainWidgetBox({
        ...start,
        x: start.x + deltaX,
        y: start.y + deltaY,
      });

  state.hasChanged = true;
  markEditorCustom(state.editor);
  applyWidgetPosition(state.widget, next);
}

function endWidgetInteraction(event) {
  if (!activeWidgetInteraction || activeWidgetInteraction.pointerId !== event.pointerId) {
    return;
  }

  if (activeWidgetInteraction.hasChanged) {
    selectVisualWidget(activeWidgetInteraction.widget);
  }

  activeWidgetInteraction = null;
}

function handleVisualWidgetKeydown(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const widget = event.target.closest('[data-widget-id]');
  if (!widget || event.defaultPrevented) {
    return;
  }

  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    selectVisualWidget(widget);
    return;
  }

  const deltas = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const delta = deltas[event.key];
  if (!delta) {
    return;
  }

  event.preventDefault();
  selectVisualWidget(widget);

  const step = event.shiftKey ? 5 : 1;
  const current = widgetFromNode(widget);
  applyWidgetPosition(
    widget,
    constrainWidgetBox({
      ...current,
      x: current.x + delta[0] * step,
      y: current.y + delta[1] * step,
    })
  );
  markEditorCustom(widget.closest('[data-visual-editor]'));
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

  const sectionsList = document.getElementById('sections-list');
  const photosList = document.getElementById('photos-list');

  sectionsList.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;

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

  photosList.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;

    const action = event.target.dataset.action;
    if (!action) return;

    content = collectForm(content);
    const card = event.target.closest('[data-photo-index]');
    const index = Number(card.dataset.photoIndex);

    if (action === 'reset-layout') {
      resetVisualEditor(card, index);
      setMessage('Layout padrão restaurado. Clique em salvar para persistir.', 'info');
    }

    if (action === 'center-widget') {
      if (centerSelectedWidget(card)) {
        setMessage('Item selecionado centralizado. Clique em salvar para persistir.', 'info');
      }
    }

    if (action === 'remove-photo') {
      content.photos.splice(index, 1);
      fillForm(content);
      setMessage('Foto removida. Clique em salvar para persistir.', 'info');
    }
  });

  photosList.addEventListener('input', (event) => {
    if (!(event.target instanceof Element) || !event.target.matches('[data-field]')) {
      return;
    }

    const card = event.target.closest('[data-photo-index]');
    if (card) {
      refreshVisualEditorContent(card);
    }
  });

  photosList.addEventListener('change', async (event) => {
    if (!(event.target instanceof Element)) return;

    if (event.target instanceof Element && event.target.matches('[data-field="layout"]')) {
      const card = event.target.closest('[data-photo-index]');
      if (card) {
        refreshDefaultVisualEditor(card, Number(card.dataset.photoIndex));
      }
      return;
    }

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

  photosList.addEventListener('pointerdown', startWidgetInteraction);
  photosList.addEventListener('keydown', handleVisualWidgetKeydown);
  photosList.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Element)) return;
    const widget = event.target.closest('[data-widget-id]');
    if (widget) {
      selectVisualWidget(widget);
    }
  });
  document.addEventListener('pointermove', moveWidgetInteraction);
  document.addEventListener('pointerup', endWidgetInteraction);
  document.addEventListener('pointercancel', endWidgetInteraction);

  document.getElementById('upload-photo').addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    try {
      content = collectForm(content);
      setMessage('Enviando imagem...', 'info');
      const upload = await uploadFile(IMAGE_UPLOAD_ENDPOINT, file);
      content.photos.push({
        id: `memory-${content.photos.length + 1}`,
        url: upload.url,
        caption: captionFromFilename(file.name),
        poem: '',
        story: '',
        date: '',
        layout: 'left-photo',
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
      id: `memory-${content.photos.length + 1}`,
      url: '/assets/images/foto-extra.svg',
      caption: 'Novo momento especial',
      poem: '',
      story: '',
      date: '',
      layout: 'left-photo',
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
