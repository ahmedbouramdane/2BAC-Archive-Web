const LESSONS = {
  math: {
    title: 'Mathématiques',
    description: '13 leçons couvrant tout le programme de Mathématiques',
    defaultActive: new Array(13).fill(true),
    lessons: [
      'Limites et continuité',
      'Suites numériques',
      'Dérivation et étude des fonctions',
      'Fonctions logarithmes',
      'Fonctions exponentielles',
      'Nombres complexes',
      'Calcul intégral',
      'Équations différentielles',
      'Arithmétique dans ℤ',
      'Lois de composition interne',
      'Groupe, anneau et corps',
      'Espaces vectoriels réels',
      'Calcul de probabilités'
    ]
  },
  physics: {
    title: 'Physique & Chimie',
    description: 'Leçons du programme de Physique-Chimie (Semestre 1 & 2)',
    semesters: {
      s1: {
        name: 'Semestre 1',
        lessons: [
          'Ondes mécaniques progressives',
          'Ondes mécaniques progressives périodiques',
          'Propagation des ondes lumineuses',
          'Transformations lentes et rapides',
          'Suivi temporel d\'une transformation chimique – Vitesse de réaction',
          'Décroissance radioactive',
          'Noyaux, masse et énergie',
          'Transformations chimiques s\'effectuant dans les 2 sens',
          'État d\'équilibre d\'un système chimique',
          'Dipôle RC',
          'Dipôle RL',
          'Oscillations libres d\'un circuit RLC série',
          'Circuit RLC série en régime sinusoïdal forcé (SM)',
          'Ondes électromagnétiques et modulation d\'amplitude',
          'Transformations liées à des réactions acide-base',
          'Dosage acido-basique'
        ]
      },
      s2: {
        name: 'Semestre 2',
        lessons: [
          'Les lois de Newton',
          'Chute libre d\'un corps solide',
          'Mouvements plans',
          'Projectile dans le champ de pesanteur',
          'Particule chargée dans un champ magnétique',
          'Particule chargée dans un champ électrique (SM)',
          'Évolution spontanée d\'un système chimique',
          'Transformations spontanées dans les piles et production d\'énergie',
          'Mouvement des satellites et des planètes',
          'Mouvement de rotation d\'un solide autour d\'un axe fixe',
          'Oscillateurs mécaniques',
          'Transformations forcées (Électrolyse)',
          'Aspects énergétiques',
          'Atome et mécanique de Newton',
          'Réactions d\'estérification et d\'hydrolyse',
          'Contrôle de l\'évolution d\'un système chimique'
        ]
      }
    }
  }
};
