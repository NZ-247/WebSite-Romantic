const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

const dotenv = require('dotenv');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sanitizeHtml = require('sanitize-html');

dotenv.config();

const app = express();
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const IMAGE_UPLOAD_DIR = path.join(UPLOADS_DIR, 'images');
const MUSIC_UPLOAD_DIR = path.join(UPLOADS_DIR, 'music');

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const MAX_IMAGE_SIZE = parseSizeMb(process.env.MAX_IMAGE_SIZE_MB, 5);
const MAX_MUSIC_SIZE = parseSizeMb(process.env.MAX_MUSIC_SIZE_MB, 15);

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const ALLOWED_MUSIC_EXTENSIONS = new Set(['.mp3']);
const ALLOWED_MUSIC_MIMES = new Set(['audio/mpeg', 'audio/mp3', 'audio/x-mpeg']);

const DEFAULT_CONTENT = {
  site: {
    title: 'Para a Mulher da Minha Vida',
    subtitle:
      'Cada batida do meu coracao lembra o quanto voce transforma os meus dias em poesia. Este cantinho e uma forma de eternizar o nosso amor.',
    footerMessage: 'Com amor, hoje e sempre.',
  },
  theme: {
    primaryColor: '#d91663',
    secondaryColor: '#6c4cf6',
    accentColor: '#ffb000',
    animationStyle: 'fade',
  },
  letter: {
    title: 'Uma carta para voce',
    message:
      'Meu amor,\n\nVoce e o meu lugar favorito no mundo.\nEm cada abraco seu, encontro calma.\nEm cada sorriso seu, encontro motivo para sonhar.',
    signature: 'Com amor, hoje e sempre.',
  },
  navigation: {
    autoRotate: true,
    intervalMs: 6500,
    pauseOnHover: true,
  },
  sections: [],
  photos: [],
  song: {
    title: 'Musica que amo',
    artist: 'Nossa trilha sonora especial',
    url: '',
  },
};

if (!process.env.ADMIN_TOKEN) {
  console.warn('ADMIN_TOKEN nao foi definido. O login do admin ficara indisponivel.');
}

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET nao foi definido. Uma chave temporaria sera usada nesta execucao.');
}

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(
  session({
    name: 'romantic.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PRODUCTION,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

const staticOptions = {
  etag: true,
  maxAge: IS_PRODUCTION ? '1h' : 0,
};

app.use('/css', express.static(path.join(ROOT_DIR, 'css'), staticOptions));
app.use('/js', express.static(path.join(ROOT_DIR, 'js'), staticOptions));
app.use('/assets', express.static(path.join(ROOT_DIR, 'assets'), staticOptions));
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    etag: true,
    maxAge: IS_PRODUCTION ? '1d' : 0,
    setHeaders(response, filePath) {
      response.setHeader('X-Content-Type-Options', 'nosniff');

      if (path.extname(filePath).toLowerCase() === '.svg') {
        response.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox"
        );
      }
    },
  })
);

app.get('/', (_request, response) => {
  response.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.get('/index.html', (_request, response) => {
  response.redirect(301, '/');
});

app.get('/admin', (_request, response) => {
  response.redirect('/pages/admin.html');
});

app.get('/pages/login.html', (_request, response) => {
  response.sendFile(path.join(ROOT_DIR, 'pages', 'login.html'));
});

app.get('/pages/admin.html', requireAdminPage, (_request, response) => {
  response.sendFile(path.join(ROOT_DIR, 'pages', 'admin.html'));
});

app.get('/api/content', async (_request, response, next) => {
  try {
    response.json(await readContent());
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/session', (request, response) => {
  response.json({ authenticated: isAdmin(request) });
});

app.post('/api/admin/login', (request, response) => {
  const configuredToken = process.env.ADMIN_TOKEN;
  const providedToken = typeof request.body?.token === 'string' ? request.body.token : '';

  if (!configuredToken) {
    response.status(500).json({ error: 'ADMIN_TOKEN nao foi configurado no servidor.' });
    return;
  }

  if (!safeTokenEquals(providedToken, configuredToken)) {
    response.status(401).json({ error: 'Token invalido.' });
    return;
  }

  request.session.regenerate((regenerateError) => {
    if (regenerateError) {
      response.status(500).json({ error: 'Nao foi possivel iniciar a sessao.' });
      return;
    }

    request.session.isAdmin = true;
    request.session.save((saveError) => {
      if (saveError) {
        response.status(500).json({ error: 'Nao foi possivel salvar a sessao.' });
        return;
      }

      response.json({ ok: true });
    });
  });
});

app.post('/api/admin/logout', requireAdminApi, (request, response) => {
  request.session.destroy(() => {
    response.clearCookie('romantic.sid');
    response.json({ ok: true });
  });
});

app.get('/api/admin/content', requireAdminApi, async (_request, response, next) => {
  try {
    response.json(await readContent());
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/content', requireAdminApi, async (request, response, next) => {
  try {
    const content = normalizeContent(request.body);
    await writeContent(content);
    response.json(content);
  } catch (error) {
    next(error);
  }
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: imageFileFilter,
}).single('file');

const musicUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MUSIC_SIZE },
  fileFilter: musicFileFilter,
}).single('file');

app.post('/api/admin/uploads/images', requireAdminApi, handleUpload(imageUpload), async (request, response, next) => {
  try {
    const file = request.file;
    if (!file) {
      response.status(400).json({ error: 'Envie uma imagem no campo file.' });
      return;
    }

    const extension = path.extname(file.originalname).toLowerCase();
    if (!hasValidImageSignature(file.buffer, extension)) {
      response.status(400).json({ error: 'O arquivo enviado nao parece ser uma imagem valida.' });
      return;
    }

    const filename = makeSafeFilename('image', extension);
    const targetPath = path.join(IMAGE_UPLOAD_DIR, filename);
    const fileBuffer = extension === '.svg' ? sanitizeSvgBuffer(file.buffer) : file.buffer;

    await fs.writeFile(targetPath, fileBuffer);

    response.status(201).json({
      url: `/uploads/images/${filename}`,
      filename,
      size: fileBuffer.length,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/uploads/music', requireAdminApi, handleUpload(musicUpload), async (request, response, next) => {
  try {
    const file = request.file;
    if (!file) {
      response.status(400).json({ error: 'Envie um arquivo MP3 no campo file.' });
      return;
    }

    if (!hasValidMp3Signature(file.buffer)) {
      response.status(400).json({ error: 'O arquivo enviado nao parece ser um MP3 valido.' });
      return;
    }

    const filename = makeSafeFilename('music', '.mp3');
    const targetPath = path.join(MUSIC_UPLOAD_DIR, filename);
    await fs.writeFile(targetPath, file.buffer);

    response.status(201).json({
      url: `/uploads/music/${filename}`,
      filename,
      size: file.size,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);

  if (error.type === 'entity.too.large') {
    response.status(413).json({ error: 'Conteudo enviado acima do limite permitido.' });
    return;
  }

  response.status(error.statusCode || 500).json({
    error: error.publicMessage || 'Algo deu errado no servidor.',
  });
});

ensureStorage()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor romantico em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Nao foi possivel preparar os diretorios do servidor.', error);
    process.exit(1);
  });

function parseSizeMb(value, fallbackMb) {
  const parsed = Number(value);
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMb;
  return Math.floor(mb * 1024 * 1024);
}

async function ensureStorage() {
  await Promise.all([
    fs.mkdir(DATA_DIR, { recursive: true }),
    fs.mkdir(IMAGE_UPLOAD_DIR, { recursive: true }),
    fs.mkdir(MUSIC_UPLOAD_DIR, { recursive: true }),
  ]);

  if (!fsSync.existsSync(CONTENT_FILE)) {
    await writeContent(DEFAULT_CONTENT);
  }
}

function isAdmin(request) {
  return Boolean(request.session?.isAdmin);
}

function requireAdminPage(request, response, next) {
  if (isAdmin(request)) {
    next();
    return;
  }

  response.redirect(`/pages/login.html?next=${encodeURIComponent(request.originalUrl)}`);
}

function requireAdminApi(request, response, next) {
  if (isAdmin(request)) {
    next();
    return;
  }

  response.status(401).json({ error: 'Sessao expirada. Faca login novamente.' });
}

function safeTokenEquals(providedToken, configuredToken) {
  const provided = Buffer.from(providedToken);
  const configured = Buffer.from(configuredToken);

  return provided.length === configured.length && crypto.timingSafeEqual(provided, configured);
}

async function readContent() {
  const raw = await fs.readFile(CONTENT_FILE, 'utf8');
  return normalizeContent(JSON.parse(raw));
}

async function writeContent(content) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${CONTENT_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(normalizeContent(content), null, 2)}\n`, 'utf8');
  await fs.rename(tempFile, CONTENT_FILE);
}

function normalizeContent(content) {
  const input = asPlainObject(content);
  const site = asPlainObject(input.site);
  const theme = asPlainObject(input.theme);
  const letter = asPlainObject(input.letter);
  const navigation = asPlainObject(input.navigation);
  const song = asPlainObject(input.song);

  const sections = Array.isArray(input.sections)
    ? input.sections.slice(0, 30).map((section, index) => normalizeSection(section, index))
    : DEFAULT_CONTENT.sections;

  const photos = Array.isArray(input.photos)
    ? input.photos
        .slice(0, 60)
        .map((photo, index) => normalizePhoto(photo, index))
        .filter((photo) => photo.url)
    : DEFAULT_CONTENT.photos;

  return {
    site: {
      title: cleanText(site.title, DEFAULT_CONTENT.site.title, 120),
      subtitle: cleanText(site.subtitle, DEFAULT_CONTENT.site.subtitle, 600),
      footerMessage: cleanText(site.footerMessage, DEFAULT_CONTENT.site.footerMessage, 160),
    },
    theme: {
      primaryColor: cleanColor(theme.primaryColor, DEFAULT_CONTENT.theme.primaryColor),
      secondaryColor: cleanColor(theme.secondaryColor, DEFAULT_CONTENT.theme.secondaryColor),
      accentColor: cleanColor(theme.accentColor, DEFAULT_CONTENT.theme.accentColor),
      animationStyle: ['fade', 'slide', 'parallax'].includes(theme.animationStyle)
        ? theme.animationStyle
        : DEFAULT_CONTENT.theme.animationStyle,
    },
    letter: {
      title: cleanText(letter.title, DEFAULT_CONTENT.letter.title, 120),
      message: cleanText(letter.message, DEFAULT_CONTENT.letter.message, 5000),
      signature: cleanText(letter.signature, DEFAULT_CONTENT.letter.signature, 160),
    },
    navigation: {
      autoRotate: Boolean(navigation.autoRotate),
      intervalMs: Math.max(2500, Math.min(Number(navigation.intervalMs) || 6500, 60000)),
      pauseOnHover: Boolean(navigation.pauseOnHover),
    },
    sections,
    photos,
    song: {
      title: cleanText(song.title, DEFAULT_CONTENT.song.title, 120),
      artist: cleanText(song.artist, DEFAULT_CONTENT.song.artist, 180),
      url: sanitizeMusicUrl(song.url),
    },
  };
}

function normalizeSection(section, index) {
  const input = asPlainObject(section);
  const title = cleanText(input.title, `Secao ${index + 1}`, 120);

  return {
    id: cleanSlug(input.id, title, index),
    type: ['text', 'gallery'].includes(input.type) ? input.type : 'text',
    title,
    text: cleanText(input.text, '', 2500),
  };
}

function normalizePhoto(photo, index) {
  const input = asPlainObject(photo);
  const caption = cleanText(input.caption, '', 220);
  const poem = cleanText(input.poem, '', 700);
  const story = cleanText(input.story, '', 3000);
  const date = cleanText(input.date, '', 120);
  const layout = ['left-photo', 'right-photo'].includes(input.layout) ? input.layout : 'left-photo';
  const idSource = cleanText(input.id, caption || poem || `memory-${index + 1}`, 120);

  return {
    id: cleanSlug(idSource, `memory-${index + 1}`, index),
    url: sanitizeAssetUrl(input.url, ALLOWED_IMAGE_EXTENSIONS),
    caption,
    poem,
    story,
    date,
    layout,
  };
}

function asPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanText(value, fallback, maxLength) {
  const raw = typeof value === 'string' ? value : fallback;
  return raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function cleanColor(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function cleanSlug(value, title, index) {
  const raw = typeof value === 'string' && value.trim() ? value : title;
  const slug = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || `section-${index + 1}`;
}

function sanitizeAssetUrl(rawUrl, allowedExtensions) {
  const value = cleanText(rawUrl, '', 2048);

  if (!value || value.startsWith('//') || /["'<>]/.test(value)) {
    return '';
  }

  try {
    const parsed = new URL(value, 'http://localhost');
    const extension = path.extname(parsed.pathname).toLowerCase();

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    if (!allowedExtensions.has(extension)) {
      return '';
    }

    return value;
  } catch {
    return '';
  }
}

function sanitizeMusicUrl(rawUrl) {
  const value = cleanText(rawUrl, '', 2048);

  if (!value || /["'<>]/.test(value)) {
    return '';
  }

  if (/^spotify:(track|album|playlist|episode|show):[a-z0-9]+$/i.test(value)) {
    return value;
  }

  if (/^https:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\/[a-z0-9]+/i.test(value)) {
    return value;
  }

  return sanitizeAssetUrl(value, ALLOWED_MUSIC_EXTENSIONS);
}

function imageFileFilter(_request, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension) || !ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
    callback(makeUploadError('Apenas imagens JPG, JPEG, PNG, WEBP ou SVG sao aceitas.'));
    return;
  }

  callback(null, true);
}

function musicFileFilter(_request, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MUSIC_EXTENSIONS.has(extension) || !ALLOWED_MUSIC_MIMES.has(file.mimetype)) {
    callback(makeUploadError('Apenas arquivos de audio MP3 sao aceitos.'));
    return;
  }

  callback(null, true);
}

function handleUpload(uploadMiddleware) {
  return (request, response, next) => {
    uploadMiddleware(request, response, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        response.status(413).json({ error: 'Arquivo acima do limite permitido.' });
        return;
      }

      response.status(error.statusCode || 400).json({ error: error.publicMessage || 'Upload invalido.' });
    });
  };
}

function makeUploadError(publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = 400;
  error.publicMessage = publicMessage;
  return error;
}

function hasValidImageSignature(buffer, extension) {
  if (extension === '.jpg' || extension === '.jpeg') {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (extension === '.png') {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (extension === '.webp') {
    return (
      buffer.length > 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  if (extension === '.svg') {
    const start = buffer.subarray(0, 1024).toString('utf8').trimStart();
    return /^<\?xml/i.test(start) ? /<svg[\s>]/i.test(start) : /^<svg[\s>]/i.test(start);
  }

  return false;
}

function hasValidMp3Signature(buffer) {
  if (buffer.length < 3) {
    return false;
  }

  const hasId3Header = buffer.subarray(0, 3).toString('ascii') === 'ID3';
  const hasFrameSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;

  return hasId3Header || hasFrameSync;
}

function sanitizeSvgBuffer(buffer) {
  const rawSvg = buffer.toString('utf8');
  const sanitized = sanitizeHtml(rawSvg, {
    allowedTags: [
      'svg',
      'g',
      'path',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
      'defs',
      'linearGradient',
      'radialGradient',
      'stop',
      'clipPath',
      'title',
      'desc',
      'text',
      'tspan',
    ],
    allowedAttributes: {
      svg: ['xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'role', 'aria-label', 'focusable'],
      '*': [
        'id',
        'class',
        'd',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'x',
        'y',
        'x1',
        'y1',
        'x2',
        'y2',
        'cx',
        'cy',
        'r',
        'rx',
        'ry',
        'width',
        'height',
        'points',
        'transform',
        'opacity',
        'fill-opacity',
        'stroke-opacity',
        'clip-path',
        'offset',
        'stop-color',
        'stop-opacity',
      ],
    },
    allowedSchemes: [],
    disallowedTagsMode: 'discard',
  });

  if (!/<svg[\s>]/i.test(sanitized)) {
    throw makeUploadError('O SVG enviado nao e valido apos sanitizacao.');
  }

  return Buffer.from(sanitized, 'utf8');
}

function makeSafeFilename(prefix, extension) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID()}${extension}`;
}
