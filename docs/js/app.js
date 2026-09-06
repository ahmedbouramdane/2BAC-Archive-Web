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

  function pdfPagesEl() {
    var inner = pdfEl('pdfPages');
    if (!inner) {
      inner = document.createElement('div');
      inner.id = 'pdfPages';
      pdfEl('pdfFrameWrap').appendChild(inner);
    }
    return inner;
  }

  function pdfEnsureSizes() {
    if (PDF.sizesDone) return PDF.sizesDone;
    var doc = PDF.doc;
    var jobs = [];
    for (var i = 1; i <= doc.numPages; i++) {
      jobs.push(doc.getPage(i).then(function (p) {
        return p.getViewport({ scale: 1 });
      }));
    }
    PDF.sizesDone = Promise.all(jobs).then(function (vps) {
      PDF.sizes = vps;
      var maxH = 0;
      for (var j = 0; j < vps.length; j++) {
        if (vps[j].height > maxH) maxH = vps[j].height;
      }
      PDF.refHeight = maxH || 1;
    }).catch(function () {
      PDF.sizesDone = null;
    });
    return PDF.sizesDone;
  }

  function pdfScale() {
    PDF.fitScale = PDF.availH / PDF.refHeight;
    PDF.scale = PDF.fitScale * PDF.zoom;
  }

  /// Builds a placeholder slot (fixed size) for every page so the horizontal
  /// scrollbar spans the whole document before any page is rendered.
  function pdfLayoutSlots() {
    if (!PDF.doc) return;
    var wrap = pdfEl('pdfFrameWrap');
    var inner = pdfPagesEl();
    inner.innerHTML = '';
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

  function renderPageCanvas(i) {
    var slot = pdfPagesEl().querySelector('.pdf-page[data-page="' + i + '"]');
    if (!slot) return;
    if (slot.querySelector('canvas')) return;
    if (slot.getAttribute('data-rendering') === '1') return;
    slot.setAttribute('data-rendering', '1');
    var vp1 = PDF.sizes[i - 1] || PDF.sizes[0] || { width: 1, height: 1.414 };
    var token = PDF.renderToken;
    var ratio = Math.min(2, window.devicePixelRatio || 1);
    var scale = PDF.scale;
    var cssW = Math.floor(vp1.width * scale);
    var cssH = Math.floor(vp1.height * scale);

    var settle = function () {
      slot.setAttribute('data-rendering', '0');
      if (token === PDF.renderToken) pdfRenderWindow();
    };

    PDF.doc.getPage(i).then(function (page) {
      if (token !== PDF.renderToken || pdfEl('pdfOverlay').hidden) return;
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
    }).catch(function () {
      pdfEl('pdfLoading').hidden = true;
    }).then(settle);
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

  function pdfCenterPageNum() {
    var wrap = pdfEl('pdfFrameWrap');
    var slots = pdfPagesEl().querySelectorAll('.pdf-page[data-page]');
    if (slots.length === 0) return PDF.page;
    var viewCenter = wrap.scrollTop + wrap.clientHeight / 2;
    var best = 1;
    var bestDist = Infinity;
    for (var i = 0; i < slots.length; i++) {
      var c = slots[i].offsetTop + slots[i].clientHeight / 2;
      var d = Math.abs(c - viewCenter);
      if (d < bestDist) {
        bestDist = d;
        best = parseInt(slots[i].getAttribute('data-page'), 10);
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
      PDF.page = num;
      pdfUpdateNav();
      pdfRenderWindow();
    }
  }

  function pdfUpdateNav() {
    pdfEl('pdfPageInfo').textContent = (PDF.doc ? PDF.page : 0) + ' / ' + (PDF.doc ? PDF.doc.numPages : 1);
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
    pdfToggleDisabled('pdfOpen', false);
    pdfEl('pdfFrameWrap').innerHTML = '';
    cancelPdfRender();

    loadPdfJs(function () {
      var pdfUrl = fileUrl(url);
      PDF.url = pdfUrl;
      PDF.page = 1;
      PDF.zoom = 1;
      PDF.sizes = [];
      PDF.sizesDone = null;

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
          pdfCenterPage(1, false);
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
      anchorContentY: wrap.scrollTop + clampY,
      anchorViewportY: clampY,
      anchorViewportX: clampX,
      baseZoom: baseZoom || PDF.zoom,
      pageTop: slot ? slot.offsetTop : 0,
      pageHeight: slot ? slot.clientHeight : 1
    };
  }

  function pdfClampZoom(z) {
    return Math.max(PDF_MIN_ZOOM, Math.min(PDF_MAX_ZOOM, z));
  }

  /// Final, sharp zoom. Repositions the scroller so the chosen anchor point
  /// stays under the same viewport position (zoom on the chosen area).
  function pdfZoomTo(newZoom, anchor) {
    anchor = anchor || pdfAnchorAtViewport(pdfEl('pdfFrameWrap').clientWidth / 2, null, PDF.zoom);
    newZoom = pdfClampZoom(newZoom);
    PDF.zoom = newZoom;
    var frac = anchor.pageHeight > 0
      ? (anchor.anchorContentY - anchor.pageTop) / anchor.pageHeight
      : 0.5;
    frac = Math.max(0, Math.min(1, frac));

    pdfLayoutSlots();
    pdfRenderWindow();

    var wrap = pdfEl('pdfFrameWrap');
    if (PDF.doc && PDF.doc.numPages) {
      var slot = pdfPagesEl().querySelector('.pdf-page[data-page="' + anchor.page + '"]');
      if (slot) {
        var newContentY = slot.offsetTop + frac * slot.clientHeight;
        var maxTop = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
        wrap.scrollTop = Math.max(0, Math.min(maxTop, newContentY - anchor.anchorViewportY));
      }
    }
    pdfUpdateNav();
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
    inner.style.transformOrigin = anchor.anchorViewportX + 'px ' + anchor.anchorContentY + 'px';
    inner.style.transform = 'scale(' + k + ')';
    PDF.zoom = newZoom;
  }

  function pdfClearPreview() {
    var inner = pdfPagesEl();
    inner.style.transform = '';
    inner.style.transformOrigin = '';
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
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        pdfGoto(PDF.page - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        pdfGoto(PDF.page + 1);
      }
    });

    // Horizontal scrolling updates the current page (the one at the center).
    wrap.addEventListener('scroll', pdfOnScroll, { passive: true });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (overlay.hidden) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        pdfLayoutSlots();
        pdfRenderWindow();
        pdfCenterPage(PDF.page, false);
      }, 150);
    });

    // Touch: the strip scrolls natively; two-finger pinch zooms.
    var touchStart = null;

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
          touchStart = { mode: 'none' };
        }
      }
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
    PDF.sizes = [];
    PDF.sizesDone = null;
    pdfEl('pdfFrameWrap').innerHTML = '';
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