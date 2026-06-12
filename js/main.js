/**
 * main.js
 * ------------------------------------------------------------------
 * Experiencia romantica publica carregada por API.
 */

const CONTENT_ENDPOINT = '/api/content';
const DEFAULT_NAVIGATION = {
  autoRotate: true,
  intervalMs: 6500,
  pauseOnHover: true,
};
const MEMORY_LAYOUTS = ['left-photo', 'right-photo'];
const CAPTION_POSITIONS = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right'];
const DEFAULT_CAPTION_POSITION = 'top-center';
const WIDGET_TYPES = ['photo', 'postit', 'text', 'heart', 'star', 'flower', 'tape', 'pin'];
const WIDGET_LIMIT = 24;
const WIDGET_ROTATION_LIMIT = 45;

let spotifyApiPromise;

async function loadContent() {
  const response = await fetch(CONTENT_ENDPOINT, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Falha ao carregar conteudo.');
  }

  return normalizeContent(await response.json());
}

function normalizeContent(content) {
  const fallbackLetter =
    content.sections?.find((section) => String(section.id || '').includes('carta'))?.text ??
    content.site?.subtitle ??
    'Meu amor, cada momento ao seu lado transforma a vida em poesia.';

  const photos = Array.isArray(content.photos)
    ? content.photos
        .map((photo, index) => normalizePhotoMemory(photo, index))
        .filter((photo) => photo.url)
    : [];

  return {
    ...content,
    site: {
      title: 'Para o Amor da Minha Vida',
      subtitle: 'Um cantinho para eternizar nossa historia.',
      footerMessage: 'Com amor, hoje e sempre.',
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
      title: 'Uma carta para voce',
      message: fallbackLetter,
      signature: content.site?.footerMessage ?? 'Com amor, hoje e sempre.',
      ...(content.letter ?? {}),
    },
    photos,
    song: {
      title: 'Nossa musica',
      artist: 'Toque para ouvir',
      ...(content.song ?? {}),
      url: sanitizeMusicUrl(content.song?.url),
    },
  };
}

function normalizePhotoMemory(photo, index) {
  const caption = String(photo?.caption ?? '').trim();
  const poem = String(photo?.poem ?? '').trim();
  const story = String(photo?.story ?? '').trim();
  const date = String(photo?.date ?? '').trim();
  const layout = MEMORY_LAYOUTS.includes(photo?.layout) ? photo.layout : 'left-photo';
  const captionPosition = safeCaptionPosition(photo?.captionPosition);
  const widgets = normalizeMemoryWidgets(photo?.widgets, layout);

  const normalized = {
    id: safeMemoryId(photo?.id, index),
    url: sanitizeImageUrl(photo?.url),
    caption,
    captionPosition,
    poem,
    story,
    date,
    layout,
  };

  if (widgets.length) {
    normalized.widgets = widgets;
  }

  return normalized;
}

function safeMemoryId(rawId, index) {
  const value = String(rawId ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return value || `memory-${index + 1}`;
}

function safeCaptionPosition(value) {
  return CAPTION_POSITIONS.includes(value) ? value : DEFAULT_CAPTION_POSITION;
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
  const id = safeWidgetId(input.id, index);
  const fallbackById = defaultsById.get(id);
  const type = WIDGET_TYPES.includes(input.type) ? input.type : fallbackById?.type;

  if (!type) {
    return null;
  }

  const fallback = fallbackById ?? defaults.find((defaultWidget) => defaultWidget.type === type) ?? {
    id,
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

function safeWidgetId(rawId, index) {
  const value = String(rawId ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return value || `widget-${index + 1}`;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  const finiteValue = Number.isFinite(parsed) ? parsed : fallback;
  const lower = Number.isFinite(min) ? min : -Infinity;
  const upper = Number.isFinite(max) ? Math.max(lower, max) : Infinity;

  return Math.round(Math.min(Math.max(finiteValue, lower), upper) * 100) / 100;
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

function renderMultilineText(text) {
  return escapeHtml(text).replace(/\n/g, '<br />');
}

function sanitizeImageUrl(rawUrl) {
  return sanitizeUrl(rawUrl, /\.(jpe?g|png|webp|svg)$/i);
}

function sanitizeMusicUrl(rawUrl) {
  const value = String(rawUrl ?? '').trim();

  if (!value || /["'<>]/.test(value)) return '';

  if (/^spotify:(track|album|playlist|episode|show):[a-z0-9]+$/i.test(value)) {
    return value;
  }

  if (/^https:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\/[a-z0-9]+/i.test(value)) {
    return value;
  }

  return sanitizeUrl(value, /\.mp3$/i);
}

function sanitizeUrl(rawUrl, extensionPattern) {
  const value = String(rawUrl ?? '').trim();

  if (!value || value.startsWith('//') || /["'<>]/.test(value)) {
    return '';
  }

  try {
    const parsed = new URL(value, window.location.origin);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    if (!extensionPattern.test(parsed.pathname)) {
      return '';
    }

    return parsed.href;
  } catch {
    return '';
  }
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value)) ? value : fallback;
}

function safeAnimationStyle(value) {
  return ['fade', 'slide', 'parallax'].includes(value) ? value : 'fade';
}

function themeStyle(theme) {
  const primary = safeColor(theme.primaryColor, '#d91663');
  const secondary = safeColor(theme.secondaryColor, '#6c4cf6');
  const accent = safeColor(theme.accentColor, '#ffb000');

  return `--theme-primary: ${primary}; --theme-secondary: ${secondary}; --accent: ${accent};`;
}

function renderLoadState() {
  const app = document.getElementById('public-app');
  app.innerHTML = `
    <section class="romantic-stage is-loading">
      <div class="content-status">
        <span class="status-heart" aria-hidden="true"></span>
        <p>Preparando sua surpresa...</p>
      </div>
    </section>
  `;
}

function renderLoadError() {
  const app = document.getElementById('public-app');
  app.innerHTML = `
    <section class="romantic-stage">
      <div class="content-error" role="alert">
        <h1>Ops, o amor tropeçou um pouquinho</h1>
        <p>Não consegui carregar o conteúdo agora. Tente atualizar a página em alguns instantes.</p>
        <button type="button" onclick="window.location.reload()" aria-label="Tentar carregar o conteúdo novamente">
          Tentar novamente
        </button>
      </div>
    </section>
  `;
}

function memoryWidgetStyle(widget) {
  return [
    `left: ${widget.x}%`,
    `top: ${widget.y}%`,
    `width: ${widget.width}%`,
    `height: ${widget.height}%`,
    `--widget-rotation: ${widget.rotation}deg`,
  ].join('; ');
}

function getMemoryDisplayText(photo, index) {
  const caption = String(photo.caption || '').trim();
  const poem = String(photo.poem || '').trim();
  const story = String(photo.story || '').trim();
  const date = String(photo.date || '').trim();
  const title = caption || date || poem || `Memória ${index + 1}`;
  const imageAlt = caption || poem || `Foto de uma memória romântica ${index + 1}`;

  return {
    poem,
    story,
    date,
    title,
    imageAlt,
  };
}

function renderMemoryWidget(widget, photo, index, context) {
  const style = memoryWidgetStyle(widget);

  if (widget.type === 'photo') {
    return `
      <figure class="memory-widget memory-widget-photo" style="${style}">
        <span class="photo-clip" aria-hidden="true"></span>
        <span class="photo-tape photo-tape-left" aria-hidden="true"></span>
        <span class="photo-tape photo-tape-right" aria-hidden="true"></span>
        <img
          src="${escapeHtml(photo.url)}"
          alt="${escapeHtml(context.imageAlt)}"
          loading="lazy"
        />
      </figure>
    `;
  }

  if (widget.type === 'postit') {
    if (!context.poem) return '';

    return `
      <aside class="memory-widget memory-widget-postit memory-note" id="${context.noteId}" style="${style}" aria-label="Bilhete da memória ${index + 1}">
        <span class="note-tape" aria-hidden="true"></span>
        <p>${renderMultilineText(context.poem)}</p>
      </aside>
    `;
  }

  if (widget.type === 'text') {
    if (!context.story) return '';

    return `
      <div class="memory-widget memory-widget-text diary-entry" id="${context.storyId}" style="${style}">
        <span class="diary-entry-label">Anotação</span>
        <p>${renderMultilineText(context.story)}</p>
      </div>
    `;
  }

  return `<span class="memory-widget memory-widget-${escapeHtml(widget.type)}" style="${style}" aria-hidden="true"></span>`;
}

function renderMobileSafeMemoryFlow(photo, index, context) {
  const noteMarkup = context.poem
    ? `
      <aside class="memory-note" aria-label="Bilhete da memória ${index + 1}">
        <span class="note-tape" aria-hidden="true"></span>
        <p>${renderMultilineText(context.poem)}</p>
      </aside>
    `
    : '';
  const storyMarkup = context.story
    ? `
      <div class="diary-entry">
        <span class="diary-entry-label">Anotação</span>
        <p>${renderMultilineText(context.story)}</p>
      </div>
    `
    : '';

  return `
    <div class="memory-mobile-flow">
      <figure class="printed-photo">
        <span class="photo-clip" aria-hidden="true"></span>
        <span class="photo-tape photo-tape-left" aria-hidden="true"></span>
        <span class="photo-tape photo-tape-right" aria-hidden="true"></span>
        <img
          src="${escapeHtml(photo.url)}"
          alt="${escapeHtml(context.imageAlt)}"
          loading="lazy"
        />
      </figure>
      ${noteMarkup}
      ${storyMarkup}
    </div>
  `;
}

function renderVisualMemoryPage(photo, index, context) {
  return `
      <article
        class="memory-page has-visual-widgets memory-layout-${escapeHtml(photo.layout)} caption-position-${escapeHtml(photo.captionPosition)}"
        data-photo-index="${index}"
        data-memory-id="${escapeHtml(photo.id)}"
        tabindex="-1"
        aria-hidden="true"
        aria-labelledby="${context.titleId}"
        ${context.descriptionAttribute}
        aria-roledescription="página do diário"
      >
        <span class="page-binding" aria-hidden="true"></span>
        <header class="memory-page-header visual-page-header">
          <h3 id="${context.titleId}">${escapeHtml(context.title)}</h3>
          ${context.dateMarkup}
        </header>
        <div class="memory-visual-canvas">
          ${photo.widgets.map((widget) => renderMemoryWidget(widget, photo, index, context)).join('')}
        </div>
        ${renderMobileSafeMemoryFlow(photo, index, context)}
      </article>
    `;
}

function renderMemoryPages(photos) {
  if (!photos.length) {
    return '<p class="empty-photos">Adicione memórias no painel admin para exibir aqui.</p>';
  }

  return photos
    .map((photo, index) => {
      const { poem, story, date, title, imageAlt } = getMemoryDisplayText(photo, index);
      const titleId = `memory-title-${index}`;
      const noteId = `memory-note-${index}`;
      const storyId = `memory-story-${index}`;
      const hasVisualWidgets = Array.isArray(photo.widgets) && photo.widgets.length > 0;
      const visualWidgetTypes = new Set(hasVisualWidgets ? photo.widgets.map((widget) => widget.type) : []);
      const usesWidgetType = (type) => !hasVisualWidgets || visualWidgetTypes.has(type);
      const descriptionIds = [
        poem && usesWidgetType('postit') ? noteId : '',
        story && usesWidgetType('text') ? storyId : '',
      ]
        .filter(Boolean)
        .join(' ');
      const descriptionAttribute = descriptionIds ? ` aria-describedby="${descriptionIds}"` : '';
      const dateMarkup = date && title !== date ? `<p class="memory-date">${escapeHtml(date)}</p>` : '';
      const isMiddleCaption = photo.captionPosition.startsWith('middle-');
      const headerMarkup = `
        <header class="memory-page-header">
          <h3 id="${titleId}">${escapeHtml(title)}</h3>
          ${dateMarkup}
        </header>
      `;
      const noteMarkup = poem
        ? `
          <aside class="memory-note" id="${noteId}" aria-label="Bilhete da memória ${index + 1}">
            <span class="note-tape" aria-hidden="true"></span>
            <p>${renderMultilineText(poem)}</p>
          </aside>
        `
        : '';
      const storyMarkup = story
        ? `
          <div class="diary-entry" id="${storyId}">
            <span class="diary-entry-label">Anotação</span>
            <p>${renderMultilineText(story)}</p>
          </div>
        `
        : '';

      if (hasVisualWidgets) {
        return renderVisualMemoryPage(photo, index, {
          poem,
          story,
          title,
          imageAlt,
          titleId,
          noteId,
          storyId,
          dateMarkup,
          descriptionAttribute: '',
        });
      }

      return `
      <article
        class="memory-page memory-layout-${escapeHtml(photo.layout)} caption-position-${escapeHtml(photo.captionPosition)}"
        data-photo-index="${index}"
        data-memory-id="${escapeHtml(photo.id)}"
        tabindex="-1"
        aria-hidden="true"
        aria-labelledby="${titleId}"
        ${descriptionAttribute}
        aria-roledescription="página do diário"
      >
        <span class="page-binding" aria-hidden="true"></span>
        <span class="decor decor-heart decor-heart-one" aria-hidden="true"></span>
        <span class="decor decor-heart decor-heart-two" aria-hidden="true"></span>
        <span class="decor decor-star decor-star-one" aria-hidden="true"></span>
        <span class="decor decor-star decor-star-two" aria-hidden="true"></span>
        <span class="decor decor-flower" aria-hidden="true"></span>
        <span class="decor decor-ribbon" aria-hidden="true"></span>

        ${isMiddleCaption ? '' : headerMarkup}

        <div class="memory-content-grid">
          <figure class="printed-photo">
            <span class="photo-clip" aria-hidden="true"></span>
            <span class="photo-tape photo-tape-left" aria-hidden="true"></span>
            <span class="photo-tape photo-tape-right" aria-hidden="true"></span>
            <img
              src="${escapeHtml(photo.url)}"
              alt="${escapeHtml(imageAlt)}"
              loading="lazy"
            />
          </figure>
          ${noteMarkup}
        </div>

        ${isMiddleCaption ? headerMarkup : ''}
        ${storyMarkup}
      </article>
    `;
    })
    .join('');
}

function renderExperience(content) {
  const app = document.getElementById('public-app');
  const animationClass = `animation-${safeAnimationStyle(content.theme.animationStyle)}`;

  app.innerHTML = `
    <section class="romantic-stage ${animationClass}" data-stage style="${themeStyle(content.theme)}">
      <div class="stage-background" aria-hidden="true">
        <div class="aurora-ribbon"></div>
        <div class="hearts" data-hearts></div>
      </div>

      <div class="envelope-scene" data-envelope-scene>
        <h1>${escapeHtml(content.site.title)}</h1>
        <p class="subtitle">${escapeHtml(content.site.subtitle)}</p>

        <div class="envelope" data-envelope>
          <div class="envelope-flap"></div>
          <div class="envelope-body"></div>
          <button
            type="button"
            class="seal-button"
            data-open-envelope
            aria-label="Abrir envelope e mostrar a carta"
            aria-expanded="false"
          >
            Abrir coração
          </button>

          <article class="letter-sheet" data-letter-sheet aria-hidden="true" tabindex="-1">
            <h2>${escapeHtml(content.letter.title)}</h2>
            <div class="letter-content">${escapeHtml(content.letter.message).replace(/\n/g, '<br />')}</div>
            <p class="letter-signature">${escapeHtml(content.letter.signature)}</p>
            <button
              type="button"
              class="next-step-btn"
              data-show-photos
              aria-label="Ir da carta para o diário de memórias"
              aria-expanded="false"
            >
              Abrir nosso diário
            </button>
          </article>
        </div>
      </div>

      <section class="photos-scene" data-photos-scene aria-hidden="true" tabindex="-1" aria-labelledby="memories-title">
        <h2 id="memories-title">Nosso diário</h2>
        <p>Cada página guarda um pedaço bonito da nossa história.</p>

        <div class="photo-deck" data-photo-deck aria-live="polite">
          ${renderMemoryPages(content.photos)}
        </div>

        <div class="photo-controls" role="group" aria-label="Controles do diário de memórias">
          <button type="button" data-prev-photo aria-label="Mostrar página anterior do diário">Anterior</button>
          <button type="button" data-gallery-back aria-label="Voltar do diário para a carta">Voltar para carta</button>
          <button type="button" data-next-photo aria-label="Mostrar próxima página do diário">Próxima</button>
          <span data-photo-status aria-live="polite">0/${content.photos.length}</span>
        </div>
        <p class="footer-message">${escapeHtml(content.site.footerMessage)}</p>
      </section>

      <button type="button" class="floating-back" data-step-back aria-label="Voltar uma etapa" hidden>Voltar</button>

      <a class="admin-entry" data-admin-entry href="/pages/admin.html">Editar conteúdo</a>

      <div class="music-widget" data-music-widget>
        <button
          type="button"
          class="music-toggle"
          data-music-toggle
          aria-pressed="false"
          aria-label="Ativar música"
          title="Ativar música"
        >
          <span class="music-disc" aria-hidden="true"></span>
        </button>
        <div class="music-player" data-music-player hidden></div>
      </div>
    </section>
  `;
}

function createHearts() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heartsHost = document.querySelector('[data-hearts]');
  if (!heartsHost || reducedMotion) return;

  heartsHost.innerHTML = '';

  for (let i = 0; i < 26; i += 1) {
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.style.setProperty('--left', `${Math.random() * 100}%`);
    heart.style.setProperty('--size', `${14 + Math.random() * 30}px`);
    heart.style.setProperty('--duration', `${7 + Math.random() * 8}s`);
    heart.style.setProperty('--delay', `${Math.random() * 8}s`);
    heartsHost.appendChild(heart);
  }
}

function getSpotifyUri(rawUrl) {
  if (!rawUrl) return null;

  if (/^spotify:(track|album|playlist|episode|show):[a-z0-9]+$/i.test(rawUrl)) return rawUrl;

  const match = rawUrl.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/i);
  if (!match) return null;

  return `spotify:${match[1].toLowerCase()}:${match[2]}`;
}

function isDirectAudioUrl(url) {
  try {
    return new URL(url, window.location.origin).pathname.toLowerCase().endsWith('.mp3');
  } catch {
    return false;
  }
}

function loadSpotifyIframeApi() {
  if (window.SpotifyIframeApi) {
    return Promise.resolve(window.SpotifyIframeApi);
  }

  if (spotifyApiPromise) return spotifyApiPromise;

  spotifyApiPromise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('Spotify API timeout')), 10000);
    const previousHandler = window.onSpotifyIframeApiReady;

    window.onSpotifyIframeApiReady = (api) => {
      if (typeof previousHandler === 'function') {
        previousHandler(api);
      }
      window.clearTimeout(timeoutId);
      resolve(api);
    };

    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error('Spotify API load failed'));
    };
    document.head.appendChild(script);
  });

  return spotifyApiPromise;
}

function setupMusic(content) {
  const widget = document.querySelector('[data-music-widget]');
  const toggle = document.querySelector('[data-music-toggle]');
  const host = document.querySelector('[data-music-player]');

  if (!widget || !toggle || !host) return;

  const songUrl = sanitizeMusicUrl(content.song?.url);
  if (!songUrl) {
    widget.style.display = 'none';
    return;
  }

  let isPlaying = false;
  let audio;
  let spotifyController;
  let spotifyMount;
  const spotifyUri = getSpotifyUri(songUrl);

  if (!spotifyUri && !isDirectAudioUrl(songUrl)) {
    widget.style.display = 'none';
    return;
  }

  const updateButton = () => {
    toggle.setAttribute('aria-pressed', String(isPlaying));
    toggle.setAttribute('aria-label', isPlaying ? 'Pausar música' : 'Ativar música');
    toggle.setAttribute('title', isPlaying ? 'Pausar música' : 'Ativar música');
    toggle.classList.toggle('is-playing', isPlaying);
    host.hidden = !isPlaying;
    host.classList.toggle('is-visible', isPlaying);
  };

  const play = async () => {
    if (spotifyUri) {
      try {
        if (!spotifyController) {
          const api = await loadSpotifyIframeApi();
          spotifyMount = document.createElement('div');
          host.replaceChildren(spotifyMount);
          await new Promise((resolve) => {
            api.createController(
              spotifyMount,
              {
                uri: spotifyUri,
                width: '300',
                height: '80',
              },
              (controller) => {
                spotifyController = controller;
                resolve();
              }
            );
          });
        }

        spotifyController.play();
        isPlaying = true;
        updateButton();
      } catch {
        isPlaying = false;
        updateButton();
      }
      return;
    }

    if (!audio) {
      audio = new Audio(songUrl);
      audio.loop = true;
      audio.addEventListener('ended', () => {
        isPlaying = false;
        updateButton();
      });
    }

    try {
      await audio.play();
      isPlaying = true;
      updateButton();
    } catch {
      isPlaying = false;
      updateButton();
    }
  };

  const pause = () => {
    if (spotifyController) spotifyController.pause();
    if (audio) audio.pause();
    isPlaying = false;
    updateButton();
  };

  toggle.addEventListener('click', async () => {
    if (isPlaying) {
      pause();
      return;
    }
    await play();
  });

  updateButton();
}

function setupExperience() {
  const stage = document.querySelector('[data-stage]');
  const envelopeScene = document.querySelector('[data-envelope-scene]');
  const envelope = document.querySelector('[data-envelope]');
  const letter = document.querySelector('[data-letter-sheet]');
  const openButton = document.querySelector('[data-open-envelope]');
  const showPhotosButton = document.querySelector('[data-show-photos]');
  const photosScene = document.querySelector('[data-photos-scene]');
  const photoDeck = document.querySelector('[data-photo-deck]');
  const adminEntry = document.querySelector('[data-admin-entry]');
  const floatingBackButton = document.querySelector('[data-step-back]');
  const galleryBackButton = document.querySelector('[data-gallery-back]');

  const cards = [...document.querySelectorAll('[data-photo-index]')];
  const prevButton = document.querySelector('[data-prev-photo]');
  const nextButton = document.querySelector('[data-next-photo]');
  const status = document.querySelector('[data-photo-status]');

  const steps = {
    envelope: 'envelope',
    letter: 'letter',
    gallery: 'gallery',
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const letterRevealDelay = reducedMotion ? 0 : 440;
  const seenPhotoIndexes = new Set();

  let currentStep = steps.envelope;
  let currentPhotoIndex = 0;
  let hasSeenAllPhotos = false;
  let letterTimer;
  let swipeStart;
  let touchSwipeStart;
  let lastSwipeAt = 0;

  const syncExperienceState = () => {
    const canGoBack = currentStep !== steps.envelope;
    const isGalleryVisible = currentStep === steps.gallery;
    const isLetterVisible = currentStep === steps.letter;

    stage?.setAttribute('data-current-step', currentStep);
    envelopeScene?.setAttribute('aria-hidden', String(isGalleryVisible));
    letter?.setAttribute('aria-hidden', String(!isLetterVisible));
    letter?.toggleAttribute('inert', !isLetterVisible);
    photosScene?.setAttribute('aria-hidden', String(!isGalleryVisible));
    photosScene?.toggleAttribute('inert', !isGalleryVisible);
    envelopeScene?.classList.toggle('is-background', isGalleryVisible);
    photosScene?.classList.toggle('is-visible', isGalleryVisible);
    openButton?.setAttribute('aria-expanded', String(currentStep !== steps.envelope));
    openButton?.setAttribute('aria-hidden', String(currentStep !== steps.envelope));
    openButton?.toggleAttribute('inert', currentStep !== steps.envelope);
    showPhotosButton?.setAttribute('aria-expanded', String(isGalleryVisible));
    showPhotosButton?.toggleAttribute('inert', !isLetterVisible);

    if (floatingBackButton) {
      floatingBackButton.hidden = !canGoBack;
      floatingBackButton.disabled = !canGoBack;
      floatingBackButton.setAttribute('aria-hidden', String(!canGoBack));
    }
  };

  const refreshDeck = ({ focusPage = false } = {}) => {
    if (!status || !prevButton || !nextButton) return;

    if (!cards.length) {
      status.textContent = '0/0';
      prevButton.disabled = true;
      nextButton.disabled = true;
      status.setAttribute('aria-label', 'Nenhuma memória cadastrada');
      photoDeck?.setAttribute('aria-label', 'Nenhuma memória cadastrada');
      return;
    }

    currentPhotoIndex = (currentPhotoIndex + cards.length) % cards.length;
    seenPhotoIndexes.add(currentPhotoIndex);

    cards.forEach((card, index) => {
      const isActive = index === currentPhotoIndex;

      card.classList.toggle('is-visible', isActive);
      card.classList.toggle('is-active', isActive);
      card.toggleAttribute('inert', !isActive);
      card.setAttribute('aria-hidden', String(!isActive));
      card.toggleAttribute('aria-current', isActive);

      card.querySelectorAll('[tabindex]').forEach((node) => {
        node.setAttribute('tabindex', isActive ? '0' : '-1');
      });
    });

    const activeCard = cards[currentPhotoIndex];
    const activeTitle = activeCard?.querySelector('.memory-page-header h3')?.textContent?.trim() || `Memória ${currentPhotoIndex + 1}`;

    status.textContent = `${currentPhotoIndex + 1}/${cards.length}`;
    status.setAttribute('aria-label', `Página ${currentPhotoIndex + 1} de ${cards.length}: ${activeTitle}`);
    photoDeck?.setAttribute('aria-label', `Página atual do diário: ${activeTitle}`);

    prevButton.disabled = cards.length <= 1;
    nextButton.disabled = cards.length <= 1;

    if (seenPhotoIndexes.size >= cards.length) {
      hasSeenAllPhotos = true;
    }

    adminEntry?.classList.toggle('is-visible', hasSeenAllPhotos);

    if (focusPage && currentStep === steps.gallery) {
      activeCard?.focus({ preventScroll: true });
    }
  };

  const openEnvelope = () => {
    if (currentStep !== steps.envelope) return;

    currentStep = steps.letter;
    envelope?.classList.add('is-opening');
    window.clearTimeout(letterTimer);
    letterTimer = window.setTimeout(() => {
      letter?.classList.add('is-visible');
      letter?.focus({ preventScroll: true });
    }, letterRevealDelay);
    syncExperienceState();
  };

  const showGallery = () => {
    if (currentStep === steps.envelope) {
      envelope?.classList.add('is-opening');
    }

    currentStep = steps.gallery;
    window.clearTimeout(letterTimer);
    letter?.classList.add('is-visible');
    refreshDeck();
    syncExperienceState();
    cards[currentPhotoIndex]?.focus({ preventScroll: true });
  };

  const goBack = () => {
    if (currentStep === steps.gallery) {
      currentStep = steps.letter;
      window.clearTimeout(letterTimer);
      letter?.classList.add('is-visible');
      syncExperienceState();
      showPhotosButton?.focus({ preventScroll: true });
      return;
    }

    if (currentStep === steps.letter) {
      currentStep = steps.envelope;
      window.clearTimeout(letterTimer);
      letter?.classList.remove('is-visible');
      envelope?.classList.remove('is-opening');
      syncExperienceState();
      openButton?.focus({ preventScroll: true });
    }
  };

  const nextPhoto = () => {
    if (currentStep !== steps.gallery || cards.length <= 1) return;
    currentPhotoIndex = (currentPhotoIndex + 1) % cards.length;
    refreshDeck({ focusPage: true });
  };

  const previousPhoto = () => {
    if (currentStep !== steps.gallery || cards.length <= 1) return;
    currentPhotoIndex = (currentPhotoIndex - 1 + cards.length) % cards.length;
    refreshDeck({ focusPage: true });
  };

  const handleHorizontalSwipe = (deltaX, deltaY) => {
    const isHorizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
    const now = Date.now();

    if (!isHorizontalSwipe || now - lastSwipeAt < 280) return;

    lastSwipeAt = now;

    if (deltaX < 0) {
      nextPhoto();
      return;
    }

    previousPhoto();
  };

  const advanceMainStep = () => {
    if (currentStep === steps.envelope) {
      openEnvelope();
      return;
    }

    if (currentStep === steps.letter) {
      showGallery();
      return;
    }

    nextPhoto();
  };

  const isEditableTarget = (target) => {
    if (!(target instanceof Element)) return false;
    const tagName = target.tagName.toLowerCase();
    return target.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
  };

  const usesNativeActionKey = (target) => {
    if (!(target instanceof Element)) return false;
    const nativeControl = target.closest('button, a, summary, [role="button"]');

    if (nativeControl?.matches('[data-open-envelope], [data-show-photos]')) {
      return false;
    }

    return Boolean(nativeControl || target.closest('.memory-note, .diary-entry'));
  };

  openButton?.addEventListener('click', openEnvelope);
  showPhotosButton?.addEventListener('click', showGallery);
  floatingBackButton?.addEventListener('click', goBack);
  galleryBackButton?.addEventListener('click', goBack);

  prevButton?.addEventListener('click', previousPhoto);
  nextButton?.addEventListener('click', nextPhoto);

  photoDeck?.addEventListener('pointerdown', (event) => {
    if (currentStep !== steps.gallery || cards.length <= 1) return;
    swipeStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    try {
      photoDeck.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can fail when the pointer is no longer active.
    }
  });

  photoDeck?.addEventListener('pointerup', (event) => {
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;

    swipeStart = null;
    handleHorizontalSwipe(deltaX, deltaY);
  });

  photoDeck?.addEventListener('touchstart', (event) => {
    if (currentStep !== steps.gallery || cards.length <= 1) return;
    const [touch] = event.changedTouches;
    if (!touch) return;
    touchSwipeStart = {
      identifier: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
    };
  }, { passive: true });

  photoDeck?.addEventListener('touchend', (event) => {
    if (!touchSwipeStart) return;
    const touch = Array.from(event.changedTouches).find((entry) => entry.identifier === touchSwipeStart.identifier);
    if (!touch) return;

    const deltaX = touch.clientX - touchSwipeStart.x;
    const deltaY = touch.clientY - touchSwipeStart.y;

    touchSwipeStart = null;
    handleHorizontalSwipe(deltaX, deltaY);
  });

  photoDeck?.addEventListener('pointercancel', () => {
    swipeStart = null;
  });

  photoDeck?.addEventListener('touchcancel', () => {
    touchSwipeStart = null;
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || isEditableTarget(event.target)) return;

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      if (usesNativeActionKey(event.target)) return;
      event.preventDefault();
      advanceMainStep();
      return;
    }

    if (event.key === 'Escape') {
      if (currentStep === steps.envelope) return;
      event.preventDefault();
      goBack();
      return;
    }

    if (event.key === 'ArrowRight') {
      if (currentStep !== steps.gallery) return;
      event.preventDefault();
      nextPhoto();
      return;
    }

    if (event.key === 'ArrowLeft') {
      if (currentStep !== steps.gallery) return;
      event.preventDefault();
      previousPhoto();
    }
  });

  refreshDeck();
  syncExperienceState();
}

async function init() {
  renderLoadState();

  try {
    const content = await loadContent();
    renderExperience(content);
    createHearts();
    setupExperience(content);
    setupMusic(content);
  } catch {
    renderLoadError();
  }
}

init();
