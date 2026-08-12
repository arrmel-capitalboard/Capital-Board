'use strict';

// ─────────────────────────────────────────────────────────────
// Onboarding — questionnaire de profil + visite guidée
//
// Deux étapes enchaînées au premier passage dans l'app, après le modal
// prénom/nom (js/app.js, _ensureUserName) :
//   1. six questions courtes, une par écran, pour situer le profil ;
//   2. une visite guidée qui surligne les vraies zones de l'app.
//
// Les deux sont passables. « Plus tard » n'enterre rien : le questionnaire est
// reproposé une fois, sept jours après, et la visite reste accessible depuis
// le menu (« Revoir la visite guidée »).
//
// Stockage : profiles/{uid}, un doc par compte, lisible par son titulaire et
// par l'admin. Aucune réponse n'est obligatoire pour utiliser l'app.
//
// Ce fichier est chargé APRÈS js/app.js et s'appuie sur ses globales
// (db, firestoreDoc, setFirestoreDoc, getDocFromServer, isAdmin…).
// ─────────────────────────────────────────────────────────────

(function () {

  const COL = 'profiles';
  const RELANCE_MS = 7 * 24 * 3600 * 1000; // délai avant de reproposer un questionnaire passé
  const LS_TOUR = 'cb_tour_done';          // repli local : évite un flash de visite si Firestore tarde

  // ── Questionnaire ─────────────────────────────────────────────────────────
  const QUESTIONS = [
    {
      key: 'experience',
      short: 'Expérience',
      title: 'Où en êtes-vous avec l’investissement ?',
      hint: 'Cela nous aide à calibrer ce que l’app vous montre en premier.',
      options: [
        ['debutant',   'Je débute',                'Premiers pas, ou pas encore investi'],
        ['1a3',        'Entre 1 et 3 ans',         'Les bases sont là'],
        ['3a10',       'Entre 3 et 10 ans',        'Un portefeuille déjà construit'],
        ['plus10',     'Plus de 10 ans',           'Investisseur aguerri'],
      ],
    },
    {
      key: 'goal',
      short: 'Objectif',
      title: 'Votre objectif principal ?',
      options: [
        ['epargne',  'Faire fructifier mon épargne'],
        ['retraite', 'Préparer ma retraite'],
        ['revenus',  'Générer des revenus réguliers'],
        ['projet',   'Financer un projet précis'],
        ['apprendre','Apprendre et suivre les marchés'],
      ],
    },
    {
      key: 'wrappers',
      short: 'Enveloppes',
      title: 'Que suivez-vous déjà ?',
      hint: 'Plusieurs réponses possibles.',
      multi: true,
      options: [
        ['pea',      'PEA'],
        ['cto',      'Compte-titres'],
        ['av',       'Assurance-vie'],
        ['per',      'PER'],
        ['livrets',  'Livrets'],
        ['crypto',   'Crypto'],
        ['immo',     'Immobilier'],
        ['or',       'Or & métaux'],
        ['rien',     'Rien pour l’instant'],
      ],
    },
    {
      key: 'amount',
      short: 'Montant',
      title: 'Quel montant suivez-vous, environ ?',
      hint: 'Ordre de grandeur seulement — rien n’est vérifié ni partagé.',
      options: [
        ['lt5k',    'Moins de 5 000 €'],
        ['5k25k',   'De 5 000 à 25 000 €'],
        ['25k100k', 'De 25 000 à 100 000 €'],
        ['gt100k',  'Plus de 100 000 €'],
        ['nsp',     'Je préfère ne pas répondre'],
      ],
    },
    {
      key: 'expectation',
      short: 'Attente',
      title: 'Qu’attendez-vous en priorité de Capital Board ?',
      options: [
        ['perf',      'Suivre mes performances'],
        ['central',   'Centraliser tout mon patrimoine'],
        ['dividendes','Suivre mes dividendes'],
        ['alertes',   'Recevoir des alertes sur mes lignes'],
        ['budget',    'Piloter mon budget et mes dépenses'],
      ],
    },
    {
      key: 'source',
      short: 'Origine',
      title: 'Comment avez-vous connu Capital Board ?',
      options: [
        ['bouche',   'Bouche-à-oreille'],
        ['reseaux',  'Réseaux sociaux'],
        ['recherche','Moteur de recherche'],
        ['ia',       'Une IA', 'ChatGPT, Claude, Perplexity…'],
        ['discord',  'Discord ou une communauté'],
        ['autre',    'Autrement'],
      ],
    },
  ];

  // ── Visite guidée ─────────────────────────────────────────────────────────
  // Chaque étape désigne sa cible par une fonction : la barre du bas et la
  // barre latérale ne coexistent pas, la cible dépend donc de la largeur.
  const mobile = () => window.matchMedia('(max-width: 768px)').matches;
  const q = (sel) => document.querySelector(sel);

  const STEPS = [
    {
      target: () => q('.pf-kpis'),
      title: 'Votre patrimoine, en haut de page',
      text: 'Valorisation, plus-value latente et espèces disponibles, recalculés à chaque cours reçu.',
      page: 'portfolio',
    },
    {
      target: () => (mobile() ? q('#nav-add-btn') : q('.table-header .btn-add:last-of-type')),
      title: 'Ajouter une ligne',
      text: 'Pour l’instant, la saisie est manuelle : un titre, une quantité, un prix d’achat, et la performance se calcule toute seule ensuite. L’import depuis les données exportables de votre courtier arrive bientôt.',
      page: 'portfolio',
    },
    {
      target: () => q('#pea-tabs'),
      title: 'Les sections de votre PEA',
      text: 'Activité, dividendes, watchlist, projections, calendrier des résultats — tout est ici, sans quitter la page.',
      page: 'portfolio',
    },
    {
      target: () => q('#page-portfolio .table-container'),
      title: 'Vos titres',
      text: 'Cours suivis en continu. Touchez une ligne pour déplier son détail et sa courbe.',
      page: 'portfolio',
    },
    {
      target: () => (mobile() ? q('.mobile-nav-item[data-mob="patrimoine"]') : q('.nav-item')),
      title: 'Au-delà du PEA',
      text: 'Crypto, immobilier, livrets, assurance-vie : la vue Patrimoine additionne tout ce que vous déclarez.',
    },
    {
      target: () => (mobile() ? q('.mobile-nav-inner .mobile-nav-item:last-child') : q('.sidebar')),
      title: 'Le reste de l’app',
      text: 'Dépenses, fiscalité, actualités, communauté et support se rejoignent depuis ce menu.',
    },
  ];

  // ── Accès Firestore ───────────────────────────────────────────────────────
  const ref = (uid) => firestoreDoc(db, COL, uid);

  async function readProfile(uid) {
    // Lecture serveur : un doc encore en cache ferait réapparaître un
    // questionnaire déjà rempli sur un autre appareil.
    const snap = await getDocFromServer(ref(uid));
    return snap.exists() ? (snap.data() || {}) : {};
  }

  async function save(uid, data) {
    await setFirestoreDoc(ref(uid), { ...data, updatedAt: Date.now(), v: 1 }, { merge: true });
  }

  // ── Enchaînement ──────────────────────────────────────────────────────────
  // Appelé après le modal prénom/nom. Ne fait rien en démo, pour l'admin, ou
  // si l'utilisateur a déjà tout vu.
  //
  // Les deux étapes sont commandées depuis la page Admin (config/app :
  // onboardingSurvey, onboardingTour) et sont FERMÉES par défaut : tant que
  // rien n'est activé, aucun membre ne voit quoi que ce soit, même déjà
  // inscrit. Une fois activées, elles s'appliquent aussi aux comptes existants
  // qui n'ont pas encore répondu.
  async function maybeStart(uid) {
    if (window.IS_DEMO || !uid || !db) return;

    let cfg = {};
    try { cfg = await _getAppConfig(); } catch (_) { return; }
    const surveyOn = cfg.onboardingSurvey === true;
    const tourOn   = cfg.onboardingTour === true;

    // « Revoir la visite guidée » n'apparaît dans le menu que si la visite est
    // ouverte : une entrée qui lance un parcours que personne n'a jamais vu
    // n'aurait aucun sens.
    const btn = document.getElementById('btn-replay-tour');
    if (btn) btn.style.display = tourOn ? '' : 'none';

    if (!surveyOn && !tourOn) return;
    // L'admin garde l'entrée de menu mais n'est jamais interrompu : il déclenche
    // les parcours quand il veut, depuis sa page.
    try { if (typeof isAdmin === 'function' && isAdmin()) return; } catch (_) {}

    let p;
    try { p = await readProfile(uid); }
    catch (_) { return; } // pas de confirmation serveur → on ne montre rien

    const doitRepondre = surveyOn && !p.completedAt
      && (!p.skippedAt || (Date.now() - p.skippedAt > RELANCE_MS && (p.skipCount || 0) < 2));

    if (doitRepondre) { openQuestionnaire(uid, p, { tourEnsuite: tourOn }); return; }
    if (!tourOn) return;

    let tourVu = !!(p.tourDoneAt || p.tourSkippedAt);
    try { tourVu = tourVu || localStorage.getItem(LS_TOUR) === '1'; } catch (_) {}
    if (!tourVu) startTour(uid);
  }

  // ── Questionnaire : rendu ─────────────────────────────────────────────────
  // opts.test : rien n'est écrit dans Firestore, et un bandeau le dit. C'est le
  // mode utilisé depuis la page Admin pour juger le parcours sans se compter
  // soi-même dans les réponses ni se fermer la porte à un second essai.
  function openQuestionnaire(uid, profil, opts) {
    const o = opts || {};
    const test = o.test === true;
    const tourEnsuite = o.tourEnsuite !== false;
    const answers = {};
    let step = 0;

    const ov = document.createElement('div');
    ov.className = 'ob-overlay';
    ov.id = 'ob-questionnaire';
    ov.innerHTML = '<div class="ob-card" role="dialog" aria-modal="true" aria-label="Questionnaire de bienvenue"></div>';
    document.body.appendChild(ov);
    const card = ov.querySelector('.ob-card');

    const close = () => ov.remove();

    function render() {
      const qn = QUESTIONS[step];
      const val = answers[qn.key];
      const choisi = (v) => (qn.multi ? (val || []).includes(v) : val === v);

      card.innerHTML =
        (test ? '<div class="ob-test">Mode test — aucune réponse n’est enregistrée</div>' : '')
        + '<div class="ob-head">'
        +   '<div class="ob-eyebrow">Votre profil <b>' + pad(step + 1) + '</b><s></s><span>' + pad(QUESTIONS.length) + '</span></div>'
        +   '<button class="ob-link ob-skip" type="button">Plus tard</button>'
        + '</div>'
        + rail(step)
        + '<div class="ob-body">'
        +   '<h2 class="ob-q">' + qn.title + '</h2>'
        +   (qn.hint ? '<p class="ob-hint">' + qn.hint + '</p>' : '')
        +   '<div class="ob-options' + (qn.multi ? ' ob-multi' : '') + '">'
        +     qn.options.map(([v, label, sub], i) =>
                '<button type="button" class="ob-opt' + (choisi(v) ? ' on' : '') + '" data-v="' + v + '"'
                + ' style="--d:' + (i * 28) + 'ms">'
                + '<span class="ob-tick"></span>'
                + '<span class="ob-opt-txt"><span class="ob-opt-l">' + label + '</span>'
                + (sub ? '<span class="ob-opt-s">' + sub + '</span>' : '') + '</span>'
                + '</button>').join('')
        +   '</div>'
        + '</div>'
        + fiche(step)
        + '<div class="ob-foot">'
        +   (step > 0 ? '<button type="button" class="ob-ghost ob-back">Retour</button>' : '<span></span>')
        +   '<button type="button" class="ob-cta ob-next"' + (estRepondu(qn) ? '' : ' disabled') + '>'
        +     (step === QUESTIONS.length - 1 ? 'Terminer' : 'Suivant') + '</button>'
        + '</div>';

      card.querySelectorAll('.ob-opt').forEach((b) => {
        b.onclick = () => {
          const v = b.dataset.v;
          if (qn.multi) {
            const cur = new Set(answers[qn.key] || []);
            // « Rien pour l'instant » est exclusif : le cocher avec un PEA ne
            // voudrait rien dire.
            if (v === 'rien') { cur.clear(); cur.add('rien'); }
            else { cur.delete('rien'); cur.has(v) ? cur.delete(v) : cur.add(v); }
            answers[qn.key] = [...cur];
            render();
          } else {
            answers[qn.key] = v;
            // Choix unique : on avance sans faire cliquer « Suivant ».
            setTimeout(next, 140);
            render();
          }
        };
      });
      const back = card.querySelector('.ob-back');
      if (back) back.onclick = () => { step--; render(); };
      card.querySelector('.ob-next').onclick = next;
      card.querySelector('.ob-skip').onclick = plusTard;
    }

    const estRepondu = (qn) => (qn.multi ? (answers[qn.key] || []).length > 0 : !!answers[qn.key]);

    const pad = (n) => String(n).padStart(2, '0');

    // Six segments plutôt qu'une barre pleine : on lit d'un coup combien de
    // questions restent, ce qu'un pourcentage ne dit pas.
    const rail = (i) => '<div class="ob-rail" aria-hidden="true">'
      + QUESTIONS.map((_, k) => '<i class="' + (k < i ? 'done' : k === i ? 'now' : '') + '"></i>').join('')
      + '</div>';

    // Le libellé d'une valeur, tel qu'il a été proposé.
    const libelle = (qn, v) => {
      const o = qn.options.find((x) => x[0] === v);
      return o ? o[1] : v;
    };

    // Les réponses déjà données s'empilent sous la question : le questionnaire
    // construit une fiche à vue, au lieu d'avaler les réponses une à une.
    const fiche = (i) => {
      const lignes = QUESTIONS.slice(0, i)
        .filter((qn) => estRepondu(qn))
        .map((qn) => {
          const v = answers[qn.key];
          const txt = qn.multi ? v.map((x) => libelle(qn, x)).join(', ') : libelle(qn, v);
          return '<span class="ob-chip"><b>' + qn.short + '</b>' + txt + '</span>';
        });
      return lignes.length ? '<div class="ob-fiche">' + lignes.join('') + '</div>' : '';
    };

    function next() {
      if (!estRepondu(QUESTIONS[step])) return;
      if (step < QUESTIONS.length - 1) { step++; render(); return; }
      termine();
    }

    async function termine() {
      // Écran de fin : la fiche assemblée. C'est ce que les six questions
      // fabriquaient, autant la rendre.
      const lignes = QUESTIONS.map((qn) => {
        const v = answers[qn.key];
        if (!v || (qn.multi && !v.length)) return '';
        const txt = qn.multi ? v.map((x) => libelle(qn, x)).join(' · ') : libelle(qn, v);
        return '<div class="ob-sheet-row"><span>' + qn.short + '</span><b>' + txt + '</b></div>';
      }).join('');

      card.innerHTML = (test ? '<div class="ob-test">Mode test — rien n’a été enregistré</div>' : '')
        + '<div class="ob-head"><div class="ob-eyebrow">Votre profil <b>' + pad(QUESTIONS.length) + '</b><s></s><span>' + pad(QUESTIONS.length) + '</span></div></div>'
        + rail(QUESTIONS.length)
        + '<div class="ob-body">'
        +   '<h2 class="ob-q">C’est noté.</h2>'
        +   '<div class="ob-sheet">' + lignes + '</div>'
        +   '<p class="ob-hint">' + (tourEnsuite
              ? 'Ces réponses orientent ce que nous construisons ensuite. On vous fait visiter ?'
              : 'Ces réponses orientent ce que nous construisons ensuite.') + '</p>'
        + '</div>'
        + '<div class="ob-foot">'
        +   (tourEnsuite ? '<button type="button" class="ob-ghost" id="ob-no-tour">Plus tard</button>' : '<span></span>')
        +   '<button type="button" class="ob-cta" id="ob-yes-tour">'
        +     (tourEnsuite ? 'Visiter l’app' : 'Terminer') + '</button>'
        + '</div>';
      if (!test) {
        save(uid, { ...answers, completedAt: Date.now() }).catch((e) => console.warn('[onboarding] save:', e.message));
      } else {
        console.log('[onboarding] test — réponses non enregistrées :', answers);
      }
      card.querySelector('#ob-yes-tour').onclick = () => {
        close();
        if (tourEnsuite) startTour(uid, { test });
      };
      const non = card.querySelector('#ob-no-tour');
      if (non) non.onclick = () => { close(); if (!test) markTour(uid, 'tourSkippedAt'); };
    }

    function plusTard() {
      close();
      if (!test) {
        save(uid, { skippedAt: Date.now(), skipCount: (profil.skipCount || 0) + 1 })
          .catch((e) => console.warn('[onboarding] skip:', e.message));
      }
      // La visite, elle, reste proposée : elle ne demande rien à personne.
      if (!tourEnsuite) return;
      let tourVu = !!(profil.tourDoneAt || profil.tourSkippedAt);
      try { tourVu = tourVu || localStorage.getItem(LS_TOUR) === '1'; } catch (_) {}
      if (test || !tourVu) setTimeout(() => startTour(uid, { test }), 400);
    }

    render();
  }

  // ── Visite guidée : rendu ─────────────────────────────────────────────────
  let tourEtat = null;
  const replace = () => place(false);

  function markTour(uid, champ) {
    try { localStorage.setItem(LS_TOUR, '1'); } catch (_) {}
    if (uid && db) save(uid, { [champ]: Date.now() }).catch(() => {});
  }

  function startTour(uid, opts) {
    if (tourEtat) return;
    const test = !!(opts && opts.test);
    const ov = document.createElement('div');
    ov.className = 'ob-tour';
    // Le viseur : anneau + quatre équerres. Deux éléments, quatre coins — un
    // seul bloc ne peut pas porter plus de deux pseudo-éléments.
    ov.innerHTML =
      '<div class="ob-spot"><i></i><u></u></div>'
      + '<div class="ob-tip" role="dialog" aria-live="polite">'
      +   '<span class="ob-tip-arrow"></span>'
      +   (test ? '<div class="ob-test">Mode test</div>' : '')
      +   '<div class="ob-tip-step"></div>'
      +   '<div class="ob-tip-title"></div>'
      +   '<div class="ob-tip-text"></div>'
      +   '<div class="ob-tip-foot">'
      +     '<button type="button" class="ob-link ob-tip-skip">Passer</button>'
      +     '<div class="ob-tip-nav">'
      +       '<button type="button" class="ob-ghost ob-tip-prev">Retour</button>'
      +       '<button type="button" class="ob-cta ob-tip-next">Suivant</button>'
      +     '</div>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(ov);

    tourEtat = { uid, test, i: 0, ov, spot: ov.querySelector('.ob-spot'), tip: ov.querySelector('.ob-tip'), raf: 0 };

    ov.querySelector('.ob-tip-skip').onclick = () => endTour('tourSkippedAt');
    ov.querySelector('.ob-tip-prev').onclick = () => go(tourEtat.i - 1);
    ov.querySelector('.ob-tip-next').onclick = () => go(tourEtat.i + 1);
    // Handler nommé : passé directement, l'événement deviendrait l'argument
    // `amener` de place() et relancerait un recentrage à chaque défilement.
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', replace);
    window.addEventListener('scroll', replace, true);

    go(0);
  }

  function onKey(e) {
    if (!tourEtat) return;
    if (e.key === 'Escape') endTour('tourSkippedAt');
    if (e.key === 'ArrowRight') go(tourEtat.i + 1);
    if (e.key === 'ArrowLeft') go(tourEtat.i - 1);
  }

  function go(i) {
    if (!tourEtat) return;
    if (i < 0) return;
    if (i >= STEPS.length) { endTour('tourDoneAt'); return; }
    tourEtat.i = i;
    const s = STEPS[i];
    // Certaines étapes vivent sur une page précise : on y va d'abord.
    if (s.page && typeof showPage === 'function') {
      try { showPage(s.page); } catch (_) {}
    }
    const { tip } = tourEtat;
    tip.querySelector('.ob-tip-step').innerHTML =
      'Étape <b>' + String(i + 1).padStart(2, '0') + '</b><s></s><span>' + String(STEPS.length).padStart(2, '0') + '</span>';
    tip.querySelector('.ob-tip-title').textContent = s.title;
    tip.querySelector('.ob-tip-text').textContent = s.text;
    tip.querySelector('.ob-tip-prev').style.visibility = i === 0 ? 'hidden' : 'visible';
    tip.querySelector('.ob-tip-next').textContent = i === STEPS.length - 1 ? 'Terminer' : 'Suivant';
    // Laisse la page changer d'onglet avant de mesurer la cible.
    setTimeout(() => place(true), 60);
  }

  // Position du trou et de la bulle. Le trou est un simple bloc au-dessus du
  // voile, avec une ombre portée de 9999px : pas de masque SVG à recalculer,
  // et le fond reste net à l'intérieur.
  // `amener` n'est vrai qu'au changement d'étape : replacer la bulle à chaque
  // événement de défilement ET amener la cible à l'écran s'entretiendrait
  // l'un l'autre — scroll → recentrage → scroll.
  function place(amener) {
    if (!tourEtat) return;
    cancelAnimationFrame(tourEtat.raf);
    tourEtat.raf = requestAnimationFrame(() => {
      const s = STEPS[tourEtat.i];
      const el = s.target();
      const { spot, tip } = tourEtat;

      if (!el) { // cible absente (section masquée par les réglages) : on saute
        spot.style.opacity = '0';
        tip.style.left = '50%'; tip.style.top = '50%';
        tip.style.transform = 'translate(-50%, -50%)';
        return;
      }
      if (amener) el.scrollIntoView({ block: 'center', behavior: 'auto' });
      const r = el.getBoundingClientRect();
      const pad = 6;
      spot.style.opacity = '1';
      spot.style.left   = (r.left - pad) + 'px';
      spot.style.top    = (r.top - pad) + 'px';
      spot.style.width  = (r.width + pad * 2) + 'px';
      spot.style.height = (r.height + pad * 2) + 'px';

      // La bulle se pose sous la cible, ou au-dessus si le bas manque de place.
      const tr = tip.getBoundingClientRect();
      const vh = window.innerHeight, vw = window.innerWidth;
      const dessous = r.bottom + 16 + tr.height < vh - 12;
      const top = dessous ? r.bottom + 16 : Math.max(12, r.top - tr.height - 16);
      let left = r.left + r.width / 2 - tr.width / 2;
      left = Math.max(12, Math.min(left, vw - tr.width - 12));
      tip.style.transform = 'none';
      tip.style.left = left + 'px';
      tip.style.top  = Math.min(top, vh - tr.height - 12) + 'px';
      tip.classList.toggle('ob-below', dessous);
      tip.classList.toggle('ob-above', !dessous);
      // La flèche vise le centre de la cible, pas le centre de la bulle : sur
      // mobile la bulle occupe toute la largeur, les deux n'ont rien à voir.
      const fleche = tip.querySelector('.ob-tip-arrow');
      if (fleche) {
        const cible = r.left + r.width / 2;
        const x = Math.max(18, Math.min(cible - tip.getBoundingClientRect().left, tr.width - 18));
        fleche.style.left = x + 'px';
      }
    });
  }

  function endTour(champ) {
    if (!tourEtat) return;
    const { uid, ov, test } = tourEtat;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', replace);
    window.removeEventListener('scroll', replace, true);
    cancelAnimationFrame(tourEtat.raf);
    ov.remove();
    tourEtat = null;
    if (!test) markTour(uid, champ);
  }

  // ── API publique ──────────────────────────────────────────────────────────
  window.CBOnboarding = {
    maybeStart,
    // Relance manuelle depuis le menu : la visite se rejoue même une fois vue.
    replayTour() {
      try { localStorage.removeItem(LS_TOUR); } catch (_) {}
      startTour(typeof currentUser !== 'undefined' ? currentUser : null);
    },
    // Questionnaire à la demande (profil déjà rempli : les réponses écrasent).
    openQuestionnaire(uid) { openQuestionnaire(uid || currentUser, {}); },
    // Essais depuis la page Admin : parcours complet, aucune écriture, et le
    // drapeau global n'a pas besoin d'être activé.
    testSurvey() { openQuestionnaire(currentUser, {}, { test: true, tourEnsuite: true }); },
    testTour()   { startTour(currentUser, { test: true }); },
  };
  window.replayGuidedTour = () => window.CBOnboarding.replayTour();

})();
