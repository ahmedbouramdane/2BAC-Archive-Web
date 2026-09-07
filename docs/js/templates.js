window.TEMPLATES = {
  home: `<section class="hero">
  <div class="container">
    <div class="level-selector" id="levelSelector"></div>
    <h1 id="homeTitle">2BAC SM Archive</h1>
    <p id="homeDesc">Bibliothèque de cours, séries d'exercices et livres.</p>
    <div class="hero-buttons">
      <a href="#/math" class="btn btn-primary" data-link data-level-href="math">
        <i class="fas fa-calculator"></i> Mathématiques
      </a>
      <a href="#/physics" class="btn btn-outline" data-link data-level-href="physics">
        <i class="fas fa-flask"></i> Physique &amp; Chimie
      </a>
      <a href="#/books" class="btn btn-outline" data-link data-level-href="books">
        <i class="fas fa-book"></i> Livres
      </a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2 class="section-title">Matières</h2>
    <div class="cards-grid">
      <a href="#/math" class="subject-card" data-link data-level-href="math">
        <div class="subject-icon"><i class="fas fa-calculator"></i></div>
        <h3>Mathématiques</h3>
        <p>Cours et séries d'exercices pour le niveau choisi.</p>
      </a>
      <a href="#/physics" class="subject-card physics" data-link data-level-href="physics">
        <div class="subject-icon"><i class="fas fa-flask"></i></div>
        <h3>Physique &amp; Chimie</h3>
        <p>Cours et séries d'exercices pour le niveau choisi.</p>
      </a>
      <a href="#/books" class="subject-card" data-link data-level-href="books">
        <div class="subject-icon"><i class="fas fa-book"></i></div>
        <h3>Livres</h3>
        <p>Bibliothèque de livres PDF : cours complets, résumés et exercices corrigés au format livre.</p>
      </a>
    </div>
  </div>
</section>

<section class="section" id="historyWrap" hidden>
  <div class="container">
    <h2 class="section-title">Récents</h2>
    <p class="history-hint">Vos derniers documents consultés.</p>
    <div class="history-list" id="historyList"></div>
  </div>
</section>`,

  math: `<section class="hero hero-inner">
  <div class="container">
    <div class="back-row">
      <button class="back-btn" data-back aria-label="Retour">
        <i class="fas fa-arrow-left"></i> Retour
      </button>
    </div>
    <div class="level-selector" id="levelSelector"></div>
    <h1 id="subjectTitle">Mathématiques</h1>
    <p id="subjectDesc"></p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="search">
      <i class="fas fa-search search-icon"></i>
      <input type="text" id="searchInput" placeholder="Rechercher une leçon...">
    </div>

    <div id="semesterContainer"></div>
    <p class="empty" id="emptyState" hidden>Aucune leçon ne correspond à votre recherche.</p>
  </div>
</section>`,

  physics: `<section class="hero hero-inner">
  <div class="container">
    <div class="back-row">
      <button class="back-btn" data-back aria-label="Retour">
        <i class="fas fa-arrow-left"></i> Retour
      </button>
    </div>
    <div class="level-selector" id="levelSelector"></div>
    <h1 id="subjectTitle">Physique &amp; Chimie</h1>
    <p id="subjectDesc"></p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="search">
      <i class="fas fa-search search-icon"></i>
      <input type="text" id="searchInput" placeholder="Rechercher une leçon...">
    </div>

    <div id="semesterContainer"></div>
    <p class="empty" id="emptyState" hidden>Aucune leçon ne correspond à votre recherche.</p>
  </div>
</section>`,

  lesson: `<section class="hero hero-inner">
  <div class="container">
    <div class="back-row">
      <button class="back-btn" data-back aria-label="Retour">
        <i class="fas fa-arrow-left"></i> Retour
      </button>
    </div>
    <div class="level-selector" id="levelSelector"></div>
    <h1 id="docTitle"></h1>
    <p class="muted" id="docSubtitle"></p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="doc-grid" id="docList"></div>
    <p class="empty" id="docEmpty" hidden>Aucun document pour cette leçon pour le moment.</p>
  </div>
</section>`,

  books: `<section class="hero hero-inner">
  <div class="container">
    <div class="back-row">
      <button class="back-btn" data-back aria-label="Retour">
        <i class="fas fa-arrow-left"></i> Retour
      </button>
    </div>
    <div class="level-selector" id="levelSelector"></div>
    <h1 id="booksTitle">Livres</h1>
    <p class="muted" id="booksSubtitle"></p>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2 class="section-title">Bibliothèque</h2>
    <div class="cards-grid">
      <a id="booksMathLink" href="#/books/math" class="subject-card" data-link>
        <div class="subject-icon"><i class="fas fa-calculator"></i></div>
        <h3>Livres de Mathématiques</h3>
        <p>Cours complets, résumés et exercices corrigés au format livre.</p>
      </a>
      <a id="booksPcLink" href="#/books/physics" class="subject-card physics" data-link>
        <div class="subject-icon"><i class="fas fa-flask"></i></div>
        <h3>Livres de Physique &amp; Chimie</h3>
        <p>Cours complets, résumés et exercices corrigés au format livre.</p>
      </a>
      <a id="booksAutresLink" href="#/books/autres" class="subject-card autres" data-link>
        <div class="subject-icon"><i class="fas fa-folder-open"></i></div>
        <h3>Autres</h3>
        <p>Autres livres : guides, annales, autres matières et documents divers.</p>
      </a>
    </div>
  </div>
</section>`,

  "books-list": `<section class="hero hero-inner">
  <div class="container">
    <div class="back-row">
      <button class="back-btn" data-back aria-label="Retour">
        <i class="fas fa-arrow-left"></i> Retour
      </button>
    </div>
    <div class="level-selector" id="levelSelector"></div>
    <h1 id="booksTitle"></h1>
    <p class="muted" id="booksSubtitle"></p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="book-grid" id="bookGrid"></div>
    <p class="empty" id="bookEmpty" hidden>Aucun livre pour le moment.</p>
  </div>
</section>`
};