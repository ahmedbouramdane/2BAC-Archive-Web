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
        return;
      }
      if (e.target.closest('[data-back]')) {
        e.preventDefault();
        closeMenu();
        goBack();
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

  /* ---------- In-app history (back arrow) ---------- */
  var navHistory = [];

  function currentHash() {
    return window.location.hash || '#/';
  }

  function pushNav(hash) {
    if (navHistory[navHistory.length - 1] === hash) return;
    navHistory.push(hash);
  }

  function goBack() {
    if (navHistory.length > 1) {
      navHistory.pop(); // current view
      var prev = navHistory.pop();
      window.location.hash = prev.replace(/^#/, '');
      return;
    }
    // Fallback: go to the logical parent of the current route.
    var hash = currentHash();
    var route = parseRoute(hash);
    var fallback = '#/';
    if (route.view === 'lesson') {
      fallback = '#/' + route.subject;
    } else if (route.view === 'books-list') {
      fallback = '#/books';
    } else if (route.view === 'math' || route.view === 'physics' || route.view === 'books') {
      fallback = '#/';
    }
    window.location.hash = fallback.replace(/^#/, '');
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
    pushNav(currentHash());
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

  /* ---------- PDF preview (PDF.js canvas renderer) ---------- */
  var PDFJS_LIB = 'vendor/pdfjs/pdf.min.js';
  var PDFJS_WORKER = 'vendor/pdfjs/pdf.worker.min.js';

  var PDF = {
    libReady: false,
    doc: null,
    url: '',
    page: 1,
    zoom: 1,
    fitScale: 1.3,
    renderToken: 0
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

  function loadPdf(url, title) {
    var loading = pdfEl('pdfLoading');
    pdfEl('pdfTitle').textContent = title || 'PDF';
    pdfEl('pdfError').hidden = true;
    loading.hidden = false;
    pdfEl('pdfOverlay').hidden = false;
    document.body.style.overflow = 'hidden';
    pdfToggleDisabled('pdfOpen', false);
    pdfEl('pdfFrameWrap').innerHTML = '';

    loadPdfJs(function () {
      var pdfUrl = fileUrl(url);
      PDF.url = pdfUrl;
      PDF.page = 1;
      PDF.zoom = 1;

      window.pdfjsLib.getDocument({ url: pdfUrl }).promise
        .then(function (doc) {
          PDF.doc = doc;
          loading.hidden = true;
          pdfUpdateNav();
          renderPdfPage();
        })
        .catch(function () {
          loading.hidden = true;
          showPdfError('Impossible de charger ce document. Essayez de le télécharger.');
        });
    });
  }

  function pdfToggleArrowsDisabled() {
    if (!PDF.doc) return;
    pdfToggleDisabled('pdfPrev', PDF.page <= 1);
    pdfToggleDisabled('pdfNext', PDF.page >= PDF.doc.numPages);
  }

  function pdfUpdateNav() {
    pdfEl('pdfPageInfo').textContent = (PDF.doc ? PDF.page : 0) + ' / ' + (PDF.doc ? PDF.doc.numPages : 1);
    pdfToggleArrowsDisabled();
  }

  function cancelPdfRender() {
    PDF.renderToken++;
    var pending = window.__pdfRenderTask;
    if (pending && !pending.isCancelled) {
      try { pending.cancel(); } catch (e) { /* ignore */ }
    }
    window.__pdfRenderTask = null;
  }

  function renderPdfPage() {
    if (!PDF.doc) return;
    var token = ++PDF.renderToken;
    var wrap = pdfEl('pdfFrameWrap');
    var canvas = wrap.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      wrap.appendChild(canvas);
    }

    PDF.doc.getPage(PDF.page).then(function (page) {
      if (token !== PDF.renderToken || pdfEl('pdfOverlay').hidden) return;

      var wrapClientWidth = wrap.clientWidth || 320;
      PDF.fitScale = Math.max(0.4, Math.min(2, wrapClientWidth / page.getViewport({ scale: 1 }).width));
      var scale = PDF.fitScale * PDF.zoom;

      var ctx = canvas.getContext('2d');
      var ratio = Math.max(1, window.devicePixelRatio || 1);
      var viewport = page.getViewport({ scale: scale });
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';

      var transform = ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null;
      var task = page.render({
        canvasContext: ctx,
        viewport: viewport,
        transform: transform
      });
      window.__pdfRenderTask = task;

      task.promise.then(function () {
        if (token === PDF.renderToken) pdfEl('pdfLoading').hidden = true;
      }).catch(function () {
        if (token === PDF.renderToken && !pdfEl('pdfOverlay').hidden) {
          pdfEl('pdfLoading').hidden = true;
          showPdfError('Impossible d\'afficher cette page.');
        }
      });
    }).catch(function () {
      if (token === PDF.renderToken) {
        pdfEl('pdfLoading').hidden = true;
        showPdfError('Impossible d\'afficher cette page.');
      }
    });
  }

  function pdfGoto(num) {
    if (!PDF.doc) return;
    if (num < 1 || num > PDF.doc.numPages) return;
    PDF.page = num;
    pdfUpdateNav();
    cancelPdfRender();
    renderPdfPage();
  }

  function pdfZoom(factor) {
    PDF.zoom = Math.max(0.5, Math.min(5, factor));
    cancelPdfRender();
    renderPdfPage();
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

    document.addEventListener('keydown', function (e) {
      if (overlay.hidden) return;
      if (e.key === 'Escape') {
        closeViewer();
      } else if (e.key === 'ArrowLeft') {
        pdfGoto(PDF.page - 1);
      } else if (e.key === 'ArrowRight') {
        pdfGoto(PDF.page + 1);
      }
    });

    // Touch gestures: swipe left/right to change page, two-finger pinch to zoom.
    var touchStart = null;

    function pdfTouchDist(touches) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onPdfTouchStart(e) {
      if (e.touches.length === 1) {
        touchStart = {
          mode: 'swipe',
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          lastX: e.touches[0].clientX,
          lastY: e.touches[0].clientY
        };
      } else if (e.touches.length === 2 && PDF.doc) {
        touchStart = {
          mode: 'pinch',
          dist: pdfTouchDist(e.touches),
          zoom: PDF.zoom
        };
      } else {
        touchStart = null;
      }
    }

    function onPdfTouchMove(e) {
      if (!touchStart) return;
      if (touchStart.mode === 'pinch' && e.touches.length === 2) {
        e.preventDefault();
        var d = pdfTouchDist(e.touches);
        if (touchStart.dist > 0) {
          pdfZoom(touchStart.zoom * (d / touchStart.dist));
        }
      } else if (touchStart.mode === 'swipe' && e.touches.length === 1) {
        touchStart.lastX = e.touches[0].clientX;
        touchStart.lastY = e.touches[0].clientY;
      }
    }

    function onPdfTouchEnd(e) {
      if (!touchStart) return;
      if (touchStart.mode === 'swipe') {
        var dx = touchStart.lastX - touchStart.x;
        var dy = touchStart.lastY - touchStart.y;
        if (PDF.zoom <= 1.05 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          if (dx < 0) pdfGoto(PDF.page + 1);
          else pdfGoto(PDF.page - 1);
        }
      }
      touchStart = null;
    }

    wrap.addEventListener('touchstart', onPdfTouchStart, { passive: true });
    wrap.addEventListener('touchmove', onPdfTouchMove, { passive: false });
    wrap.addEventListener('touchend', onPdfTouchEnd, { passive: true });
    wrap.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });

    app.addEventListener('click', function (e) {
      var docCard = e.target.closest('.doc-card');
      if (docCard) {
        loadPdf(docCard.getAttribute('data-url'), docCard.getAttribute('data-title'));
        return;
      }
      var card = e.target.closest('.book-card');
      if (card) {
        loadPdf(card.getAttribute('data-url'), card.getAttribute('data-title') || '');
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

  function closeViewer() {
    pdfEl('pdfOverlay').hidden = true;
    document.body.style.overflow = '';
    cancelPdfRender();
    PDF.doc = null;
    PDF.url = '';
    PDF.page = 1;
    PDF.zoom = 1;
    pdfEl('pdfPageInfo').textContent = '1 / 1';
  }

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