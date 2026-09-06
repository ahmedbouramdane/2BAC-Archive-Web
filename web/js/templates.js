window.TEMPLATES = {
  home: `<section class="hero">
  <div class="container">
    <h1>2BAC SM Archive</h1>
    <p>Bibliothèque de cours et séries d'exercices pour la 2ème année du baccalauréat sciences mathématiques.</p>
    <div class="hero-buttons">
      <a href="#/math" class="btn btn-primary" data-link>
        <i class="fas fa-calculator"></i> Mathématiques
      </a>
      <a href="#/physics" class="btn btn-outline" data-link>
        <i class="fas fa-flask"></i> Physique &amp; Chimie
      </a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2 class="section-title">Matières</h2>
    <div class="cards-grid">
      <a href="#/math" class="subject-card" data-link>
        <div class="subject-icon"><i class="fas fa-calculator"></i></div>
        <h3>Mathématiques</h3>
        <p>13 leçons : limites, suites, dérivées, logarithmes, exponentielles, nombres complexes, calcul intégral et plus.</p>
      </a>
      <a href="#/physics" class="subject-card physics" data-link>
        <div class="subject-icon"><i class="fas fa-flask"></i></div>
        <h3>Physique &amp; Chimie</h3>
        <p>32 leçons sur les deux semestres : ondes, radioactivité, électricité, mécanique, énergie et plus.</p>
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
    <h1>Mathématiques</h1>
    <p>13 leçons. Chaque leçon contient un cours et une série d'exercices.</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="search">
      <i class="fas fa-search search-icon"></i>
      <input type="text" id="searchInput" placeholder="Rechercher une leçon...">
    </div>

    <div class="lesson-grid" id="lessonContainer"></div>
    <p class="empty" id="emptyState" hidden>Aucune leçon ne correspond à votre recherche.</p>
  </div>
</section>`,

  physics: `<section class="hero hero-inner">
  <div class="container">
    <h1>Physique &amp; Chimie</h1>
    <p>32 leçons couvrant les deux semestres. Chaque leçon contient un cours et une série d'exercices.</p>
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
    <p class="crumbs" id="crumbs"></p>
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
    <h1>Livres</h1>
    <p>Bibliothèque de livres PDF. Choisissez une matière pour consulter les couvertures et ouvrir les livres.</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2 class="section-title">Bibliothèque</h2>
    <div class="cards-grid">
      <a href="#/books/math" class="subject-card" data-link>
        <div class="subject-icon"><i class="fas fa-calculator"></i></div>
        <h3>Livres de Mathématiques</h3>
        <p>Cours complets, résumés et exercices corrigés au format livre.</p>
      </a>
      <a href="#/books/physics" class="subject-card physics" data-link>
        <div class="subject-icon"><i class="fas fa-flask"></i></div>
        <h3>Livres de Physique &amp; Chimie</h3>
        <p>Cours complets, résumés et exercices corrigés au format livre.</p>
      </a>
    </div>
  </div>
</section>`,

  "books-list": `<section class="hero hero-inner">
  <div class="container">
    <p class="crumbs" id="crumbs"></p>
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