/* ==========================================================================
   BARK — скрипты сайта
   1. Заявки в Telegram с готовым шаблоном
   2. Плавное появление блоков при прокрутке
   3. Анимации от прокрутки (масштаб, поворот, «загорающийся» текст, стопка лекций)
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
   data-scroll="words" — текст разбивается на слова, и они «загораются» по очереди. */
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
    card.style.setProperty('--cover', cover.toFixed(3));
  });
}

function measureLectures() {
  lectures.forEach((card) => card.style.setProperty('--h', card.offsetHeight + 'px'));
}

function updateScrollScenes() {
  const vh = window.innerHeight;
  scenes.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) return; // далеко от экрана — не считаем
    el.style.setProperty('--p', sceneProgress(el, el.dataset.scroll, vh).toFixed(4));
  });
  updateLectureStack();
}

if (!reduceMotion) {
  document.querySelectorAll('[data-scroll="words"]').forEach(splitWords);
  measureLectures();

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
  window.addEventListener('resize', () => {
    measureLectures();
    requestUpdate();
  });
  window.addEventListener('load', measureLectures);
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
