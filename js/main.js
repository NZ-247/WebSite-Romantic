/**
 * main.js
 * ------------------------------------------------------------------
 * Experiência romântica em etapas:
 * 1) Envelope com selo "Abrir"
 * 2) Carta saindo do envelope
 * 3) Fotos em pilha avançando uma à frente da outra
 */

const CONTENT_PATH = 'config/content.json';
const STORAGE_KEY = 'romanticSiteContent';

/** Carrega conteúdo padrão com sobrescrita opcional do localStorage. */
async function loadContent() {
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

/** Garante que campos essenciais existam, mesmo em JSONs antigos. */
function normalizeContent(content) {
  const fallbackLetter =
    content.sections?.find((section) => section.id.includes('carta'))?.text ??
    content.site?.subtitle ??
    'Meu amor, cada momento ao seu lado transforma a vida em poesia.';

  return {
    ...content,
    letter: {
      title: 'Uma carta para você',
      message: fallbackLetter,
      signature: content.site?.footerMessage ?? 'Com amor, hoje e sempre.',
      ...(content.letter ?? {}),
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

  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/** Constrói os cards de foto em forma de pilha. */
function renderPhotoCards(photos) {
  if (!photos?.length) {
    return '<p class="empty-photos">Adicione fotos no painel admin para exibir aqui.</p>';
  }

  return photos
    .map(
      (photo, index) => `
      <article class="photo-card" data-photo-index="${index}" aria-hidden="true">
        <img src="${photo.url}" alt="${escapeHtml(photo.caption || 'Foto romântica')}" loading="lazy" />
        <p>${escapeHtml(photo.caption || 'Momento especial')}</p>
      </article>
    `
    )
    .join('');
}

/** Renderiza a experiência completa. */
function renderExperience(content) {
  const app = document.getElementById('public-app');

  app.innerHTML = `
    <section class="romantic-stage" data-stage>
      <div class="stage-background" aria-hidden="true">
        <div class="hearts" data-hearts></div>
      </div>

      <div class="envelope-scene" data-envelope-scene>
        <h1>${escapeHtml(content.site.title)}</h1>
        <p class="subtitle">${escapeHtml(content.site.subtitle)}</p>

        <div class="envelope" data-envelope>
          <div class="envelope-flap"></div>
          <div class="envelope-body"></div>
          <button type="button" class="seal-button" data-open-envelope>Abrir ❤</button>

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
        <p>Avance e veja cada memória chegando à frente da pilha.</p>

        <div class="photo-deck" data-photo-deck>
          ${renderPhotoCards(content.photos)}
        </div>

        <div class="photo-controls">
          <button type="button" data-prev-photo>Anterior</button>
          <button type="button" data-next-photo>Próxima</button>
          <span data-photo-status>0/${content.photos.length}</span>
        </div>

        <a class="admin-link" href="pages/admin.html">Editar conteúdo</a>
      </section>
    </section>
  `;
}

function createHearts() {
  const heartsHost = document.querySelector('[data-hearts]');
  if (!heartsHost) return;

  heartsHost.innerHTML = '';

  for (let i = 0; i < 22; i += 1) {
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.style.setProperty('--left', `${Math.random() * 100}%`);
    heart.style.setProperty('--size', `${14 + Math.random() * 26}px`);
    heart.style.setProperty('--duration', `${7 + Math.random() * 8}s`);
    heart.style.setProperty('--delay', `${Math.random() * 8}s`);
    heartsHost.appendChild(heart);
  }
}

/** Controla estados do envelope, carta e galeria de fotos. */
function setupExperience(content) {
  const envelopeScene = document.querySelector('[data-envelope-scene]');
  const envelope = document.querySelector('[data-envelope]');
  const letter = document.querySelector('[data-letter-sheet]');
  const openButton = document.querySelector('[data-open-envelope]');
  const showPhotosButton = document.querySelector('[data-show-photos]');
  const photosScene = document.querySelector('[data-photos-scene]');

  const cards = [...document.querySelectorAll('[data-photo-index]')];
  const prevButton = document.querySelector('[data-prev-photo]');
  const nextButton = document.querySelector('[data-next-photo]');
  const status = document.querySelector('[data-photo-status]');

  let isEnvelopeOpen = false;
  let revealedCount = 0;

  const refreshDeck = () => {
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
        const x = ((index % 3) - 1) * 16;
        const y = index * 3;
        const rotation = (index % 2 === 0 ? -1 : 1) * (2 + (index % 4));
        card.style.zIndex = String(index + 2);
        card.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg)`;
      }
    });

    status.textContent = `${Math.min(revealedCount, cards.length)}/${cards.length}`;

    prevButton.disabled = revealedCount <= 1;
    nextButton.textContent = revealedCount >= cards.length ? 'Recomeçar' : 'Próxima';
  };

  openButton?.addEventListener('click', () => {
    if (isEnvelopeOpen) return;
    isEnvelopeOpen = true;
    envelope.classList.add('is-opening');
    window.setTimeout(() => {
      letter.classList.add('is-visible');
    }, 520);
  });

  showPhotosButton?.addEventListener('click', () => {
    envelopeScene.classList.add('is-faded');
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
  const content = await loadContent();
  renderExperience(content);
  createHearts();
  setupExperience(content);
}

init();
