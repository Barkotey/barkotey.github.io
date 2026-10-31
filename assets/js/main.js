/* ==========================================================================
   BARK — скрипты сайта
   1. Заявки в Telegram с готовым шаблоном
   2. Плавное появление блоков при прокрутке
   3. Анимации от прокрутки (масштаб, поворот, «загорающийся» текст, стопка лекций, «провал» в iPhone)
   4. Лента отзывов и просмотр отзыва крупно
   5. Видео из VK по кнопке
   6. Текущий год в подвале
   ========================================================================== */

/* ---------- 1. Заявки в Telegram ----------
   Любая ссылка с атрибутом data-invite открывает чат с готовым текстом.
   data-invite="Название лекции" — тема подставится в шаблон. */
const TELEGRAM = 'barkotey_psy';

function inviteText(topic) {
  return [
    'Здравствуйте, Алексей! Хочу пригласить вас выступить.',
    '',
    'Тема: ' + (topic || 'пока не выбрали'),
    'Мероприятие:',
    'Дата и город:',
    'Аудитория (кто и сколько человек):',
  ].join('\n');
}

document.querySelectorAll('[data-invite]').forEach((link) => {
  const text = inviteText(link.dataset.invite);
  link.href = 'https://t.me/' + TELEGRAM + '?text=' + encodeURIComponent(text);
  link.target = '_blank';
  link.rel = 'noopener';
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 2. Появление блоков ----------
   Элементы с классом .reveal плавно проявляются, когда доходят до экрана. */
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px' }
  );
  revealItems.forEach((el) => observer.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- 3. Анимации от прокрутки ----------
   Каждый элемент с data-scroll получает переменную --p от 0 до 1. Что с ней делать — решает style.css.
   data-scroll         — 0: элемент показался снизу экрана, 1: ушёл за верх;
   data-scroll="top"   — 0: элемент у верха экрана, 1: полностью ушёл вверх (первый экран);
   data-scroll="words" — текст разбивается на слова, и они «загораются» по очереди;
   data-scroll="bg"    — как обычный, но --p получают только коты-водяные знаки внутри блока
                         (если ставить --p на весь блок, браузер пересчитывает все его элементы — на iPhone это тормозит). */
const scenes = [...document.querySelectorAll('[data-scroll]')];
const lectures = [...document.querySelectorAll('.lecture')];
const stackMedia = window.matchMedia('(max-width: 1023px)');

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.style.setProperty('--i', i);
    span.textContent = word;
    el.append(span, ' ');
  });
  el.style.setProperty('--n', words.length);
}

function sceneProgress(el, mode, vh) {
  const r = el.getBoundingClientRect();
  if (mode === 'top') return clamp01(-r.top / r.height);
  if (mode === 'words') return clamp01((vh * 0.9 - r.top) / (vh * 0.45 + r.height));
  return clamp01((vh - r.top) / (vh + r.height));
}

// Карточки лекций на телефоне ложатся стопкой: верхняя затемняется, когда на неё наезжает следующая
function updateLectureStack() {
  lectures.forEach((card, i) => {
    const next = lectures[i + 1];
    let cover = 0;
    if (next && stackMedia.matches) {
      const a = card.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      cover = clamp01(1 - (b.top - a.top) / a.height);
    }
    const text = cover.toFixed(3);
    if (card.style.getPropertyValue('--cover') !== text) card.style.setProperty('--cover', text);
  });
}

function measureLectures() {
  lectures.forEach((card) => card.style.setProperty('--h', card.offsetHeight + 'px'));
}

// «Провал» в iPhone: телефон прилипает посреди экрана, растёт, пока экран не заполнит весь дисплей,
// внутри появляется визитка BARK с подвалом — конец страницы. Здесь считаются размеры и включаются точки .is-pinned / .is-dived
const dive = document.querySelector('.dive');
let diveBox = null;

function offsetWithin(el, ancestor) {
  let y = 0;
  while (el && el !== ancestor) {
    y += el.offsetTop;
    el = el.offsetParent;
  }
  return y;
}

function measureDive() {
  if (!dive) return;
  const sticky = dive.querySelector('.dive__sticky');
  const zoom = dive.querySelector('.dive__zoom');
  const screen = dive.querySelector('.phone__screen');
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const header = document.querySelector('.header').offsetHeight;
  const h = sticky.offsetHeight;
  const top = Math.min(header, vh - h); // помещается — по центру под шапкой, иначе прилипает низом

  // Точка, вокруг которой растёт телефон, — центр экрана браузера
  const originY = vh / 2 - top - zoom.offsetTop;
  const screenTop = offsetWithin(screen, zoom);
  const screenBottom = screenTop + screen.offsetHeight;
  // Во сколько раз увеличить, чтобы экран телефона закрыл весь дисплей (и ещё немного — «влетаем» внутрь)
  const cover = Math.max(
    vw / screen.offsetWidth,
    vh / 2 / Math.max(1, originY - screenTop),
    vh / 2 / Math.max(1, screenBottom - originY)
  );

  dive.style.setProperty('--stick-top', top + 'px');
  dive.style.setProperty('--oy', originY + 'px');
  dive.style.setProperty('--zmax', (cover * 1.25).toFixed(3));
  diveBox = { top, trigger: vh * 0.3 };
}

// Две чёткие точки: 1) телефон встал посреди экрана — ссылки списком, их можно нажимать;
// 2) прокрутили ещё немного — телефон за секунду «втягивает» в экран, внутри визитка BARK.
// Страница кончается чуть дальше второй точки (место под прокрутку — 45% экрана в style.css).
// Сама анимация идёт по времени (style.css), прокрутка только переключает точки.
function updateDive() {
  if (!diveBox) return;
  const passed = diveBox.top - dive.getBoundingClientRect().top; // сколько прокрутили с момента, как телефон встал
  dive.classList.toggle('is-pinned', passed >= 0);
  if (passed > diveBox.trigger) dive.classList.add('is-dived');
  else if (passed < diveBox.trigger * 0.5) dive.classList.remove('is-dived'); // запас, чтобы на границе не мигало
}

// Ставим --p, только если значение изменилось: каждая запись заставляет браузер пересчитать стили
const lastProgress = new Map();

function setProgress(el, value) {
  const text = value.toFixed(3);
  if (lastProgress.get(el) === text) return;
  lastProgress.set(el, text);
  el.style.setProperty('--p', text);
}

function updateScrollScenes() {
  const vh = window.innerHeight;
  scenes.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) return; // далеко от экрана — не считаем
    const mode = el.dataset.scroll;
    const p = sceneProgress(el, mode, vh);
    if (mode === 'bg') el.querySelectorAll(':scope > .watermark').forEach((mark) => setProgress(mark, p));
    else setProgress(el, p);
  });
  updateLectureStack();
  updateDive();
}

if (!reduceMotion) {
  document.querySelectorAll('[data-scroll="words"]').forEach(splitWords);
  measureLectures();
  if (dive) {
    dive.classList.add('is-live');
    measureDive();
    // Плавные переходы — только после первой отрисовки, чтобы при загрузке ничего не проигрывалось само
    setTimeout(() => dive.classList.add('is-animated'), 300);
  }

  let ticking = false;
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateScrollScenes();
    });
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  const measureAll = () => {
    measureLectures();
    measureDive();
    requestUpdate();
  };
  window.addEventListener('resize', measureAll);
  window.addEventListener('load', measureAll);
  updateScrollScenes();
}

/* ---------- 4. Лента отзывов ----------
   Отзывы дублируются, чтобы лента ехала бесконечно. По нажатию отзыв открывается крупно. */
const track = document.querySelector('.reviews__track');
const lightbox = document.querySelector('.lightbox');

if (track && !reduceMotion) {
  const items = [...track.children];
  items.forEach((item) => {
    const copy = item.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelector('button').tabIndex = -1;
    track.append(copy);
  });
  track.style.setProperty('--duration', items.length * 10 + 's');
  track.classList.add('is-looping');

  // На телефоне: коснулись ленты — она остановилась, отпустили — через пару секунд поехала дальше
  const marquee = track.parentElement;
  let resumeTimer;
  marquee.addEventListener('touchstart', () => {
    clearTimeout(resumeTimer);
    marquee.classList.add('is-paused');
  }, { passive: true });
  marquee.addEventListener('touchend', () => {
    resumeTimer = setTimeout(() => marquee.classList.remove('is-paused'), 2500);
  });
}

if (lightbox && typeof lightbox.showModal === 'function') {
  const bigImage = lightbox.querySelector('.lightbox__img');

  document.querySelectorAll('.review').forEach((button) => {
    button.addEventListener('click', () => {
      const img = button.querySelector('img');
      bigImage.src = img.currentSrc || img.src;
      bigImage.alt = img.alt;
      lightbox.showModal();
    });
  });

  // Закрыть: крестик или нажатие мимо картинки
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox || event.target.closest('.lightbox__close')) lightbox.close();
  });
}

/* ---------- 5. Видео из VK ----------
   Если в data-video указан адрес плеера, кнопка «Смотреть лекцию» включает видео прямо на сайте. */
document.querySelectorAll('[data-video]').forEach((frame) => {
  const src = frame.dataset.video.trim();
  const button = frame.querySelector('.video__play');
  if (!src || !button) return;

  frame.classList.add('is-ready');
  button.disabled = false;
  button.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
    iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock';
    iframe.allowFullscreen = true;
    iframe.title = 'Выступление Алексея Барковского';
    frame.replaceChildren(iframe);
  });
});

/* ---------- 6. Текущий год в подвале ---------- */
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
