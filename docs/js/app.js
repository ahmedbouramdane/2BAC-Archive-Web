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

  var SUBJECTS = {
    math: { name: 'Mathématiques', dir: 'math', count: 13, icon: 'fa-calculator' },
    physics: { name: 'Physique & Chimie', dir: 'pc', count: 32, icon: 'fa-flask' }
  };

  var TYPES = {
    c: { label: 'Cours', icon: 'fa-book-open' },
    s: { label: "Série d'exercices", icon: 'fa-pen-to-square' }
  };

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

  function onHashChange() {
    loadView(parseRoute(window.location.hash));
  }

  function parseRoute(hash) {
    var path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
    var parts = path.split('/').filter(Boolean);

    if (parts.length === 0) return { view: 'home' };

    if (parts.length === 1) {
      if (parts[0] === 'math') return { view: 'math' };
      if (parts[0] === 'physics') return { view: 'physics' };
      if (parts[0] === 'books') return { view: 'books' };
      return { view: 'home' };
    }

    if (parts.length === 2 && parts[0] === 'books') {
      var subj = SUBJECTS[parts[1]];
      if (subj) {
        return { view: 'books-list', subject: parts[1], dir: subj.dir };
      }
      return { view: 'home' };
    }

    if (parts.length === 3) {
      var subject = parts[0];
      var lesson = parts[1];
      var type = parts[2];
      var subj = SUBJECTS[subject];
      if (subj && /^\d{1,2}$/.test(lesson) && TYPES[type]) {
        var n = parseInt(lesson, 10);
        if (n >= 1 && n <= subj.count) {
          return {
            view: 'lesson',
            subject: subject,
            dir: subj.dir,
            lesson: ('0' + n).slice(-2),
            lessonNum: n,
            type: type
          };
        }
      }
      return { view: 'home' };
    }

    return { view: 'home' };
  }

  function viewKey(route) {
    if (route.view === 'lesson') {
      return 'lesson:' + route.subject + ':' + route.lesson + ':' + route.type;
    }
    if (route.view === 'books-list') {
      return 'books:' + route.dir;
    }
    return route.view;
  }

  function loadView(route) {
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
    else if (route.view === 'books' || route.view === 'books-list') active = 'books';
    else active = route.view;

    var links = document.querySelectorAll('.nav-links a[data-route]');
    links.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === active);
    });
  }

  /* ---------- Per-view rendering ---------- */
  function afterRender(route) {
    if (route.view === 'math') {
      renderMath();
    } else if (route.view === 'physics') {
      renderPhysics();
    } else if (route.view === 'home') {
      renderHistory();
    } else if (route.view === 'lesson') {
      renderDocuments(route);
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

  function physicsLessons() {
    var sem = LESSONS.physics.semesters;
    return sem.s1.lessons.concat(sem.s2.lessons);
  }

  function lessonName(subject, num) {
    return subject === 'math'
      ? LESSONS.math.lessons[num - 1]
      : physicsLessons()[num - 1];
  }

  function lessonLink(subject, num, type) {
    return '#/' + subject + '/' + ('0' + num).slice(-2) + '/' + type;
  }

  function lessonCard(name, num, subject, meta) {
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
      '    <a href="' + lessonLink(subject, num, 'c') + '" class="lesson-btn cours" data-link>' +
      '      <i class="fas fa-book-open"></i> Cours' +
      '    </a>' +
      '    <a href="' + lessonLink(subject, num, 's') + '" class="lesson-btn serie" data-link>' +
      '      <i class="fas fa-pen-to-square"></i> Série d\'exercices' +
      '    </a>' +
      '  </div>' +
      '</div>';
  }

  function renderMath() {
    var container = document.getElementById('lessonContainer');
    container.innerHTML = LESSONS.math.lessons
      .map(function (name, i) {
        return lessonCard(name, i + 1, 'math', 'Leçon ' + (i + 1));
      })
      .join('');
  }

  function renderPhysics() {
    var container = document.getElementById('semesterContainer');
    var html = '';
    var offset = 0;
    Object.keys(LESSONS.physics.semesters).forEach(function (key) {
      var sem = LESSONS.physics.semesters[key];
      html += '<div class="semester-block">';
      html += '<div class="semester-header"><h3>' + sem.name + '</h3><div class="semester-line"></div></div>';
      html += '<div class="lesson-grid">';
      sem.lessons.forEach(function (name, i) {
        var num = offset + i + 1;
        html += lessonCard(name, num, 'physics', sem.name + ' - Leçon ' + num);
      });
      html += '</div></div>';
      offset += sem.lessons.length;
    });
    container.innerHTML = html;
  }

  /* ---------- Reading uploaded files from generated index-data.js (window.INDEX) ---------- */
  function getIndex() {
    return window.INDEX && window.INDEX.lessons ? window.INDEX : { lessons: {}, books: {} };
  }

  function getLessons(dir, lesson, type) {
    var idx = getIndex();
    var byLesson = idx.lessons[dir];
    if (!byLesson || !byLesson[lesson]) return [];
    var list = byLesson[lesson][type];
    return list || [];
  }

  function getBooks(subject) {
    var idx = getIndex();
    return (idx.books && idx.books[subject]) || [];
  }

  /* ---------- Documents list (lesson view) ---------- */
  function renderDocuments(route) {
    var subj = SUBJECTS[route.subject];
    var typeLabel = TYPES[route.type].label;
    var name = lessonName(route.subject, route.lessonNum);

    document.getElementById('docTitle').textContent = name;
    document.getElementById('docSubtitle').textContent =
      subj.name + ' - Leçon ' + route.lessonNum + ' - ' + typeLabel;

    pushHistory({
      key: 'lesson:' + route.subject + ':' + route.lesson + ':' + route.type,
      subject: route.subject,
      subjectName: subj.name,
      subjectIcon: subj.icon,
      lessonNum: route.lessonNum,
      lessonName: name,
      typeLabel: typeLabel,
      href: lessonLink(route.subject, route.lessonNum, route.type)
    });

    var docs = getLessons(route.dir, route.lesson, route.type);
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

  /* ---------- Books (cover grid) ---------- */
  function renderBooksList(route) {
    var subj = SUBJECTS[route.subject];

    document.getElementById('booksTitle').textContent = 'Livres - ' + subj.name;
    document.getElementById('booksSubtitle').textContent =
      'Bibliothèque de livres de ' + subj.name + ' (cliquez sur une couverture pour lire).';

    var docs = getBooks(route.dir);
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
              ' data-url="' + esc(fileUrl(doc.url)) + '" data-title="' + esc(doc.title) + '" data-subject="' + route.subject + '">' +
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
        var sub = e.subjectName + (e.lessonNum ? ' - Leçon ' + e.lessonNum : '') + ' - ' + e.typeLabel;
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

  /* ---------- PDF preview (native browser viewer) ---------- */
  var PDF_VIEWER = {
    openUrl: '',
    openTitle: ''
  };
  var pdfLoadTimeout = null;

  function initViewer() {
    var overlay = document.getElementById('pdfOverlay');

    document.getElementById('pdfClose').addEventListener('click', closeViewer);

    document.addEventListener('keydown', function (e) {
      if (!overlay.hidden && e.key === 'Escape') closeViewer();
    });

    app.addEventListener('click', function (e) {
      var docCard = e.target.closest('.doc-card');
      if (docCard) {
        openPdf(docCard.getAttribute('data-url'), docCard.getAttribute('data-title'));
        return;
      }
      var card = e.target.closest('.book-card');
      if (card) {
        openPdf(card.getAttribute('data-url'), card.getAttribute('data-title') || '');
        pushHistory({
          key: 'book:' + card.getAttribute('data-url'),
          subject: card.getAttribute('data-subject'),
          subjectName: SUBJECTS[card.getAttribute('data-subject')].name,
          subjectIcon: SUBJECTS[card.getAttribute('data-subject')].icon,
          lessonName: card.getAttribute('data-title') || '',
          typeLabel: 'Livre',
          href: '#/books/' + card.getAttribute('data-subject')
        });
      }
    });
  }

  function openPdf(url, title) {
    if (!url) return;

    PDF_VIEWER.openUrl = url;
    PDF_VIEWER.openTitle = title || '';
    document.getElementById('pdfTitle').textContent = title || 'PDF';

    var loading = document.getElementById('pdfLoading');
    var oldFrame = document.getElementById('pdfFrame');
    var frame = document.createElement('embed');
    frame.type = 'application/pdf';
    frame.className = 'pdf-frame';
    frame.id = 'pdfFrame';
    frame.addEventListener('load', function () {
      loading.hidden = true;
    });
    frame.addEventListener('error', function () {
      loading.hidden = true;
      showPdfError('Votre navigateur n\'a pas pu afficher ce document. Essayez de le télécharger.');
    });
    oldFrame.parentNode.replaceChild(frame, oldFrame);

    document.getElementById('pdfError').hidden = true;
    loading.hidden = false;
    document.getElementById('pdfOverlay').hidden = false;
    document.body.style.overflow = 'hidden';

    frame.src = fileUrl(url);

    clearTimeout(pdfLoadTimeout);
    pdfLoadTimeout = setTimeout(function () {
      if (!document.getElementById('pdfOverlay').hidden) loading.hidden = true;
    }, 1500);
  }

  function closeViewer() {
    document.getElementById('pdfOverlay').hidden = true;
    document.body.style.overflow = '';
    document.getElementById('pdfTitle').textContent = 'PDF';
    clearTimeout(pdfLoadTimeout);

    var wrap = document.querySelector('.pdf-frame-wrap');
    var oldFrame = document.getElementById('pdfFrame');
    var frame = document.createElement('embed');
    frame.type = 'application/pdf';
    frame.className = 'pdf-frame';
    frame.id = 'pdfFrame';
    wrap.replaceChild(frame, oldFrame);
    PDF_VIEWER.openUrl = '';
  }

  function showPdfError(msg) {
    document.getElementById('pdfLoading').hidden = true;
    document.getElementById('pdfError').textContent = msg;
    document.getElementById('pdfError').hidden = false;
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