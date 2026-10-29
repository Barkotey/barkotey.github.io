/* ==========================================================================
   BARK — скрипты сайта
   1. Заявки в Telegram с готовым шаблоном
   2. Плавное появление блоков при прокрутке
   3. Текущий год в подвале
   ========================================================================== */

/* ---------- 1. Заявки в Telegram ----------
   Любая ссылка с атрибутом data-invite открывает чат с готовым текстом.
   data-invite="Название лекции" — тема подставится в шаблон. */
const TELEGRAM = 'barkotey';

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

/* ---------- 3. Текущий год в подвале ---------- */
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
