/**
 * main.js
 * ------------------------------------------------------------------
 * Responsável por renderizar a página pública com base no arquivo
 * /config/content.json e em possíveis mudanças salvas pelo painel admin.
 */

const CONTENT_PATH = 'config/content.json';
const STORAGE_KEY = 'romanticSiteContent';

/** Carrega o conteúdo padrão + sobrescrita do localStorage. */
async function loadContent() {
  const response = await fetch(CONTENT_PATH);
  const defaults = await response.json();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaults;

  try {
    const parsed = JSON.parse(stored);
    return parsed;
  } catch {
    return defaults;
  }
}

/** Atualiza variáveis CSS de tema com base no JSON editável. */
function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primaryColor);
  root.style.setProperty('--secondary', theme.secondaryColor);
  root.style.setProperty('--accent', theme.accentColor);
}

/** Cria links de navegação com base na ordem das seções. */
function renderNav(sections) {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = sections
    .map((section) => `<a class="nav-link" href="#${section.id}">${section.title}</a>`)
    .join('');
}

/** Retorna classe de animação de acordo com seleção de estilo. */
function animationClass(style) {
  if (style === 'slide') return 'reveal anim-slide';
  if (style === 'parallax') return 'reveal anim-parallax';
  return 'reveal';
}

/** Renderiza carrossel de fotos favoritas. */
function renderCarousel(photos) {
  const items = photos
    .map(
      (photo) => `
      <article class="carousel-item">
        <img src="${photo.url}" alt="${photo.caption}" loading="lazy" />
        <div class="carousel-caption">${photo.caption}</div>
      </article>`
    )
    .join('');

  return `
    <div class="carousel" data-carousel>
      <div class="carousel-track">${items}</div>
    </div>
    <div class="carousel-controls">
      <button type="button" data-prev>← Anterior</button>
      <button type="button" data-next>Próxima →</button>
    </div>
  `;
}

/** Monta cada bloco de seção dinâmica. */
function buildSection(section, styleClass, photos) {
  if (section.type === 'gallery') {
    return `
      <section id="${section.id}" class="section-card ${styleClass}">
        <h2>${section.title}</h2>
        <p>${section.text}</p>
        ${renderCarousel(photos)}
      </section>
    `;
  }

  return `
    <section id="${section.id}" class="section-card ${styleClass}">
      <h2>${section.title}</h2>
      <p>${section.text}</p>
    </section>
  `;
}

/** Renderiza toda a página pública. */
function renderPage(content) {
  applyTheme(content.theme);
  renderNav(content.sections);

  const app = document.getElementById('public-app');
  const styleClass = animationClass(content.theme.animationStyle);

  app.innerHTML = `
    <section class="hero ${styleClass}" id="hero">
      <h1>${content.site.title}</h1>
      <p>${content.site.subtitle}</p>
    </section>

    <div class="layout-stack">
      ${content.sections
        .map((section) => buildSection(section, styleClass, content.photos))
        .join('')}
    </div>

    <section class="music-card ${styleClass}" id="musica">
      <h2>${content.song.title}</h2>
      <p>${content.song.artist}</p>
      <a href="${content.song.url}" target="_blank" rel="noopener noreferrer">Ouvir agora</a>
    </section>
  `;

  document.getElementById('footer-text').textContent = content.site.footerMessage;
}

/** Inicializa controle de carrossel. */
function setupCarousel() {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  const items = Array.from(track.children);
  const prev = document.querySelector('[data-prev]');
  const next = document.querySelector('[data-next]');
  let index = 0;

  const update = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
  };

  prev?.addEventListener('click', () => {
    index = index === 0 ? items.length - 1 : index - 1;
    update();
  });

  next?.addEventListener('click', () => {
    index = index === items.length - 1 ? 0 : index + 1;
    update();
  });
}

/** Inicializa animações de entrada usando IntersectionObserver. */
function setupReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
}

/** Bootstrap da página. */
async function init() {
  const content = await loadContent();
  renderPage(content);
  setupCarousel();
  setupReveal();
}

init();
