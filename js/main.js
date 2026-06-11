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
        .map((photo) => ({
          url: sanitizeImageUrl(photo?.url),
          caption: String(photo?.caption || 'Momento especial'),
        }))
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
        <button type="button" onclick="window.location.reload()">Tentar novamente</button>
      </div>
    </section>
  `;
}

function renderPhotoCards(photos) {
  if (!photos.length) {
    return '<p class="empty-photos">Adicione fotos no painel admin para exibir aqui.</p>';
  }

  return photos
    .map(
      (photo, index) => `
      <article class="photo-card" data-photo-index="${index}" aria-hidden="true">
        <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.caption || 'Foto romântica')}" loading="lazy" />
        <p>${escapeHtml(photo.caption || 'Momento especial')}</p>
      </article>
    `
    )
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
          <button type="button" class="seal-button" data-open-envelope>Abrir coração</button>

          <article class="letter-sheet" data-letter-sheet>
            <h2>${escapeHtml(content.letter.title)}</h2>
            <div class="letter-content">${escapeHtml(content.letter.message).replace(/\n/g, '<br />')}</div>
            <p class="letter-signature">${escapeHtml(content.letter.signature)}</p>
            <button type="button" class="next-step-btn" data-show-photos>Prosseguir para nossas fotos</button>
          </article>
        </div>
      </div>

      <section class="photos-scene" data-photos-scene>
        <h2>Nossos momentos</h2>
        <p>Avance para trazer cada memória para a frente da moldura.</p>

        <div class="photo-deck" data-photo-deck>
          ${renderPhotoCards(content.photos)}
        </div>

        <div class="photo-controls">
          <button type="button" data-prev-photo>Anterior</button>
          <button type="button" data-next-photo>Próxima</button>
          <span data-photo-status>0/${content.photos.length}</span>
        </div>
        <p class="footer-message">${escapeHtml(content.site.footerMessage)}</p>
      </section>

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

function setupExperience(content) {
  const envelopeScene = document.querySelector('[data-envelope-scene]');
  const envelope = document.querySelector('[data-envelope]');
  const letter = document.querySelector('[data-letter-sheet]');
  const openButton = document.querySelector('[data-open-envelope]');
  const showPhotosButton = document.querySelector('[data-show-photos]');
  const photosScene = document.querySelector('[data-photos-scene]');
  const adminEntry = document.querySelector('[data-admin-entry]');

  const cards = [...document.querySelectorAll('[data-photo-index]')];
  const prevButton = document.querySelector('[data-prev-photo]');
  const nextButton = document.querySelector('[data-next-photo]');
  const status = document.querySelector('[data-photo-status]');

  let isEnvelopeOpen = false;
  let revealedCount = 0;
  let hasSeenAllPhotos = false;

  const refreshDeck = () => {
    if (!status || !prevButton || !nextButton) return;

    if (!cards.length) {
      status.textContent = '0/0';
      prevButton.disabled = true;
      nextButton.disabled = true;
      nextButton.textContent = 'Próxima';
      return;
    }

    nextButton.disabled = false;

    cards.forEach((card, index) => {
      const isVisible = index < revealedCount;
      card.classList.toggle('is-visible', isVisible);
      card.setAttribute('aria-hidden', String(!isVisible));

      if (isVisible) {
        const x = ((index % 3) - 1) * 18;
        const y = index * 4;
        const rotation = (index % 2 === 0 ? -1 : 1) * (2 + (index % 4));
        card.style.zIndex = String(index + 3);
        card.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg)`;
      }
    });

    status.textContent = `${Math.min(revealedCount, cards.length)}/${cards.length}`;

    prevButton.disabled = revealedCount <= 1;
    nextButton.textContent = revealedCount >= cards.length ? 'Recomeçar' : 'Próxima';

    if (revealedCount >= cards.length) {
      hasSeenAllPhotos = true;
    }

    adminEntry?.classList.toggle('is-visible', hasSeenAllPhotos);
  };

  openButton?.addEventListener('click', () => {
    if (isEnvelopeOpen) return;
    isEnvelopeOpen = true;
    envelope.classList.add('is-opening');
    window.setTimeout(() => {
      letter.classList.add('is-visible');
    }, 440);
  });

  showPhotosButton?.addEventListener('click', () => {
    if (!isEnvelopeOpen) {
      isEnvelopeOpen = true;
      envelope.classList.add('is-opening');
      letter.classList.add('is-visible');
    }

    envelopeScene.classList.add('is-background');
    photosScene.classList.add('is-visible');

    if (cards.length > 0 && revealedCount === 0) {
      revealedCount = 1;
      refreshDeck();
    }
  });

  prevButton?.addEventListener('click', () => {
    if (revealedCount > 1) {
      revealedCount -= 1;
      refreshDeck();
    }
  });

  nextButton?.addEventListener('click', () => {
    if (!cards.length) return;

    if (revealedCount < cards.length) {
      revealedCount += 1;
    } else {
      revealedCount = 1;
    }

    refreshDeck();
  });

  refreshDeck();
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
