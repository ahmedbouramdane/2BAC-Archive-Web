(function () {
  'use strict';

  var app = document.getElementById('app');
  var cache = {};
  var currentKey = null;
  var toastTimeout = null;
  var HIST_KEY = '2bac-recents';

  // Mettez à true pour masquer complètement le menu (header) du site.
  var HIDE_HEADER = true;

  var baseSrc = document.querySelector('script[src*="index-data.js"]');
  var BASE = baseSrc ? baseSrc.src.replace(/\/static\/index-data\.js.*$/, '') : '';

  function fileUrl(rel) {
    return (rel.charAt(0) === '/' || BASE === '')
      ? (BASE || '') + rel
      : rel;
  }

  // Détection simple de la plateforme : 'mobile' (téléphones/tablettes, y
  // compris le WebView Flutter) ou 'desktop' (PC Windows/Mac).
  function getPlatform() {
    if (typeof getPlatform._cache !== 'undefined') return getPlatform._cache;
    var ua = navigator.userAgent || '';
    var mobileUa = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS/i.test(ua) ||
                   (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var smallTouch = 'ontouchstart' in window && navigator.maxTouchPoints > 0 && innerWidth <= 1024;
    getPlatform._cache = (mobileUa || smallTouch) ? 'mobile' : 'desktop';
    return getPlatform._cache;
  }

  var SUBJECTS = {
    math: { name: 'Mathématiques', dir: 'math', count: 13, icon: 'fa-calculator' },
    physics: { name: 'Physique & Chimie', dir: 'pc', count: 32, icon: 'fa-flask' }
  };

  var TYPES = {
    c: { label: 'Cours', icon: 'fa-book-open' },
    s: { label: "Série d'exercices", icon: 'fa-pen-to-square' }
  };

  var BOOKS_SUBJECTS = {
    math: { dir: 'math', name: 'Mathématiques', icon: 'fa-calculator' },
    physics: { dir: 'pc', name: 'Physique & Chimie', icon: 'fa-flask' },
    autres: { dir: 'autres', name: 'Autres', icon: 'fa-folder-open' },
    islamic: { dir: 'general/islamic', name: 'Islamic', icon: 'fa-mosque', general: true },
    dev: { dir: 'general/dev', name: 'Personal Development', icon: 'fa-seedling', general: true, langs: ['en', 'ar'] },
    coding: { dir: 'general/coding', name: 'Coding', icon: 'fa-code', general: true, langs: ['en', 'ar'] }
  };
  var GENERAL_SECTIONS = ['islamic', 'dev', 'coding'];

  /* ---------- Niveaux ---------- */
  var LV_KEY = '2bac-current-level';

  function getLevel() {
    try {
      var stored = localStorage.getItem(LV_KEY);
      if (stored && LEVELS[stored]) return stored;
    } catch (e) { /* ignore */ }
    return '2bac';
  }

  function setLevel(id) {
    if (LEVELS[id]) {
      try { localStorage.setItem(LV_KEY, id); } catch (e) { /* ignore */ }
    }
  }

  function levelData(id) {
    return LEVELS[id] || LEVELS['2bac'];
  }

  function subjectData(level, subject) {
    var data = levelData(level);
    return subject === 'physics' ? data.physics : data.math;
  }

  function listLessons(level, subject) {
    var s = subjectData(level, subject);
    if (s.semesters) {
      return s.semesters.s1.lessons.concat(s.semesters.s2.lessons);
    }
    return s.lessons || [];
  }

  function lessonCount(level, subject) {
    return listLessons(level, subject).length;
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (HIDE_HEADER) {
      var navbar = document.querySelector('.navbar');
      if (navbar) navbar.style.display = 'none';
    }
    initTheme();
    initNav();
    initBackToTop();
    initViewer();
    window.addEventListener('hashchange', onHashChange);
    onHashChange();
  }

  /* ---------- Theme ---------- */
  function initTheme() {
    var toggle = document.getElementById('themeToggle');
    var icon = toggle.querySelector('i');
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
    } else if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    syncThemeIcon(icon);

    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      syncThemeIcon(icon);
    });
  }

  function syncThemeIcon(icon) {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
  }

  /* ---------- Navigation / AJAX router ---------- */
  function initNav() {
    var hamburger = document.getElementById('hamburger');
    var navLinks = document.getElementById('navLinks');

    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-link]');
      if (link) {
        var href = link.getAttribute('href');
        if (href && href.indexOf('#') === 0) {
          e.preventDefault();
          window.location.hash = href.slice(1);
          closeMenu();
        }
        return;
      }
      if (e.target.closest('[data-back]')) {
        e.preventDefault();
        closeMenu();
        goBack();
        return;
      }
      var trig = document.getElementById('levelSelectTrigger');
      if (trig) {
        var wrap = trig.closest('.level-select');
        var opt = e.target.closest('.level-select-option');
        if (opt) {
          e.preventDefault();
          closeMenu();
          var target = '#/' + opt.getAttribute('data-level');
          if (currentHash() === target) {
            wrap.classList.remove('open');
            trig.setAttribute('aria-expanded', 'false');
          } else {
            window.location.hash = target;
          }
          return;
        }
        if (e.target.closest('.level-select-trigger')) {
          e.preventDefault();
          var open = wrap.classList.toggle('open');
          trig.setAttribute('aria-expanded', open ? 'true' : 'false');
          return;
        }
        if (!e.target.closest('.level-select-menu')) {
          wrap.classList.remove('open');
          trig.setAttribute('aria-expanded', 'false');
        }
      }
    });

    window.addEventListener('scroll', function () {
      if (window.scrollY > 300) {
        document.getElementById('backToTop').classList.add('visible');
      } else {
        document.getElementById('backToTop').classList.remove('visible');
      }
    });

    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
  }

  function closeMenu() {
    document.getElementById('navLinks').classList.remove('open');
  }

  /* ---------- Back button : parent page statique ---------- */
  function currentHash() {
    return window.location.hash || '#/';
  }

  function goBack() {
    // Retour déterministe : on remonte toujours vers la page parente de la vue courante.
    var route = parseRoute(currentHash());
    var fallback = '#/';
    if (route.view === 'lesson') {
      fallback = '#/' + route.level + '/' + route.subject;
    } else if (route.view === 'books-list') {
      fallback = (route.subject && BOOKS_SUBJECTS[route.subject] && BOOKS_SUBJECTS[route.subject].general)
        ? '#/books/general'
        : '#/books/' + route.level;
    } else if (route.view === 'books-general') {
      fallback = '#/books/' + (route.level || getLevel());
    } else if (route.view === 'math' || route.view === 'physics' || route.view === 'books') {
      fallback = '#/' + (route.level || getLevel());
    }
    if (fallback === currentHash()) return;
    window.location.hash = fallback;
  }

  function onHashChange() {
    // Ferme le visionneur PDF ouvert (ex. navigation via le tiroir Flutter)
    // avant de changer de vue, pour que le modal ne reste pas au-dessus.
    if (pdfEl('pdfOverlay') && !pdfEl('pdfOverlay').hidden) {
      closeViewer();
    }
    loadView(parseRoute(window.location.hash));
  }

  function parseRoute(hash) {
    var path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
    var parts = path.split('/').filter(Boolean);

    if (parts.length === 0) return { view: 'home', level: getLevel() };

    // Routes avec niveau explicite : #/2bac , #/2bac/math , #/2bac/math/01/c
    if (LEVELS[parts[0]]) {
      var level = parts[0];
      if (parts.length === 1) return { view: 'home', level: level };
      if (parts.length === 2 && SUBJECTS[parts[1]]) {
        return { view: parts[1], level: level, subject: parts[1] };
      }
      if (parts.length === 4 && SUBJECTS[parts[1]] && TYPES[parts[3]]) {
        return lessonRoute(level, parts[1], parts[2], parts[3]) || { view: 'home', level: level };
      }
      return { view: 'home', level: level };
    }

    // Routes livres : #/books , #/books/{level} , #/books/{subject} , #/books/{level}/{subject}
    // General Books sont indépendants du niveau : #/books/general[/{section}[/{lang}]]
    if (parts[0] === 'books') {
      if (parts.length === 1) return { view: 'books', level: getLevel() };
      if (parts.length === 2) {
        if (parts[1] === 'general') return { view: 'books-general' };
        if (BOOKS_SUBJECTS[parts[1]]) {
          return { view: 'books-list', level: getLevel(), subject: parts[1], dir: BOOKS_SUBJECTS[parts[1]].dir };
        }
        if (LEVELS[parts[1]]) return { view: 'books', level: parts[1] };
      }
      if (parts.length === 3 && parts[1] === 'general' && BOOKS_SUBJECTS[parts[2]]) {
        return generalBookRoute(parts[2]);
      }
      if (parts.length === 4 && parts[1] === 'general' && BOOKS_SUBJECTS[parts[2]] &&
          BOOKS_SUBJECTS[parts[2]].langs && BOOKS_SUBJECTS[parts[2]].langs.indexOf(parts[3]) !== -1) {
        return generalBookRoute(parts[2], parts[3]);
      }
      // Compat. : anc. routes avec niveau (#/books/{level}/general...)
      if (parts.length === 3 && LEVELS[parts[1]] && parts[2] === 'general') return { view: 'books-general' };
      if (parts.length === 4 && LEVELS[parts[1]] && parts[2] === 'general' && BOOKS_SUBJECTS[parts[3]]) {
        return generalBookRoute(parts[3]);
      }
      if (parts.length === 5 && LEVELS[parts[1]] && parts[2] === 'general' &&
          BOOKS_SUBJECTS[parts[3]] && BOOKS_SUBJECTS[parts[3]].langs &&
          BOOKS_SUBJECTS[parts[3]].langs.indexOf(parts[4]) !== -1) {
        return generalBookRoute(parts[3], parts[4]);
      }
      if (parts.length === 3 && LEVELS[parts[1]] && BOOKS_SUBJECTS[parts[2]]) {
        return { view: 'books-list', level: parts[1], subject: parts[2], dir: BOOKS_SUBJECTS[parts[2]].dir };
      }
      return { view: 'books', level: getLevel() };
    }

    // Routes sans niveau (compat.) -> niveau courant
    if (parts.length === 1 && SUBJECTS[parts[0]]) {
      return { view: parts[0], level: getLevel(), subject: parts[0] };
    }

    if (parts.length === 3) {
      var subject = parts[0];
      var lesson = parts[1];
      var type = parts[2];
      if (SUBJECTS[subject] && /^\d{1,2}$/.test(lesson) && TYPES[type]) {
        return lessonRoute(getLevel(), subject, lesson, type) || { view: 'home', level: getLevel() };
      }
      return { view: 'home', level: getLevel() };
    }

    return { view: 'home', level: getLevel() };
  }

  function generalBookRoute(section, lang) {
    var subj = BOOKS_SUBJECTS[section];
    if (!subj || !subj.general) return { view: 'books-general' };
    var l = lang || (subj.langs ? subj.langs[0] : null);
    var dir = l ? subj.dir + '/' + l : subj.dir;
    return { view: 'books-list', level: getLevel(), subject: section, lang: l, dir: dir };
  }

  function lessonRoute(level, subject, lesson, type) {
    var subj = SUBJECTS[subject];
    var n = parseInt(lesson, 10);
    if (!subj || !/^\d{1,2}$/.test(lesson) || !TYPES[type]) return null;
    if (!(n >= 1 && n <= lessonCount(level, subject))) return null;
    return {
      view: 'lesson',
      level: level,
      subject: subject,
      dir: subj.dir,
      lesson: ('0' + n).slice(-2),
      lessonNum: n,
      type: type
    };
  }

  function viewKey(route) {
    if (route.view === 'lesson') {
      return 'lesson:' + route.level + ':' + route.subject + ':' + route.lesson + ':' + route.type;
    }
    if (route.view === 'books-list') {
      return 'books:' + route.level + ':' + route.dir;
    }
    if (route.view === 'books' || route.view === 'home' || route.view === 'math' || route.view === 'physics') {
      return route.view + ':' + route.level;
    }
    if (route.view === 'books-general') return 'books-general';
    return route.view;
  }

  function loadView(route) {
    if (route.level) setLevel(route.level);
    var key = viewKey(route);
    if (key === currentKey && app.innerHTML !== '') {
      return;
    }
    currentKey = key;
    setActiveLink(route);
    window.scrollTo(0, 0);

    var template = route.view;
    var html = window.TEMPLATES[template];
    if (!html) {
      html = '<section class="section"><div class="container"><p class="empty">Vue introuvable.</p></div></section>';
    }
    app.innerHTML = html;
    afterRender(route);
  }

  function setActiveLink(route) {
    var active;
    if (route.view === 'lesson') active = route.subject;
    else if (route.view === 'books' || route.view === 'books-list' || route.view === 'books-general') active = 'books';
    else active = route.view;

    var links = document.querySelectorAll('.nav-links a[data-route]');
    links.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === active);
    });
  }

  /* ---------- Per-view rendering ---------- */
  function afterRender(route) {
    if (route.view === 'math' || route.view === 'physics') {
      renderSubject(route);
    } else if (route.view === 'home') {
      renderHome(route);
    } else if (route.view === 'lesson') {
      renderDocuments(route);
    } else if (route.view === 'books') {
      renderBooks(route);
    } else if (route.view === 'books-general') {
      renderBooksGeneral(route);
    } else if (route.view === 'books-list') {
      renderBooksList(route);
    }
    initSearch();
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function lessonName(level, subject, num) {
    return listLessons(level, subject)[num - 1];
  }

  function lessonLink(level, subject, num, type) {
    return '#/' + level + '/' + subject + '/' + ('0' + num).slice(-2) + '/' + type;
  }

  function lessonCard(level, name, num, subject, meta) {
    var numPadded = ('0' + num).slice(-2);
    return '' +
      '<div class="lesson-card">' +
      '  <div class="lesson-head">' +
      '    <div class="lesson-number">' + num + '</div>' +
      '    <div>' +
      '      <div class="lesson-title">' + esc(name) + '</div>' +
      '      <div class="lesson-meta">' + esc(meta) + ' (' + numPadded + ')</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="lesson-actions">' +
      '    <a href="' + lessonLink(level, subject, num, 'c') + '" class="lesson-btn cours" data-link>' +
      '      <i class="fas fa-book-open"></i> Cours' +
      '    </a>' +
      '    <a href="' + lessonLink(level, subject, num, 's') + '" class="lesson-btn serie" data-link>' +
      '      <i class="fas fa-pen-to-square"></i> Série d\'exercices' +
      '    </a>' +
      '  </div>' +
      '</div>';
  }

  function renderLevelDropdown() {
    var lvl = getLevel();
    var label = document.getElementById('levelSelectLabel');
    var menu = document.getElementById('levelSelectMenu');
    if (!label || !menu) return;
    label.textContent = LEVELS[lvl].label;
    menu.innerHTML = LEVEL_ORDER.map(function (id) {
      return '<button type="button" class="level-select-option' + (id === lvl ? ' active' : '') +
        '" data-level="' + id + '">' +
        '  <span class="level-opt-text">' +
        '    <span class="level-opt-main">' + LEVELS[id].label + '</span>' +
        '    <span class="level-opt-sub">' + esc(LEVELS[id].description) + '</span>' +
        '  </span>' +
        '  <i class="fas fa-check level-opt-check"></i>' +
        '</button>';
    }).join('');
  }

  function renderSubject(route) {
    var subj = SUBJECTS[route.subject];
    var lvl = levelData(route.level);
    var data = subjectData(route.level, route.subject);
    var total = lessonCount(route.level, route.subject);

    document.getElementById('subjectTitle').textContent = subj.name;
    document.getElementById('subjectDesc').textContent =
      lvl.label + ' — ' + total + ' leçons. Chaque leçon contient un cours et une série d\'exercices.';

    var container = document.getElementById('semesterContainer');
    var html = '';
    if (data.semesters) {
      var offset = 0;
      Object.keys(data.semesters).forEach(function (key) {
        var sem = data.semesters[key];
        html += '<div class="semester-block">';
        html += '<div class="semester-header"><h3>' + sem.name + '</h3><div class="semester-line"></div></div>';
        html += '<div class="lesson-grid">';
        sem.lessons.forEach(function (name, i) {
          var num = offset + i + 1;
          html += lessonCard(route.level, name, num, route.subject, sem.name + ' - Leçon ' + num);
        });
        html += '</div></div>';
        offset += sem.lessons.length;
      });
    } else {
      html += '<div class="semester-block">';
      html += '<div class="semester-header"><h3>Programme</h3><div class="semester-line"></div></div>';
      html += '<div class="lesson-grid">' +
        data.lessons.map(function (name, i) {
          return lessonCard(route.level, name, i + 1, route.subject, 'Leçon ' + (i + 1));
        }).join('') +
        '</div></div>';
    }
    container.innerHTML = html;
  }

  function renderHome(route) {
    var lvl = getLevel();
    if (route.level) {
      setLevel(route.level);
      lvl = route.level;
    }
    document.getElementById('homeTitle').textContent = lvl === '2bac'
      ? '2BAC SM Archive'
      : levelData(lvl).label + ' — Archive';
    renderLevelDropdown();
    document.querySelectorAll('[data-level-href]').forEach(function (a) {
      var value = a.getAttribute('data-level-href');
      a.setAttribute('href', value === 'books' ? '#/books/' + lvl : '#/' + lvl + '/' + value);
    });
    renderHistory();
  }

  /* ---------- Reading uploaded files from generated index-data.js (window.INDEX) ---------- */
  function getIndex() {
    return window.INDEX && window.INDEX.lessons ? window.INDEX : { lessons: {}, books: {} };
  }

  function getLessons(level, dir, lesson, type) {
    var idx = getIndex();
    var byLevel = idx.lessons[level];
    if (!byLevel || !byLevel[dir] || !byLevel[dir][lesson]) return [];
    var list = byLevel[dir][lesson][type];
    return list || [];
  }

  function getBooks(level, subject) {
      var idx = getIndex();
      // General Books : liste unique partagée (index-data.js → books_general),
      // indépendante du niveau. Les documents ne sont stockés qu'une fois sur disque.
      if (subject.indexOf('general/') === 0) {
        return (idx.books_general && idx.books_general[subject]) || [];
      }
      if (!idx.books || !idx.books[level]) return [];
      return idx.books[level][subject] || [];
    }

  /* ---------- Documents list (lesson view) ---------- */
  function renderDocuments(route) {
    var subj = SUBJECTS[route.subject];
    var lvl = levelData(route.level);
    var typeLabel = TYPES[route.type].label;
    var name = lessonName(route.level, route.subject, route.lessonNum);

    document.getElementById('docTitle').textContent = name;
    document.getElementById('docSubtitle').textContent =
      lvl.label + ' - ' + subj.name + ' - Leçon ' + route.lessonNum + ' - ' + typeLabel;

    pushHistory({
      key: 'lesson:' + route.level + ':' + route.subject + ':' + route.lesson + ':' + route.type,
      subject: route.subject,
      subjectName: subj.name,
      levelLabel: lvl.label,
      subjectIcon: subj.icon,
      lessonNum: route.lessonNum,
      lessonName: name,
      typeLabel: typeLabel,
      href: lessonLink(route.level, route.subject, route.lessonNum, route.type)
    });

    var docs = getLessons(route.level, route.dir, route.lesson, route.type);
    if (docs.length === 0) {
      document.getElementById('docList').innerHTML = '';
      document.getElementById('docEmpty').hidden = false;
      return;
    }
    document.getElementById('docEmpty').hidden = true;
    document.getElementById('docList').innerHTML = docs
          .map(function (doc) {
            var coverHtml = doc.cover
              ? '<img class="doc-cover" src="' + esc(fileUrl(doc.cover)) + '" alt="' + esc(doc.title) + '">'
              : '<div class="doc-fallback"><i class="fas fa-file-pdf"></i></div>';
            return '' +
              '<div class="doc-card" tabindex="0" role="button"' +
              ' data-url="' + esc(fileUrl(doc.url)) + '" data-title="' + esc(doc.title) + '"' +
              ' data-subject="' + route.subject + '" data-lesson="' + route.lessonNum + '" data-type="' + route.type + '">' +
              '  <div class="doc-cover-wrap">' + coverHtml + '</div>' +
              '  <div class="doc-info">' +
              '    <div class="doc-title">' + esc(doc.title) + '</div>' +
              '    <div class="doc-meta">' + esc(doc.filename) + ' - ' + formatSize(doc.size) + '</div>' +
              '  </div>' +
              '</div>';
          })
          .join('');
  }

  /* ---------- Books (index + cover grid) ---------- */
  function renderBooks(route) {
    var lvl = levelData(route.level);
    document.getElementById('booksTitle').textContent = 'Livres - ' + lvl.label;
    document.getElementById('booksSubtitle').textContent =
      'Bibliothèque de livres PDF (cliquez sur une couverture pour lire).';
    document.getElementById('booksMathLink').setAttribute('href', '#/books/' + route.level + '/math');
    document.getElementById('booksPcLink').setAttribute('href', '#/books/' + route.level + '/physics');
    document.getElementById('booksAutresLink').setAttribute('href', '#/books/' + route.level + '/autres');
    document.getElementById('booksGeneralLink').setAttribute('href', '#/books/general');
  }

  function renderBooksGeneral() {
    document.getElementById('booksTitle').textContent = 'General Books';
    document.getElementById('booksSubtitle').textContent =
      'Livres généraux, communs à tous les niveaux : Islamic, Personal Development et Coding.';
    var lvlSel = document.getElementById('levelSelector');
    if (lvlSel) lvlSel.innerHTML = '';
    document.getElementById('generalIslamicLink').setAttribute('href', '#/books/general/islamic');
    document.getElementById('generalDevLink').setAttribute('href', '#/books/general/dev/en');
    document.getElementById('generalCodingLink').setAttribute('href', '#/books/general/coding/en');
  }

  function renderBooksList(route) {
    var subj = BOOKS_SUBJECTS[route.subject];
    var lvl = levelData(route.level);
    var general = !!(subj && subj.general);
    var lang = route.lang || (subj && subj.langs ? subj.langs[0] : null);

    document.getElementById('booksTitle').textContent = 'Livres - ' + lvl.label + ' - ' + subj.name;
    document.getElementById('booksSubtitle').textContent =
      'Bibliothèque de livres de ' + subj.name + ' (cliquez sur une couverture pour lire).';

    var langTabs = document.getElementById('langTabs');
    if (langTabs && subj && subj.langs) {
      langTabs.hidden = false;
      langTabs.innerHTML = subj.langs.map(function (l) {
        var href = '#/books/general/' + route.subject + '/' + l;
        return '<a href="' + href + '" class="lang-tab' + (l === lang ? ' active' : '') + '" data-link>' +
          l.toUpperCase() + '<span class="lang-tab-name">' +
          (l === 'en' ? 'English' : 'Arabic') + '</span></a>';
      }).join('');
    } else if (langTabs) {
      langTabs.hidden = true;
    }

    var docs = getBooks(route.level, route.dir);
    if (docs.length === 0) {
      document.getElementById('bookGrid').innerHTML = '';
      document.getElementById('bookEmpty').hidden = false;
      return;
    }
    document.getElementById('bookEmpty').hidden = true;
    document.getElementById('bookGrid').innerHTML = docs
          .map(function (doc) {
            var coverHtml = doc.cover
              ? '<img class="book-cover" src="' + esc(fileUrl(doc.cover)) + '" alt="' + esc(doc.title) + '">'
              : '<div class="book-fallback"><i class="fas fa-book"></i></div>';
            return '' +
              '<div class="book-card" tabindex="0" role="button"' +
              ' data-url="' + esc(fileUrl(doc.url)) + '" data-title="' + esc(doc.title) + '"' +
              ' data-level="' + route.level + '" data-subject="' + route.subject + '">' +
              '  <div class="book-cover-wrap">' + coverHtml + '</div>' +
              '  <div class="book-info">' +
              '    <div class="book-title">' + esc(doc.title) + '</div>' +
              '    <div class="book-meta">' + esc(doc.filename) + ' - ' + formatSize(doc.size) + '</div>' +
              '  </div>' +
              '</div>';
          })
          .join('');
  }

  function formatSize(bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' o';
    return (bytes / 1024).toFixed(1) + ' Ko';
  }

  /* ---------- History (last 6 in localStorage) ---------- */
  function readHistory() {
    try {
      return JSON.parse(localStorage.getItem(HIST_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function pushHistory(entry) {
    var arr = readHistory().filter(function (e) { return e.key !== entry.key; });
    arr.unshift(entry);
    localStorage.setItem(HIST_KEY, JSON.stringify(arr.slice(0, 6)));
  }

  function renderHistory() {
    var wrap = document.getElementById('historyWrap');
    if (!wrap) return;
    var arr = readHistory();
    if (arr.length === 0) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    document.getElementById('historyList').innerHTML = arr.slice(0, 6)
      .map(function (e) {
        var sub = (e.levelLabel ? e.levelLabel + ' - ' : '') + e.subjectName +
          (e.lessonNum ? ' - Leçon ' + e.lessonNum : '') + ' - ' + e.typeLabel;
        return '' +
          '<a class="history-item" href="' + e.href + '" data-link>' +
          '  <span class="history-icon"><i class="fas ' + e.subjectIcon + '"></i></span>' +
          '  <span class="history-body">' +
          '    <span class="history-main">' + esc(e.lessonName) + '</span>' +
          '    <span class="history-sub">' + esc(sub) + '</span>' +
          '  </span>' +
          '  <span class="history-arrow"><i class="fas fa-chevron-right"></i></span>' +
          '</a>';
      })
      .join('');
  }

  /* ---------- Search ---------- */
  function initSearch() {
    var input = document.getElementById('searchInput');
    if (!input) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll('.lesson-card'));
    var empty = document.getElementById('emptyState');

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var visible = 0;
      cards.forEach(function (card) {
        var text = card.textContent.toLowerCase();
        var show = text.indexOf(q) !== -1;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      empty.hidden = visible !== 0;
    });
  }

  /* ---------- PDF preview (horizontal multi-page viewer) ---------- */
  var PDFJS_LIB = 'vendor/pdfjs/pdf.min.js';
  var PDFJS_WORKER = 'vendor/pdfjs/pdf.worker.min.js';

  var PDF = {
    libReady: false,
    doc: null,
    url: '',
    page: 1,
    zoom: 1,
    fitScale: 1,
    scale: 1,
    sizes: [],
    refHeight: 1,
    sizesDone: null,
    availH: 600,
    renderWindow: 2,
    renderToken: 0,
    hPos: {}
  };

  function pdfEl(id) { return document.getElementById(id); }

  function pdfToggleDisabled(id, disabled) {
    var btn = pdfEl(id);
    if (btn) {
      btn.disabled = disabled;
      btn.classList.toggle('disabled', disabled);
    }
  }

  function loadPdfJs(cb) {
    if (PDF.libReady) { cb(); return; }
    var s = document.createElement('script');
    s.src = PDFJS_LIB;
    s.onload = function () {
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        PDF.libReady = true;
        cb();
      } else {
        showPdfError('Le lecteur PDF n\'a pas pu être chargé.');
      }
    };
    s.onerror = function () {
      showPdfError('Le lecteur PDF n\'a pas pu être chargé. Vérifiez votre connexion.');
    };
    document.head.appendChild(s);
  }

  function pdfPagesEl() {
    var inner = pdfEl('pdfPages');
    if (!inner) {
      inner = document.createElement('div');
      inner.id = 'pdfPages';
      pdfEl('pdfFrameWrap').appendChild(inner);
    }
    return inner;
  }

  /// Reads a single reference page and assumes pages share the same geometry.
  /// (Fetching every page on open spikes memory and crashes big books.)
  function pdfEnsureSizes() {
    if (PDF.sizesDone) return PDF.sizesDone;
    var doc = PDF.doc;
    PDF.sizesDone = doc.getPage(1).then(function (p) {
      return p.getViewport({ scale: 1 });
    }).then(function (vp) {
      for (var i = 0; i < doc.numPages; i++) PDF.sizes.push(vp);
      PDF.refHeight = vp.height || 1;
    }).catch(function () {
      PDF.sizesDone = null;
    });
    return PDF.sizesDone;
  }

  function pdfScale() {
    PDF.fitScale = PDF.availH / PDF.refHeight;
    PDF.scale = PDF.fitScale * PDF.zoom;
  }

  /// Builds a placeholder slot (fixed size) for every page so the scrollbar
  /// spans the whole document before any page is rendered.
  function pdfLayoutSlots() {
    if (!PDF.doc) return;
    var wrap = pdfEl('pdfFrameWrap');
    var inner = pdfPagesEl();
    inner.innerHTML = '';
    PDF.renderToken++;
    var pad = 24;
    PDF.availH = Math.max(180, wrap.clientHeight - pad);

    pdfScale();

    for (var i = 1; i <= PDF.doc.numPages; i++) {
      var vp = PDF.sizes[i - 1] || PDF.sizes[0] || { width: 1, height: 1.414 };
      var slot = document.createElement('div');
      slot.className = 'pdf-page';
      slot.setAttribute('data-page', i);
      slot.style.width = Math.floor(vp.width * PDF.scale) + 'px';
      slot.style.height = Math.floor(vp.height * PDF.scale) + 'px';
      inner.appendChild(slot);
    }
    // Cancel any horizontal panning from the previous geometry.
    wrap.scrollLeft = 0;
  }

  function cancelPdfRender() {
    PDF.renderToken++;
    var tasks = window.__pdfRenderTask;
    window.__pdfRenderTask = null;
    if (tasks) {
      for (var i = 0; i < tasks.length; i++) {
        try { if (!tasks[i].isCancelled) tasks[i].cancel(); } catch (e) { /* ignore */ }
      }
    }
  }

  /// Maximum canvas size in device pixels — keeps WebViews/GPUs from crashing
  /// on very large (50 MB +) or zoomed-in pages.
  var PDF_RENDER_MAX_PX = 4096;
  /// Renders are chained one-by-one so a big document never rasterizes several
  /// full pages simultaneously (the #1 cause of OOM crashes on mobile).
  var pdfRenderChain = Promise.resolve();

  function pdfCanvasRatio(cssW, cssH, dpr) {
    var ratio = Math.min(2, dpr || 1);
    if (cssH * ratio > PDF_RENDER_MAX_PX) ratio = Math.max(0.25, PDF_RENDER_MAX_PX / cssH);
    if (cssW * ratio > PDF_RENDER_MAX_PX) ratio = Math.max(0.25, PDF_RENDER_MAX_PX / cssW);
    return ratio;
  }

  /// Queues a page render on the serial chain (memory-safe).
  function renderPageCanvas(i) {
    var slot = pdfPagesEl().querySelector('.pdf-page[data-page="' + i + '"]');
    if (!slot) return;
    if (slot.querySelector('canvas')) return;
    if (slot.getAttribute('data-rendering') === '1') return;
    slot.setAttribute('data-rendering', '1');
    var token = PDF.renderToken;
    pdfRenderChain = pdfRenderChain.then(function () {
      return pdfRenderJob(i, slot, token);
    }).catch(function () { /* keep the chain alive */ });
  }

  /// Rasterizes one page onto the slot's canvas (called by the serial chain).
  function pdfRenderJob(i, slot, token) {
    if (token !== PDF.renderToken || pdfEl('pdfOverlay').hidden) {
      slot.setAttribute('data-rendering', '0');
      return undefined;
    }
    var vp1 = PDF.sizes[i - 1] || PDF.sizes[0] || { width: 1, height: 1.414 };
    var scale = PDF.scale;
    var cssW = Math.floor(vp1.width * scale);
    var cssH = Math.floor(vp1.height * scale);
    var ratio = pdfCanvasRatio(cssW, cssH, window.devicePixelRatio || 1);

    var settle = function () {
      slot.setAttribute('data-rendering', '0');
      if (token === PDF.renderToken) pdfRenderWindow();
    };

    return PDF.doc.getPage(i).then(function (page) {
      if (token !== PDF.renderToken || pdfEl('pdfOverlay').hidden ||
          slot.querySelector('canvas')) {
        slot.setAttribute('data-rendering', '0');
        return undefined;
      }
      var canvas = document.createElement('canvas');
      slot.appendChild(canvas);
      var ctx = canvas.getContext('2d');
      var viewport = page.getViewport({ scale: scale });
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';

      var transform = ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null;
      var task = page.render({
        canvasContext: ctx,
        viewport: viewport,
        transform: transform
      });
      if (!window.__pdfRenderTask) window.__pdfRenderTask = [];
      window.__pdfRenderTask.push(task);

      task.promise.then(function () {
        if (token === PDF.renderToken) pdfEl('pdfLoading').hidden = true;
      }).catch(function () {
        if (token === PDF.renderToken) {
          pdfEl('pdfLoading').hidden = true;
          var c = slot.querySelector('canvas');
          if (c) c.remove();
        }
      });
      return task.promise;
    }).then(settle, settle);
  }

  /// Renders the pages around the current one; frees canvases far away.
  function pdfRenderWindow() {
    if (!PDF.doc) return;
    var n = PDF.doc.numPages;
    var lo = Math.max(1, PDF.page - PDF.renderWindow);
    var hi = Math.min(n, PDF.page + PDF.renderWindow);
    for (var i = lo; i <= hi; i++) renderPageCanvas(i);

    var trimLo = Math.max(1, PDF.page - PDF.renderWindow * 4);
    var trimHi = Math.min(n, PDF.page + PDF.renderWindow * 4);
    pdfPagesEl().querySelectorAll('.pdf-page').forEach(function (slot) {
      var p = parseInt(slot.getAttribute('data-page'), 10);
      if (p < trimLo || p > trimHi) {
        var c = slot.querySelector('canvas');
        if (c) c.remove();
      }
    });
  }

  /// Page nearest the vertical viewport center. Scans a small window around the
/// last known page — plenty for scroll/scroll-snap, and cheap for big books.
function pdfCenterPageNum() {
    var wrap = pdfEl('pdfFrameWrap');
    var slots = pdfPagesEl().querySelectorAll('.pdf-page[data-page]');
    if (slots.length === 0) return PDF.page;
    var viewCenter = wrap.scrollTop + wrap.clientHeight / 2;

    var idx = Math.max(0, Math.min(slots.length - 1, PDF.page - 1));
    var win = 10;
    var lo = Math.max(0, idx - win);
    var hi = Math.min(slots.length - 1, idx + win);

    var best = 1;
    var bestDist = Infinity;
    for (var i = lo; i <= hi; i++) {
      var c = slots[i].offsetTop + slots[i].clientHeight / 2;
      var d = Math.abs(c - viewCenter);
      if (d < bestDist) {
        bestDist = d;
        best = parseInt(slots[i].getAttribute('data-page'), 10);
      }
    }
    if (bestDist !== Infinity) return best;

    for (var j = 0; j < slots.length; j++) {
      var c2 = slots[j].offsetTop + slots[j].clientHeight / 2;
      var d2 = Math.abs(c2 - viewCenter);
      if (d2 < bestDist) {
        bestDist = d2;
        best = parseInt(slots[j].getAttribute('data-page'), 10);
      }
    }
    return best;
  }

  function pdfCenterPage(num, smooth) {
    var wrap = pdfEl('pdfFrameWrap');
    var slot = pdfPagesEl().querySelector('.pdf-page[data-page="' + num + '"]');
    if (!slot) return;
    var target = slot.offsetTop + slot.clientHeight / 2 - wrap.clientHeight / 2;
    if (smooth) {
      wrap.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    } else {
      wrap.scrollTop = Math.max(0, target);
    }
  }

  function pdfOnScroll() {
    if (!PDF.doc) return;
    var num = pdfCenterPageNum();
    if (num !== PDF.page) {
      PDF.hPos[PDF.page] = pdfEl('pdfFrameWrap').scrollLeft;
      PDF.page = num;
      pdfUpdateNav();
      pdfRenderWindow();
      pdfScheduleSavePage();
    }
  }

  function pdfApplyHScroll(num) {
    var wrap = pdfEl('pdfFrameWrap');
    var maxL = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
    wrap.scrollLeft = Math.max(0, Math.min(maxL, PDF.hPos[num] || 0));
  }

  function pdfUpdateNav() {
    var total = PDF.doc ? PDF.doc.numPages : 1;
    var page = PDF.doc ? PDF.page : 1;
    var inp = pdfEl('pdfPageInput');
    if (inp && document.activeElement !== inp) inp.value = String(page);
    var tot = pdfEl('pdfPageTotal');
    if (tot) tot.textContent = '/ ' + total;
    var scr = pdfEl('pdfScrubber');
    if (scr) {
      if (String(total) !== scr.max) scr.max = String(total);
      scr.value = String(page);
    }
    pdfToggleArrowsDisabled();
  }

  function pdfToggleArrowsDisabled() {
    if (!PDF.doc) return;
    pdfToggleDisabled('pdfPrev', PDF.page <= 1);
    pdfToggleDisabled('pdfNext', PDF.page >= PDF.doc.numPages);
  }

  function loadPdf(url, title) {
    var loading = pdfEl('pdfLoading');
    pdfEl('pdfTitle').textContent = title || 'PDF';
    pdfEl('pdfError').hidden = true;
    loading.hidden = false;
    pdfEl('pdfOverlay').hidden = false;
    document.body.style.overflow = 'hidden';
    pdfShowUi();
    pdfToggleDisabled('pdfOpen', false);
    pdfEl('pdfFrameWrap').innerHTML = '';
    cancelPdfRender();

    var pdfUrl = fileUrl(url);
    PDF.url = pdfUrl;

    // Sur ordinateur (PC Windows/Mac), on affiche le PDF via le lecteur natif
    // du navigateur dans une iframe : plus fiable que pdf.js côté desktop.
    // Le lecteur pdf.js (horizontal, zoom, plein écran) reste inchangé sur
    // mobile / WebView.
    if (getPlatform() === 'desktop') {
      pdfEl('pdfOverlay').classList.add('pdf-native');
      PDF.page = 1;
      PDF.zoom = 1;
      PDF.sizes = [];
      PDF.sizesDone = null;
      PDF.hPos = {};
      var frame = document.createElement('iframe');
      frame.className = 'pdf-native-frame';
      frame.title = pdfEl('pdfTitle').textContent || 'Document PDF';
      frame.src = pdfUrl;
      frame.onload = function () { loading.hidden = true; };
      pdfEl('pdfFrameWrap').appendChild(frame);
      pdfEnterFs();
      return;
    }

    pdfEl('pdfOverlay').classList.remove('pdf-native');

    loadPdfJs(function () {
      PDF.page = 1;
      PDF.zoom = 1;
      PDF.sizes = [];
      PDF.sizesDone = null;
      PDF.hPos = {};

      window.pdfjsLib.getDocument({ url: pdfUrl }).promise
        .then(function (doc) {
          PDF.doc = doc;
          pdfUpdateNav();
          return pdfEnsureSizes();
        })
        .then(function () {
          loading.hidden = true;
          pdfLayoutSlots();
          pdfRenderWindow();
          var last = pdfLoadLastPage();
          pdfCenterPage(last || 1, false);
          pdfUpdateNav();
        })
        .catch(function () {
          loading.hidden = true;
          showPdfError('Impossible de charger ce document. Essayez de le télécharger.');
        });
    });
  }

  function pdfGoto(num) {
    if (!PDF.doc) return;
    if (num < 1) num = 1;
    if (num > PDF.doc.numPages) num = PDF.doc.numPages;
    PDF.page = num;
    pdfUpdateNav();
    pdfRenderWindow();
    pdfCenterPage(num, true);
    pdfApplyHScroll(num);
  }

  var PDF_MIN_ZOOM = 0.4;
  var PDF_MAX_ZOOM = 3;

  /// Captures the current layout state so a later zoom can keep the point
  /// the user chose (vx, vy relative to the scroller) stationary on screen.
  function pdfAnchorAtViewport(vx, vy, baseZoom) {
    var wrap = pdfEl('pdfFrameWrap');
    var page = pdfCenterPageNum();
    var slot = pdfPagesEl().querySelector('.pdf-page[data-page="' + page + '"]');
    var clampY = Math.max(0, Math.min(wrap.clientHeight, vy || wrap.clientHeight / 2));
    var clampX = Math.max(0, Math.min(wrap.clientWidth, vx || wrap.clientWidth / 2));
    return {
      page: page,
      anchorContentX: wrap.scrollLeft + clampX,
      anchorContentY: wrap.scrollTop + clampY,
      anchorViewportX: clampX,
      anchorViewportY: clampY,
      baseZoom: baseZoom || PDF.zoom,
      pageTop: slot ? slot.offsetTop : 0,
      pageHeight: slot ? slot.clientHeight : 1,
      pageLeft: slot ? slot.offsetLeft : 0,
      pageWidth: slot ? slot.clientWidth : 1
    };
  }

  function pdfClampZoom(z) {
    return Math.max(PDF_MIN_ZOOM, Math.min(PDF_MAX_ZOOM, z));
  }

  /// Final, sharp zoom. Repositions the scroller so the chosen anchor point
  /// stays under the same viewport position, vertically and horizontally.
  function pdfZoomTo(newZoom, anchor) {
    anchor = anchor || pdfAnchorAtViewport(pdfEl('pdfFrameWrap').clientWidth / 2, null, PDF.zoom);
    newZoom = pdfClampZoom(newZoom);
    PDF.zoom = newZoom;
    var fracV = anchor.pageHeight > 0
      ? (anchor.anchorContentY - anchor.pageTop) / anchor.pageHeight
      : 0.5;
    var fracH = anchor.pageWidth > 0
      ? (anchor.anchorContentX - anchor.pageLeft) / anchor.pageWidth
      : 0.5;
    fracV = Math.max(0, Math.min(1, fracV));
    fracH = Math.max(0, Math.min(1, fracH));

    pdfLayoutSlots();
    pdfRenderWindow();

    var wrap = pdfEl('pdfFrameWrap');
    if (PDF.doc && PDF.doc.numPages) {
      var slot = pdfPagesEl().querySelector('.pdf-page[data-page="' + anchor.page + '"]');
      if (slot) {
        var newContentY = slot.offsetTop + fracV * slot.clientHeight;
        var maxTop = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
        wrap.scrollTop = Math.max(0, Math.min(maxTop, newContentY - anchor.anchorViewportY));
        var newContentX = slot.offsetLeft + fracH * slot.clientWidth;
        var maxLeft = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
        wrap.scrollLeft = Math.max(0, Math.min(maxLeft, newContentX - anchor.anchorViewportX));
      }
    }
    pdfUpdateNav();
    PDF.hPos[anchor.page] = wrap.scrollLeft;
  }

  function pdfZoom(factor) {
    pdfZoomTo(factor, null);
  }

  /// Live preview: scale the whole strip around the anchor while pinching
  /// (blurry but responsive). The sharp zoom lands on touchend.
  function pdfZoomPreview(newZoom, anchor) {
    newZoom = pdfClampZoom(newZoom);
    var inner = pdfPagesEl();
    var k = newZoom / anchor.baseZoom;
    inner.style.transformOrigin = anchor.anchorContentX + 'px ' + anchor.anchorContentY + 'px';
    inner.style.transform = 'scale(' + k + ')';
    PDF.zoom = newZoom;
  }

  function pdfClearPreview() {
    var inner = pdfPagesEl();
    inner.style.transform = '';
    inner.style.transformOrigin = '';
  }

  /// Floating toolbars: shown while interacting, auto-hidden while reading.
  var pdfUiTimer = null;
  function pdfSetUi(show) {
    pdfEl('pdfOverlay').classList.toggle('pdf-ui-hidden', !show);
  }
  function pdfShowUi() {
    pdfSetUi(true);
    clearTimeout(pdfUiTimer);
    pdfUiTimer = setTimeout(function () { pdfSetUi(false); }, 3200);
  }
  function pdfToggleUi() {
    var overlay = pdfEl('pdfOverlay');
    pdfSetUi(!overlay.classList.contains('pdf-ui-hidden'));
    clearTimeout(pdfUiTimer);
  }

  /// Double-tap / double-click: zoom to 2x around the point, back to fit.
  function pdfDoubleTapZoom(anchor) {
    if (!PDF.doc || !anchor) return;
    pdfSetUi(true);
    if (PDF.zoom > 1.05) pdfZoomTo(1, anchor);
    else pdfZoomTo(Math.min(PDF_MAX_ZOOM, 2), anchor);
    pdfShowUi();
  }

  /* ---------- Full screen ---------- */
  function pdfIsFs() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function pdfEnterFs() {
    var o = pdfEl('pdfOverlay');
    var fn = o.requestFullscreen || o.webkitRequestFullscreen || o.msRequestFullscreen;
    if (!fn) return false;
    try {
      var p = fn.call(o);
      if (p && typeof p.catch === 'function') p.catch(function () {});
      return true;
    } catch (e) { return false; }
  }
  function pdfExitFs() {
    if (!pdfIsFs()) return;
    try {
      var p = (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) { /* ignore */ }
  }
  function pdfUpdateFsIcon() {
    var b = pdfEl('pdfFullscreen');
    if (!b) return;
    var i = b.querySelector('i');
    if (i) i.className = 'fas ' + (pdfIsFs() ? 'fa-compress' : 'fa-expand');
  }
  function pdfToggleFs() {
    try {
      if (pdfIsFs()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var o = pdfEl('pdfOverlay');
        var fn = o.requestFullscreen || o.webkitRequestFullscreen || o.msRequestFullscreen;
        if (!fn) {
          showToast('Plein écran non pris en charge sur cet appareil.');
          return;
        }
        fn.call(o);
      }
    } catch (e) {
      showToast('Plein écran non pris en charge sur cet appareil.');
    }
  }
  function pdfRelayoutKeep() {
    if (pdfEl('pdfOverlay').hidden || !PDF.doc) return;
    pdfLayoutSlots();
    pdfRenderWindow();
    pdfCenterPage(PDF.page, false);
    pdfApplyHScroll(PDF.page);
    pdfUpdateNav();
  }

  /* ---------- Remember last page ---------- */
  function pdfStore() {
    try { return window.localStorage; } catch (e) { return null; }
  }
  function pdfLastPageKey() {
    return 'pdfLastPage:' + PDF.url;
  }
  function pdfSaveLastPage() {
    if (!PDF.doc) return;
    var s = pdfStore();
    if (!s) return;
    try { s.setItem(pdfLastPageKey(), String(PDF.page)); } catch (e) { /* ignore */ }
  }
  function pdfLoadLastPage() {
    var s = pdfStore();
    if (!s) return null;
    try {
      var v = parseInt(s.getItem(pdfLastPageKey()), 10);
      return (v > 0) ? v : null;
    } catch (e) { return null; }
  }
  var pdfSaveTimer = null;
  function pdfScheduleSavePage() {
    clearTimeout(pdfSaveTimer);
    pdfSaveTimer = setTimeout(pdfSaveLastPage, 250);
  }

  function initViewer() {
    var overlay = pdfEl('pdfOverlay');
    var wrap = pdfEl('pdfFrameWrap');

    pdfEl('pdfClose').addEventListener('click', closeViewer);
    pdfEl('pdfOpen').addEventListener('click', function () {
      if (PDF.url) window.open(PDF.url, '_blank');
    });
    pdfEl('pdfPrev').addEventListener('click', function () { pdfGoto(PDF.page - 1); });
    pdfEl('pdfNext').addEventListener('click', function () { pdfGoto(PDF.page + 1); });
    pdfEl('pdfZoomIn').addEventListener('click', function () { pdfZoom(PDF.zoom * 1.25); });
    pdfEl('pdfZoomOut').addEventListener('click', function () { pdfZoom(PDF.zoom * 0.8); });
    pdfEl('pdfFullscreen').addEventListener('click', pdfToggleFs);
    document.addEventListener('fullscreenchange', function () {
      pdfUpdateFsIcon();
      pdfRelayoutKeep();
    });
    document.addEventListener('webkitfullscreenchange', function () {
      pdfUpdateFsIcon();
      pdfRelayoutKeep();
    });

    // Go to a page by editing the number in the bottom toolbar.
    var pageInput = pdfEl('pdfPageInput');
    pageInput.addEventListener('focus', function () {
      clearTimeout(pdfUiTimer);
      setTimeout(function () { pageInput.select(); }, 0);
    });
    pageInput.addEventListener('input', pdfShowUi);
    pageInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        pageInput.blur();
      } else if (e.key === 'Escape') {
        pageInput.value = String(PDF.page);
        pageInput.blur();
      }
    });
    pageInput.addEventListener('blur', function () {
      if (!PDF.doc) { pageInput.value = '1'; return; }
      var v = parseInt(pageInput.value, 10);
      if (isNaN(v)) pageInput.value = String(PDF.page);
      else pdfGoto(v);
      pdfShowUi();
    });

    // Page scrubber: drag through the document quickly.
    pdfEl('pdfScrubber').addEventListener('input', function () {
      if (!PDF.doc) return;
      var v = parseInt(this.value, 10);
      if (isNaN(v)) return;
      v = Math.max(1, Math.min(PDF.doc.numPages, v));
      if (v !== PDF.page) {
        PDF.page = v;
        pdfUpdateNav();
        pdfRenderWindow();
        pdfCenterPage(v, false);
        pdfApplyHScroll(v);
        pdfScheduleSavePage();
      }
      pdfShowUi();
    });

    document.addEventListener('keydown', function (e) {
      if (overlay.hidden) return;
      if (e.key === 'Escape') {
        closeViewer();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        pdfGoto(PDF.page - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        pdfGoto(PDF.page + 1);
      }
    });

    // Reading scroll updates the current page (the one at the center) and
    // briefly wakes the toolbars.
    wrap.addEventListener('scroll', function () {
      pdfShowUi();
      pdfOnScroll();
    }, { passive: true });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (overlay.hidden) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        pdfLayoutSlots();
        pdfRenderWindow();
        pdfCenterPage(PDF.page, false);
        pdfApplyHScroll(PDF.page);
      }, 150);
    });

    // Desktop: hover reveals the toolbars, leaving hides them.
    overlay.addEventListener('mouseenter', pdfShowUi);
    overlay.addEventListener('mouseleave', function () {
      clearTimeout(pdfUiTimer);
      pdfSetUi(false);
    });
    overlay.addEventListener('mousemove', pdfShowUi);
    wrap.addEventListener('dblclick', function (e) {
      if (!PDF.doc) return;
      var rect = wrap.getBoundingClientRect();
      pdfDoubleTapZoom(pdfAnchorAtViewport(e.clientX - rect.left, e.clientY - rect.top, PDF.zoom));
    });

    // Touch: the strip scrolls natively; two-finger pinch zooms; double-tap
    // toggles zoom; single tap toggles the toolbars.
    var touchStart = null;
    var lastTap = null;

    function pdfTouchDist(touches) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onPdfTouchStart(e) {
      if (e.touches.length === 2 && PDF.doc) {
        var rect = wrap.getBoundingClientRect();
        var cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        var cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        touchStart = {
          mode: 'pinch',
          dist: pdfTouchDist(e.touches),
          zoom: PDF.zoom,
          anchor: pdfAnchorAtViewport(cx, cy, PDF.zoom)
        };
      } else if (e.touches.length < 2) {
        if (!touchStart || touchStart.mode !== 'pinch') {
          var t = e.touches[0];
          touchStart = { mode: 'none', x: t.clientX, y: t.clientY };
        }
      }
      pdfShowUi();
    }

    function onPdfTouchMove(e) {
      if (!touchStart || touchStart.mode !== 'pinch') return;
      if (e.touches.length < 2) return;
      e.preventDefault();
      var d = pdfTouchDist(e.touches);
      if (touchStart.dist > 0) {
        pdfZoomPreview(touchStart.zoom * (d / touchStart.dist), touchStart.anchor);
      }
    }

    function onPdfTouchEnd(e) {
      if (touchStart && touchStart.mode === 'pinch') {
        pdfClearPreview();
        pdfZoomTo(PDF.zoom, touchStart.anchor);
        pdfShowUi();
      } else if (touchStart && touchStart.mode === 'none' && e.changedTouches.length === 1) {
        var t = e.changedTouches[0];
        var moved = Math.sqrt((t.clientX - touchStart.x) * (t.clientX - touchStart.x) +
                              (t.clientY - touchStart.y) * (t.clientY - touchStart.y));
        if (moved < 14) {
          var now = Date.now();
          var rect = wrap.getBoundingClientRect();
          var anchor = pdfAnchorAtViewport(t.clientX - rect.left, t.clientY - rect.top, PDF.zoom);
          if (lastTap && (now - lastTap.time) <= 300 &&
              Math.abs(t.clientX - lastTap.x) <= 46 &&
              Math.abs(t.clientY - lastTap.y) <= 46) {
            pdfDoubleTapZoom(anchor);
            lastTap = null;
          } else {
            lastTap = { time: now, x: t.clientX, y: t.clientY };
            pdfToggleUi();
          }
        }
      }
      touchStart = null;
    }

    wrap.addEventListener('touchstart', onPdfTouchStart, { passive: true });
    wrap.addEventListener('touchmove', onPdfTouchMove, { passive: false });
    wrap.addEventListener('touchend', onPdfTouchEnd, { passive: true });
    wrap.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });

    // Mouse wheel: Ctrl/⌘ + wheel zooms around the cursor; a plain wheel
    // scrolls vertically through the pages natively.
    wrap.addEventListener('wheel', function (e) {
      if (!PDF.doc || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      var rect = wrap.getBoundingClientRect();
      var vx = e.clientX - rect.left;
      var vy = e.clientY - rect.top;
      var factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
      pdfZoomTo(pdfClampZoom(PDF.zoom * factor), pdfAnchorAtViewport(vx, vy, PDF.zoom));
    }, { passive: false });

    app.addEventListener('click', function (e) {
      var docCard = e.target.closest('.doc-card');
      if (docCard) {
        loadPdf(docCard.getAttribute('data-url'), docCard.getAttribute('data-title'));
        return;
      }
      var card = e.target.closest('.book-card');
      if (card) {
        var subjKey = card.getAttribute('data-subject');
        loadPdf(card.getAttribute('data-url'), card.getAttribute('data-title') || '');
        pushHistory({
          key: 'book:' + card.getAttribute('data-url'),
          subject: subjKey,
          subjectName: BOOKS_SUBJECTS[subjKey].name,
          subjectIcon: BOOKS_SUBJECTS[subjKey].icon,
          lessonName: card.getAttribute('data-title') || '',
          typeLabel: 'Livre',
          href: BOOKS_SUBJECTS[subjKey].general
            ? '#/books/general/' + subjKey
            : '#/books/' + card.getAttribute('data-level') + '/' + subjKey
        });
      }
    });
  }

  function closeViewer() {
    pdfSaveLastPage();
    pdfExitFs();
    pdfEl('pdfOverlay').hidden = true;
    pdfEl('pdfOverlay').classList.remove('pdf-native');
    document.body.style.overflow = '';
    cancelPdfRender();
    PDF.doc = null;
    PDF.url = '';
    PDF.page = 1;
    PDF.zoom = 1;
    PDF.sizes = [];
    PDF.sizesDone = null;
    pdfEl('pdfFrameWrap').innerHTML = '';
    pdfEl('pdfPageInput').value = '1';
    pdfEl('pdfPageTotal').textContent = '/ 1';
    var scr = pdfEl('pdfScrubber');
    scr.max = '1';
    scr.value = '1';
    pdfSetUi(true);
    pdfUpdateFsIcon();
  }

  // Expose la fermeture du lecteur PDF pour qu'une app externe
  // (ex. le WebView Flutter) puisse le fermer de façon déterministe.
  window.closePdfViewer = function () {
    var overlay = pdfEl('pdfOverlay');
    if (overlay && !overlay.hidden) closeViewer();
  };

  function showPdfError(msg) {
    pdfEl('pdfLoading').hidden = true;
    pdfEl('pdfError').textContent = msg;
    pdfEl('pdfError').hidden = false;
  }

  /* ---------- Toast ---------- */
  function showToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.classList.remove('show');
    }, 2200);
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    document.getElementById('backToTop').addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();