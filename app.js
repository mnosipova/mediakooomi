/* ============ МедиаКоми — игровая логика ============ */
'use strict';

const ROUNDS = 10;
const SLIDER_MIN = 50000;
const SLIDER_MAX = 2000000;
const SLIDER_STEP = 5000;
const SLIDER_DEFAULT = 500000;

// Балльная система: очки зависят от относительной ошибки оценки
function calcPoints(guess, real) {
  const dev = Math.abs(guess - real) / real; // относительная ошибка
  if (dev <= 0.05) return 100;  // в пределах ±5%  — «в яблочко»
  if (dev <= 0.10) return 80;   // ±10% — очень близко
  if (dev <= 0.20) return 60;   // ±20% — неплохо
  if (dev <= 0.35) return 30;   // ±35% — попал в город
  if (dev <= 0.60) return 10;   // ±60% — «примерно»
  return 0;                     // дальше ±60%
}

const POINT_VERDICTS = {
  100: '🎯 В яблочко! Вы явно знаете рынок недвижимости Коми.',
  80:  '👏 Почти в точку — очень близкая оценка.',
  60:  '👍 Неплохо! Уверенное попадание в диапазон.',
  30:  '🤔 Примерное попадание, но мимо реальной цены.',
  10:  '😅 Сильно мимо — но кто в Инте разбирается в ценах с ходу?',
  0:   '🙈 Совсем не в кассу. Бывает!'
};

// Ценовой портрет игрока в конце игры
function getArchetype(rounds) {
  // среднее смещение: минус — игрок называл меньше реальных цен, плюс — больше
  const bias = rounds.reduce((s, r) => s + (r.guess - r.real) / r.real, 0) / rounds.length;
  const score = rounds.reduce((s, r) => s + r.points, 0);

  if (bias < -0.07) {
    return {
      emoji: '🪙',
      name: 'Жадный студент',
      desc: `Ваши оценки стабильно ниже реальных цен — в среднем на ${(bias * -100).toFixed(0)}%. ` +
            'Вы верите, что в Коми всё должно стоить копейки. Увы, продавцы думают иначе!'
    };
  }
  if (bias > 0.07) {
    return {
      emoji: '💸',
      name: 'Транжира',
      desc: `Ваши оценки в среднем на ${(bias * 100).toFixed(0)}% выше реальных цен. ` +
            'Если бы вы покупали эти квартиры, переплатили бы солидно. Продавцы в Инте были бы счастливы!'
    };
  }
  return {
    emoji: '🏡',
    name: 'Адекватный квартирант',
    desc: 'Ваши оценки в среднем совпадают с реальными ценами в пределах ±7%. ' +
          'Вы трезво смотрите на рынок — с вами можно ходить на просмотры!'
  };
}

// ---------- Утилиты ----------
const $ = (id) => document.getElementById(id);

function fmt(n) {
  return n.toLocaleString('ru-RU').replace(/\u00A0/g, ' ') + ' ₽';
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shortDesc(desc) {
  // «1-к. квартира, 30,7 м², 2/5 эт.» → компактный вид
  return desc.replace('квартира,', '').trim();
}

// ---------- Состояние игры ----------
let game = null;

function newGame() {
  game = {
    rounds: shuffle(LISTINGS).slice(0, ROUNDS),
    index: 0,
    totalPoints: 0,
    results: []
  };
}

// ---------- Переключение экранов ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ---------- Раунд ----------
function renderRound() {
  const apt = game.rounds[game.index];
  const n = game.index + 1;

  $('round-label').textContent = 'Квартира ' + n + ' / ' + ROUNDS;
  $('score-label').textContent = game.totalPoints + ' очков';
  $('progress-fill').style.width = ((game.index) / ROUNDS * 100) + '%';

  // Галерея
  const track = $('gallery-track');
  track.innerHTML = '';
  apt.photos.forEach((src, i) => {
    const slide = document.createElement('div');
    slide.className = 'gallery-slide';
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Фото квартиры ' + (i + 1);
    img.loading = 'lazy';
    img.decoding = 'async';
    slide.appendChild(img);
    track.appendChild(slide);
  });
  const counter = $('gallery-counter');
  counter.textContent = '1 / ' + apt.photos.length;

  // Точки-навигация
  const dots = $('gallery-dots');
  dots.innerHTML = '';
  apt.photos.forEach((_, i) => {
    const dot = document.createElement('i');
    if (i === 0) dot.className = 'on';
    dots.appendChild(dot);
  });
  track.onscroll = () => {
    const cur = Math.round(track.scrollLeft / track.clientWidth);
    dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === cur));
    counter.textContent = (cur + 1) + ' / ' + apt.photos.length;
  };

  // Инфо
  $('apt-title').textContent = apt.desc;
  $('apt-street').textContent = '📍 ' + apt.street + ', Инта, Республика Коми';

  // Сброс области угадывания
  $('guess-area').classList.remove('hidden');
  $('round-result').classList.add('hidden');
  $('btn-guess').disabled = false;

  const slider = $('price-slider');
  slider.value = SLIDER_DEFAULT;
  slider.min = SLIDER_MIN;
  slider.max = SLIDER_MAX;
  slider.step = SLIDER_STEP;
  updateSliderUI();
}

function updateSliderUI() {
  const slider = $('price-slider');
  const v = +slider.value;
  $('guess-value').textContent = fmt(v);
  const pct = (v - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN) * 100;
  slider.style.setProperty('--fill', pct + '%');
}

// ---------- Проверка ответа ----------
function submitGuess() {
  const apt = game.rounds[game.index];
  const guess = +$('price-slider').value;
  const real = apt.price;
  const points = calcPoints(guess, real);
  const diff = guess - real;
  const diffPct = Math.round(Math.abs(diff) / real * 100);

  game.totalPoints += points;
  game.results.push({ guess, real, points, desc: shortDesc(apt.desc), url: apt.url });

  $('score-label').textContent = game.totalPoints + ' очков';
  $('progress-fill').style.width = ((game.index + 1) / ROUNDS * 100) + '%';

  $('guess-area').classList.add('hidden');
  $('round-result').classList.remove('hidden');

  $('round-points').textContent = '+' + points;
  $('real-price').textContent = fmt(real);
  $('user-price').textContent = fmt(guess);

  const diffEl = $('price-diff');
  diffEl.classList.remove('over', 'under', 'exact');
  if (diff === 0) {
    diffEl.textContent = '0 ₽ — точное попадание!';
    diffEl.classList.add('exact');
  } else if (diff > 0) {
    diffEl.textContent = '+' + fmt(diff) + ' (выше на ' + diffPct + '%)';
    diffEl.classList.add('over');
  } else {
    diffEl.textContent = '−' + fmt(-diff) + ' (ниже на ' + diffPct + '%)';
    diffEl.classList.add('under');
  }

  $('verdict-text').textContent = POINT_VERDICTS[points];

  const link = $('avito-link');
  link.href = apt.url;
  link.classList.remove('hidden');

  $('btn-next').textContent = game.index + 1 === ROUNDS ? 'Показать итоги 🏁' : 'Следующая квартира';
  $('btn-guess').disabled = true;
}

// ---------- Итоги ----------
function renderResults() {
  const score = game.totalPoints;
  const arche = getArchetype(game.results);
  const avgErr = Math.round(
    game.results.reduce((s, r) => s + Math.abs(r.guess - r.real) / r.real, 0) / game.results.length * 100
  );
  const bias = Math.round(
    game.results.reduce((s, r) => s + (r.guess - r.real) / r.real, 0) / game.results.length * 100
  );
  const best = Math.max(...game.results.map(r => r.points));
  const worst = Math.min(...game.results.map(r => r.points));

  $('archetype-emoji').textContent = arche.emoji;
  $('archetype-name').textContent = arche.name;
  $('archetype-desc').textContent = arche.desc;

  $('final-score').textContent = score;
  $('final-score-top').textContent = score + ' очков';
  $('progress-fill-final').style.width = '100%';

  $('stat-avg-err').textContent = avgErr + '%';
  $('stat-bias').textContent = (bias > 0 ? '+' : '') + bias + '%';
  $('stat-best').textContent = '+' + best;
  $('stat-worst').textContent = '+' + worst;

  const list = $('rounds-list');
  list.innerHTML = '';
  game.results.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'rounds-row';
    row.innerHTML =
      '<span class="r-num">' + (i + 1) + '</span>' +
      '<span class="r-desc">' + r.desc + ' · ' + fmt(r.real) + '</span>' +
      '<span class="r-points">+' + r.points + '</span>';
    list.appendChild(row);
  });

  showScreen('screen-result');
}

// ---------- Инициализация ----------
document.addEventListener('DOMContentLoaded', () => {
  $('price-slider').addEventListener('input', updateSliderUI);

  $('btn-start').addEventListener('click', () => {
    newGame();
    renderRound();
    showScreen('screen-game');
  });

  $('btn-guess').addEventListener('click', submitGuess);

  $('btn-next').addEventListener('click', () => {
    game.index++;
    if (game.index >= ROUNDS) {
      renderResults();
    } else {
      renderRound();
      window.scrollTo(0, 0);
    }
  });

  $('btn-restart').addEventListener('click', () => {
    newGame();
    renderRound();
    showScreen('screen-game');
  });
});
