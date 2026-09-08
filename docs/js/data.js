/* Niveau scolaire et programmes.
 * Level folders: 2bac / 1bac / tc.
 * math peut avoir une liste `lessons` (plat) ou des `semesters`.
 * physics a toujours des `semesters` (S1 + S2).
 */
var LEVEL_ORDER = ['2bac', '1bac', 'tc'];

var LEVELS = {
  '2bac': {
    id: '2bac',
    label: '2 BAC',
    short: '2BAC',
    description: '2ème année du baccalauréat — Sciences Mathématiques A et B',
    math: {
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
      semesters: {
        s1: {
          name: 'Semestre 1',
          lessons: [
            'Ondes mécaniques progressives',
            'Ondes mécaniques progressives périodiques',
            'Propagation des ondes lumineuses',
            'Transformations lentes et rapides',
            "Suivi temporel d'une transformation chimique – Vitesse de réaction",
            'Décroissance radioactive',
            'Noyaux, masse et énergie',
            "Transformations chimiques s'effectuant dans les 2 sens",
            "État d'équilibre d'un système chimique",
            'Dipôle RC',
            'Dipôle RL',
            "Oscillations libres d'un circuit RLC série",
            'Circuit RLC série en régime sinusoïdal forcé (SM)',
            "Ondes électromagnétiques et modulation d'amplitude",
            'Transformations liées à des réactions acide-base',
            'Dosage acido-basique'
          ]
        },
        s2: {
          name: 'Semestre 2',
          lessons: [
            'Les lois de Newton',
            "Chute libre d'un corps solide",
            'Mouvements plans',
            'Projectile dans le champ de pesanteur',
            'Particule chargée dans un champ magnétique',
            'Particule chargée dans un champ électrique (SM)',
            "Évolution spontanée d'un système chimique",
            "Transformations spontanées dans les piles et production d'énergie",
            'Mouvement des satellites et des planètes',
            "Mouvement de rotation d'un solide autour d'un axe fixe",
            'Oscillateurs mécaniques',
            'Transformations forcées (Électrolyse)',
            'Aspects énergétiques',
            'Atome et mécanique de Newton',
            "Réactions d'estérification et d'hydrolyse",
            "Contrôle de l'évolution d'un système chimique"
          ]
        }
      }
    }
  },

  '1bac': {
    id: '1bac',
    label: '1 BAC',
    short: '1BAC',
    description: '1ère année du baccalauréat — Sciences Mathématiques',
    math: {
      semesters: {
        s1: {
          name: 'Semestre 1',
          lessons: [
            'Logique mathématique',
            'Ensembles et applications',
            'Généralités sur les fonctions',
            'Le barycentre dans le plan',
            'Le produit scalaire dans le plan',
            'Calcul trigonométrique',
            'Les suites numériques',
            "Limites d'une fonction",
            'La rotation dans le plan'
          ]
        },
        s2: {
          name: 'Semestre 2',
          lessons: [
            'La dérivation',
            'Étude des fonctions',
            "Vecteurs de l'espace",
            "Géométrie dans l'espace",
            'Dénombrement',
            "Le produit scalaire dans l'espace",
            'Arithmétique dans Z',
            'Le produit vectoriel'
          ]
        }
      }
    },
    physics: {
      semesters: {
        s1: {
          name: 'Semestre 1',
          lessons: [
            "Rotation d'un solide indéformable autour d'un axe fixe",
            "Travail et puissance d'une force",
            'Importance de la mesure en chimie',
            'Grandeurs physiques liées à la quantité de matière',
            'Solutions électrolytiques et concentrations',
            "Travail et énergie cinétique",
            "Travail et énergie potentielle de pesanteur - Énergie mécanique",
            "Suivi d'une transformation chimique",
            'Mesure des quantités de matière en solution par conductimétrie',
            'Travail et énergie interne (Sciences Maths)',
            'Énergie thermique et transfert thermique (Sciences Maths)',
            'Les réactions acido-basiques',
            "Les réactions d'oxydo-réduction",
            'Les dosages (ou titrages) directs'
          ]
        },
        s2: {
          name: 'Semestre 2',
          lessons: [
            'Champ électrostatique (Sciences Maths)',
            "Énergie potentielle d'une charge électrique dans un champ électrique uniforme (Sciences Maths)",
            "Transfert d'énergie dans un circuit électrique",
            "Comportement global d'un circuit électrique",
            'Expansion de la chimie organique',
            'Les molécules organiques et les squelettes carbonés',
            'Le champ magnétique',
            'Le champ magnétique créé par un courant électrique',
            'Les forces électromagnétiques - La loi de Laplace',
            'Modification du squelette carboné',
            'Les groupes caractéristiques en chimie organique',
            'La réactivité des alcools',
            "Visibilité d'un objet",
            'Les images formées par un miroir plan',
            'Les images formées par une lentille mince convergente'
          ]
        }
      }
    }
  },

  'tc': {
    id: 'tc',
    label: 'TC',
    short: 'TC',
    description: 'Tronc Commun — Sciences',
    math: {
      semesters: {
        s1: {
          name: 'Semestre 1',
          lessons: [
            'Les ensembles de nombres ℕ, ℤ, ℚ, 𝔻 et ℝ',
            'Arithmétique dans ℕ',
            'Calcul vectoriel dans le plan',
            'La projection dans le plan',
            "L'ordre dans ℝ",
            'La droite dans le plan',
            'Les polynômes',
            'Équations, inéquations et systèmes',
            'Trigonométrie 1 — Règles du calcul trigonométrique'
          ]
        },
        s2: {
          name: 'Semestre 2',
          lessons: [
            'Trigonométrie 2 — Équations et inéquations trigonométriques',
            'Généralités sur les fonctions',
            'Transformations du plan',
            'Le produit scalaire',
            "Géométrie dans l'espace",
            'Statistiques'
          ]
        }
      }
    },
    physics: {
      semesters: {
        s1: {
          name: 'Semestre 1',
          lessons: [
            'La gravitation universelle',
            "Exemples d'actions mécaniques",
            'Les espèces chimiques',
            'Extraction, séparation et identification des espèces chimiques',
            'Le mouvement',
            "Le principe d'inertie",
            "Équilibre d'un corps sous l'action de 2 forces",
            'Synthèse des espèces chimiques',
            "Le modèle de l'atome",
            "Équilibre d'un corps sous l'action de 3 forces",
            "Équilibre d'un solide en rotation autour d'un axe fixe",
            'La géométrie de quelques molécules',
            'Classification périodique des éléments chimiques'
          ]
        },
        s2: {
          name: 'Semestre 2',
          lessons: [
            'Le courant électrique continu',
            'La tension électrique',
            'La mole, unité de quantité de matière',
            'Association des conducteurs ohmiques',
            'Caractéristiques de quelques dipôles passifs',
            'La concentration molaire',
            'Modélisation des transformations chimiques – Bilan de la matière',
            "Caractéristiques d'un dipôle actif",
            'Le transistor bipolaire',
            "L'amplificateur opérationnel"
          ]
        }
      }
    }
  }
};