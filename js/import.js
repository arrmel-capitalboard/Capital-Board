// ═══════════════════════════════════════════════════════════════════════════
//  IMPORT DE RELEVÉS — socle commun
//
//  Note de conception : afaire-import.md. Le constat qui a déclenché ce module :
//  pour qu'un seul Livret Jeune tombe juste il faut saisir cinquante lignes.
//  Personne ne le fera, et le calcul, lui, est déjà juste — ce qui coûte, c'est
//  de le nourrir.
//
//  Trois voies, par ordre d'exactitude :
//    CSV   — le relevé exporté par la banque. Exact, trivial à lire.
//    PDF   — le relevé mensuel ou annuel. Exact, un adaptateur par banque.
//    Image — une capture d'écran, lue par OCR. À relire ligne par ligne.
//
//  LE POINT QUI NE SE NÉGOCIE PAS
//  Un relevé bancaire est plus intime qu'une ligne d'ETF.
//    • un CSV ou un PDF est lu dans le navigateur et n'est JAMAIS téléversé ;
//    • une image, elle, doit sortir : un navigateur ne déchiffre pas des pixels
//      seul. Elle part au Worker, qui la donne à un modèle de vision de Workers
//      AI, et le membre doit y consentir avant le premier envoi ;
//    • rien n'est conservé, aucune copie, aucun cache, aucun journal ;
//    • seules les lignes cochées par le membre sont écrites.
//  Ces points sont affichés sur l'écran d'import, pas seulement dans les CGU,
//  et la différence entre fichier et image y est dite : c'est ce qui fait
//  accepter le dépôt d'un relevé.
//
//  Chargé après app.js, dont il utilise les globales (_depParse, _attr…).
// ═══════════════════════════════════════════════════════════════════════════

window.CBImport = (function () {
  'use strict';

  // Destination courante. Posée par open(), oubliée à la fermeture — rien de ce
  // qui vient du fichier ne survit à ce module.
  let _dest   = null;
  let _lignes = [];     // { d, m, label, ok }
  let _taux   = [];     // { depuis, taux } lus dans les libellés du relevé
  let _fiche  = null;   // caractéristiques lues sur une capture de fiche
  // Rattrapage manuel : le texte du fichier et les colonnes désignées. Vivent
  // en mémoire le temps de l'écran, relâchés à la fermeture.
  let _texte  = null;
  let _cols   = null;
  let _echecs = [];     // fichiers d'un lot qui n'ont pas pu être lus
  let _source = '';     // nom du parseur qui a produit les lignes, pour l'entête

  // ─── Ouverture ───────────────────────────────────────────────────────────
  //
  // dest = {
  //   titre    : titre du modal
  //   sous     : sous-titre
  //   existant : [{ d, m }] déjà saisis, pour signaler les doublons
  //   onValider: (lignes, taux) => void
  //              lignes = [{ d, m, label }] cochées
  //              taux   = [{ depuis, taux }] lus dans les libellés du relevé
  //   classerFiche: (fiche) => fiche
  //              Remet les compartiments dans l'ordre avant l'affichage. Le
  //              socle lit les blocs dans l'ordre du texte, qui n'est pas
  //              toujours celui du produit : seul le module appelant a le
  //              barème pour dire lequel est le livret et lequel son
  //              dépassement. Sans cette passe, l'écran de validation
  //              annonçait « fiche du livret » sur le compartiment à 0,30 %.
  // }
  function open(dest) {
    _dest   = dest || {};
    _lignes = [];
    _taux   = [];
    _fiche  = null;
    _texte  = null;
    _cols   = null;
    _echecs = [];
    _source = '';
    fermerApercu();
    _libererApercus();
    _text('imp-title', _dest.titre || 'Importer un relevé');
    _text('imp-sub',   _dest.sous  || '');
    _etape('depot');
    _text('imp-erreur', '');
    _hide('imp-erreur', true);
    const modal = document.getElementById('imp-modal');
    if (modal) modal.classList.add('open');
  }

  function close() {
    const modal = document.getElementById('imp-modal');
    if (modal) modal.classList.remove('open');
    // Le fichier n'est jamais conservé : on relâche tout à la fermeture.
    _dest   = null;
    _lignes = [];
    _taux   = [];
    _fiche  = null;
    _texte  = null;
    _cols   = null;
    _echecs = [];
    _source = '';
    fermerApercu();
    _libererApercus();
    const input = document.getElementById('imp-file');
    if (input) input.value = '';
  }

  // ─── Réception du fichier ────────────────────────────────────────────────

  function onFile(ev) {
    const fs = ev && ev.target && ev.target.files;
    if (fs && fs.length) lireLot(Array.from(fs));
    if (ev && ev.target) ev.target.value = '';   // mêmes fichiers redéposables
  }

  function onDrop(ev) {
    ev.preventDefault();
    _dragOff();
    const fs = ev.dataTransfer && ev.dataTransfer.files;
    if (fs && fs.length) lireLot(Array.from(fs));
  }

  function onDragOver(ev) {
    ev.preventDefault();
    const z = document.getElementById('imp-drop');
    if (z) z.classList.add('over');
  }
  function _dragOff() {
    const z = document.getElementById('imp-drop');
    if (z) z.classList.remove('over');
  }

  // Aiguillage sur l'extension, puis sur le type MIME — un CSV exporté par une
  // banque remonte parfois en application/vnd.ms-excel.
  async function _lireUn(file, progres) {
    const nom = (file.name || '').toLowerCase();
    const ext = nom.slice(nom.lastIndexOf('.') + 1);
    const mime = file.type || '';

    if (ext === 'csv' || ext === 'txt' || ext === 'tsv' ||
        mime === 'text/csv' || mime.indexOf('excel') >= 0 || mime.indexOf('spreadsheet') >= 0) {
      _source = 'CSV';
      return window.CBImport.csv.lire(file);
    }
    if (ext === 'pdf' || mime === 'application/pdf') {
      if (!window.CBImport.pdf) throw new Error('La lecture des PDF n’est pas encore disponible.');
      _source = 'PDF';
      return window.CBImport.pdf.lire(file, progres);
    }
    if (mime.indexOf('image/') === 0 || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      if (!window.CBImport.ocr) throw new Error('La lecture des captures n’est pas encore disponible.');
      _source = 'capture';
      return window.CBImport.ocr.lire(file, progres);
    }
    throw new Error('Format non reconnu. Déposez un CSV, un PDF ou une capture d’écran.');
  }

  /**
   * Lecture d'un lot. Les captures d'un relevé mobile arrivent par dizaines —
   * une par écran — et un historique complet tient souvent en plusieurs
   * exports. Les traiter un par un serait une corvée sans objet.
   *
   * Les fichiers sont lus l'un après l'autre, jamais en parallèle : la lecture
   * d'une image passe par le serveur, et dix appels simultanés se feraient
   * refuser par le limiteur de débit.
   */
  /**
   * Deux fiches lues dans un même lot.
   *
   * Le plus souvent, deux captures du même écran, dont l'une a été lue de
   * travers : la première prime, la seconde comble ses trous. Mais un livret
   * peut aussi avoir deux compartiments, photographiés séparément — et là, un
   * plafond ou un taux qui diffère n'est pas une correction à ignorer, c'est un
   * autre étage à conserver. Lequel est le réglementé n'est pas tranché ici :
   * seul le module qui connaît le type de livret a le barème pour le dire.
   */
  function _fusionnerFiches(a, b) {
    if (!a) return Object.assign({}, b);
    const conflit = ['plafond', 'taux'].some(k =>
      a[k] !== undefined && b[k] !== undefined && a[k] !== b[k]);
    if (conflit) {
      const sur = Object.assign({}, a.sur || b.sur || b);
      delete sur.sur;
      return Object.assign({}, a, { sur });
    }
    const out = Object.assign({}, b, a);
    const sur = a.sur || b.sur;
    if (sur) out.sur = sur;
    return out;
  }

  /**
   * Aperçus des images déposées.
   *
   * Une capture d'écran de banque se ressemble d'un mois à l'autre : sans la
   * voir, on ne sait pas laquelle est en train d'être lue, ni laquelle a donné
   * telle ligne à l'écran de validation. Les vignettes vivent le temps de la
   * modale — ce sont des URL d'objet, pas des copies, et elles sont relâchées
   * à la fermeture.
   */
  let _apercus = [];

  function _libererApercus() {
    _apercus.forEach(a => { try { URL.revokeObjectURL(a.url); } catch (_) {} });
    _apercus = [];
  }

  function _apercuLecture(file) {
    const box = document.getElementById('imp-lecture-img');
    if (!box) return;
    const image = file && String(file.type || '').startsWith('image/');
    box.hidden = !image;
    box.innerHTML = '';
    if (!image) return;
    const url = URL.createObjectURL(file);
    _apercus.push({ nom: file.name || 'capture', url });
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    box.appendChild(img);
  }

  // Bande de vignettes sous l'écran de validation : de quoi revenir sur ce
  // qu'on a déposé pendant qu'on coche les lignes.
  function _rendreApercus() {
    const box = document.getElementById('imp-apercus');
    if (!box) return;
    box.hidden = !_apercus.length;
    if (!_apercus.length) { box.innerHTML = ''; return; }
    box.innerHTML =
      '<div class="imp-apercus-t">' + _apercus.length +
        (_apercus.length > 1 ? ' images déposées' : ' image déposée') + '</div>' +
      '<div class="imp-apercus-l">' + _apercus.map((a, i) =>
        '<button type="button" class="imp-vignette" onclick="CBImport.voirApercu(' + i + ')" ' +
          'title="' + _attr(a.nom) + '"><img src="' + _attr(a.url) + '" alt=""></button>'
      ).join('') + '</div>';
  }

  // Agrandissement : la vignette ne suffit pas à relire un montant.
  function voirApercu(i) {
    const a = _apercus[i];
    const box = document.getElementById('imp-zoom');
    if (!a || !box) return;
    box.innerHTML = '<img src="' + _attr(a.url) + '" alt="' + _attr(a.nom) + '">';
    box.hidden = false;
  }
  function fermerApercu() {
    const box = document.getElementById('imp-zoom');
    if (!box) return;
    box.hidden = true;
    box.innerHTML = '';
  }

  async function lireLot(files) {
    _etape('lecture');
    const tout = [];
    const taux = [];
    let fiche = null, report = null;
    const echecs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rang = files.length > 1 ? ' (' + (i + 1) + ' sur ' + files.length + ')' : '';
      _text('imp-lecture-nom', (file.name || 'fichier') + rang);
      _text('imp-lecture-etat', 'Lecture en cours…');
      _apercuLecture(file);

      let res;
      try {
        res = await _lireUn(file, m => _text('imp-lecture-etat', m + rang));
      } catch (e) {
        console.error('[import]', file.name, e);
        echecs.push((file.name || 'fichier') + ' — ' + ((e && e.message) || 'lecture impossible'));
        continue;
      }

      // Colonnes non reconnues : on ne peut demander au membre de les désigner
      // que pour un fichier à la fois. Seul, il passe à l'écran de rattrapage ;
      // au milieu d'un lot, il est signalé et laissé de côté.
      if (res && res.colonnesInconnues && res.texte) {
        if (files.length === 1) {
          _texte = res.texte;
          _rendreColonnes();
          _etape('colonnes');
          return;
        }
        echecs.push((file.name || 'fichier') + ' — colonnes non reconnues, à déposer seul');
        continue;
      }

      (res.lignes || []).forEach(l => tout.push(Object.assign({ _f: i }, l)));
      (res.taux  || []).forEach(t => taux.push(t));
      // Une seule fiche : la première rencontrée, complétée par les suivantes.
      if (res.fiche) fiche = _fusionnerFiches(fiche, res.fiche);
      // Un seul report, le plus ancien. Celui d'un fichier plus récent
      // recouvrirait des opérations déjà apportées par un autre.
      if (res.report && isFinite(res.report.m) && res.report.m !== 0 &&
          (!report || res.report.d < report.d)) {
        report = res.report;
      }
    }

    _taux  = _dedoublonnerTaux(taux);
    // Classement avant affichage : ce que l'écran annonce doit être ce qui sera
    // enregistré. Une erreur du module appelant ne doit pas faire perdre la
    // lecture, d'où le repli sur la fiche brute.
    if (fiche && typeof _dest.classerFiche === 'function') {
      try { fiche = _dest.classerFiche(fiche) || fiche; }
      catch (e) { console.warn('[import] classement de la fiche:', e && e.message); }
    }
    _fiche = fiche;

    const lignes = _fusionner(tout);
    if (report) lignes.unshift(Object.assign({ report: true }, report));

    if (!lignes.length && !_taux.length && !_fiche) {
      _etape('depot');
      _hide('imp-erreur', false);
      // Un échec de lecture ne doit pas être un cul-de-sac. Le formulaire est
      // derrière, intact : on le dit, et on donne le bouton pour y retourner.
      // Sans lui, la seule issue visible est « Annuler », qui donne
      // l'impression d'avoir perdu la saisie en cours.
      const el = document.getElementById('imp-erreur');
      if (el) {
        el.innerHTML =
          '<div>' + _esc(echecs.length
            ? echecs.join('\n')
            : 'Rien n’a pu être lu. Vérifiez que le fichier est bien un relevé, ' +
              'avec une date et un montant par ligne — ou qu’une capture montre ' +
              'l’écran des opérations ou celui des caractéristiques du livret.') + '</div>' +
          '<button type="button" class="imp-erreur-main" onclick="CBImport.close()">' +
          'Saisir à la main</button>';
      }
      return;
    }

    // Les plus anciennes d'abord : c'est l'ordre dans lequel elles seront
    // saisies, et celui du calcul par quinzaines.
    lignes.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    _lignes = lignes.map(l => Object.assign({}, l, { ok: !l.doublon }));
    _echecs = echecs;
    _rendre();
    _etape('validation');
  }

  /**
   * Fusion de plusieurs fichiers qui se recouvrent.
   *
   * Le piège : un relevé porte légitimement plusieurs fois la même opération —
   * trois virements de 200 € le même jour, cela existe. Écarter les doublons
   * par (date, montant) en supprimerait deux.
   *
   * On compte donc les occurrences PAR FICHIER, et on retient le maximum
   * observé dans un seul d'entre eux. Deux exports qui se chevauchent
   * rapportent les mêmes trois lignes : on en garde trois, pas six. Deux
   * exports disjoints ne partagent aucune clé, et rien n'est perdu.
   */
  function _fusionner(lignes) {
    const parFichier = {};   // clé -> { fichier -> nombre }
    lignes.forEach(l => {
      const k = l.d + '|' + Number(l.m).toFixed(2);
      (parFichier[k] = parFichier[k] || {});
      parFichier[k][l._f] = (parFichier[k][l._f] || 0) + 1;
    });

    const quota = {};
    Object.keys(parFichier).forEach(k => {
      quota[k] = Math.max.apply(null, Object.values(parFichier[k]));
    });

    const pris = {}, out = [];
    lignes.forEach(l => {
      const k = l.d + '|' + Number(l.m).toFixed(2);
      pris[k] = (pris[k] || 0);
      if (pris[k] >= quota[k]) return;
      pris[k]++;
      const copie = Object.assign({}, l);
      delete copie._f;
      out.push(copie);
    });
    return out;
  }

  // ─── Écran de rattrapage : désigner les colonnes ─────────────────────────
  //
  // Le filet de sécurité qui rend l'import indépendant de la banque. Aucun
  // dictionnaire ne couvrira tous les établissements, et écrire un adaptateur
  // par banque est une course perdue. Ici le membre voit son fichier tel qu'il
  // est découpé et dit lui-même ce qu'est chaque colonne.

  const ROLES = [
    ['',        '—'],
    ['date',    'Date'],
    ['label',   'Libellé'],
    ['montant', 'Montant'],
    ['debit',   'Débit'],
    ['credit',  'Crédit'],
    ['solde',   'Solde'],
  ];

  function _rendreColonnes() {
    const box = document.getElementById('imp-cols');
    if (!box || !_texte) return;
    const ap = window.CBImport.csv.apercu(_texte);
    if (!ap) return;

    // Proposition de départ : la première ligne qui ressemble à des données,
    // et des rôles devinés sur le contenu de chaque colonne.
    if (!_cols) {
      _cols = { date: -1, label: -1, montant: -1, debit: -1, credit: -1, solde: -1,
                depuis: ap.entete ? 1 : 0 };
      for (let c = 0; c < ap.colonnes; c++) {
        const vals = ap.table.slice(ap.entete ? 1 : 0).map(r => r[c]);
        if (_cols.date === -1 && vals.some(v => window.CBImport.csv.parseDate(v))) { _cols.date = c; continue; }
        if (_cols.montant === -1 && vals.some(v => isFinite(window.CBImport.csv.parseMontant(v)))) { _cols.montant = c; continue; }
        if (_cols.label === -1 && vals.some(v => String(v || '').length > 4)) _cols.label = c;
      }
    }

    const roleDe = (c) => {
      for (const [cle] of ROLES) { if (cle && _cols[cle] === c) return cle; }
      return '';
    };

    const entetes = Array.from({ length: ap.colonnes }, (_, c) =>
      '<th><select onchange="CBImport.setColonne(' + c + ',this.value)">' +
      ROLES.map(([cle, lib]) =>
        '<option value="' + cle + '"' + (roleDe(c) === cle ? ' selected' : '') + '>' +
        _esc(lib) + '</option>').join('') +
      '</select></th>').join('');

    const corps = ap.table.map((r, i) =>
      '<tr' + (i < _cols.depuis ? ' class="ignoree"' : '') + '>' +
      Array.from({ length: ap.colonnes }, (_, c) =>
        '<td>' + _esc(String(r[c] === undefined ? '' : r[c]).slice(0, 22)) + '</td>').join('') +
      '</tr>').join('');

    box.innerHTML =
      '<div class="imp-cols-scroll"><table class="imp-cols-t">' +
        '<thead><tr>' + entetes + '</tr></thead><tbody>' + corps + '</tbody></table></div>';

    _text('imp-cols-etat', _colonnesCompletes()
      ? 'Prêt : ' + (_cols.depuis ? _cols.depuis + ' ligne(s) d’entête ignorée(s)' : 'aucune entête à ignorer')
      : 'Désignez au moins la colonne Date et une colonne de montant.');
    const btn = document.getElementById('imp-cols-ok');
    if (btn) btn.disabled = !_colonnesCompletes();
    const saut = document.getElementById('imp-cols-depuis');
    if (saut) saut.value = String(_cols.depuis);
  }

  function _colonnesCompletes() {
    return !!_cols && _cols.date >= 0 &&
      (_cols.montant >= 0 || _cols.debit >= 0 || _cols.credit >= 0);
  }

  // Un rôle ne vaut que pour une colonne : le poser ailleurs le libère.
  function setColonne(c, role) {
    if (!_cols) return;
    ROLES.forEach(([cle]) => { if (cle && _cols[cle] === c) _cols[cle] = -1; });
    if (role) _cols[role] = c;
    _rendreColonnes();
  }

  function setDepuis(v) {
    if (!_cols) return;
    const n = parseInt(v, 10);
    _cols.depuis = Number.isFinite(n) && n >= 0 ? n : 0;
    _rendreColonnes();
  }

  function relire() {
    if (!_texte || !_colonnesCompletes()) return;
    const res = window.CBImport.csv.analyser(_texte, _cols);
    const lignes = (res && res.lignes) || [];
    if (!lignes.length) {
      _text('imp-cols-etat', 'Aucune opération lue avec ces colonnes. ' +
        'Vérifiez la colonne Date et la première ligne de données.');
      return;
    }
    _taux  = _dedoublonnerTaux((res && res.taux) || []);
    _fiche = null;
    _echecs = [];
    if (res.report && isFinite(res.report.m) && res.report.m !== 0) {
      lignes.unshift(Object.assign({ report: true }, res.report));
    }
    lignes.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    _lignes = lignes.map(l => Object.assign({}, l, { ok: !l.doublon }));
    _rendre();
    _etape('validation');
  }

  // ─── Écran de validation ─────────────────────────────────────────────────

  function _rendre() {
    const existant = (_dest && _dest.existant) || [];
    // Doublon = même date et même montant au centime. Un relevé rechargé après
    // coup ne doit pas doubler ce qui est déjà saisi.
    const vus = new Set(existant.map(m => m.d + '|' + Number(m.m).toFixed(2)));
    _lignes.forEach(l => { l.doublon = vus.has(l.d + '|' + Number(l.m).toFixed(2)); });

    const box = document.getElementById('imp-rows');
    if (!box) return;
    box.innerHTML = _lignes.map((l, i) =>
      '<div class="imp-row' + (l.doublon ? ' doublon' : '') + '">' +
        '<label class="imp-chk">' +
          '<input type="checkbox" ' + (l.ok ? 'checked' : '') +
            ' onchange="CBImport.setOk(' + i + ',this.checked)">' +
          '<span></span>' +
        '</label>' +
        '<input class="imp-d" type="date" value="' + _attr(l.d) + '"' +
          ' onchange="CBImport.set(' + i + ',\'d\',this.value)">' +
        '<span class="imp-lab" title="' + _attr(l.label || '') + '">' +
          _esc(l.label || '—') +
          (l.report  ? '<i class="imp-tag report">solde d’ouverture</i>' : '') +
          (l.doublon ? '<i class="imp-tag">déjà saisi</i>' : '') +
        '</span>' +
        '<input class="imp-m' + (l.m < 0 ? ' neg' : '') + '" type="text" inputmode="decimal"' +
          ' value="' + _attr(_fmtMontant(l.m)) + '"' +
          ' onchange="CBImport.set(' + i + ',\'m\',this.value)">' +
      '</div>'
    ).join('');
    _rendreTaux();
    _rendreFiche();
    _rendreApercus();
    _rendreEchecs();
    _majPied();
  }

  // Un fichier illisible au milieu d'un lot ne doit pas passer inaperçu : le
  // membre croirait avoir tout importé.
  function _rendreEchecs() {
    const box = document.getElementById('imp-echecs');
    if (!box) return;
    box.hidden = !_echecs.length;
    if (!_echecs.length) return;
    box.innerHTML =
      '<div class="imp-echecs-t">' + _echecs.length +
        ' fichier' + (_echecs.length > 1 ? 's' : '') + ' non lu' +
        (_echecs.length > 1 ? 's' : '') + '</div>' +
      '<ul>' + _echecs.map(e => '<li>' + _esc(e) + '</li>').join('') + '</ul>';
  }

  // Étiquettes des caractéristiques lues sur une capture de fiche, dans l'ordre
  // où elles comptent : les deux chiffres qu'aucun calcul ne reproduit d'abord.
  const FICHE_LIB = [
    ['acquis',    'Intérêts à ce jour', '€'],
    ['projete',   'Intérêts prévisionnels', '€'],
    ['taux',      'Taux', '%'],
    ['solde',     'Solde', '€'],
    ['plafond',   'Plafond', '€'],
    ['ouverture', 'Ouvert le', 'date'],
    ['fin',       'Fin de validité', 'date'],
  ];

  function _rendreFiche() {
    const box = document.getElementById('imp-fiche');
    if (!box) return;
    box.hidden = !_fiche;
    if (!_fiche) return;
    const cases = FICHE_LIB
      .filter(([cle]) => _fiche[cle] !== undefined && _fiche[cle] !== null)
      .map(([cle, lib, unite]) => {
        const v = _fiche[cle];
        const txt = unite === 'date' ? String(v).split('-').reverse().join('/')
                  : unite === '%'    ? String(v).replace('.', ',') + ' %'
                  : _fmtMontant(v) + ' €';
        return '<span><i>' + _esc(lib) + '</i><b>' + _esc(txt) + '</b></span>';
      }).join('');
    // Ce qui n'a pas été trouvé est dit aussi. Une lecture partielle ressemble
    // sinon à une lecture complète : le membre enregistre sans voir qu'il
    // manque le prévisionnel, et se demande plus tard pourquoi le chiffre
    // diffère de celui de sa banque. Ces deux-là seulement — le taux et le
    // plafond viennent du barème, les dates se saisissent en deux secondes.
    const manque = [['acquis', 'les intérêts à ce jour'], ['projete', 'les intérêts prévisionnels']]
      .filter(([cle]) => _fiche[cle] === undefined || _fiche[cle] === null)
      .map(([, lib]) => lib);

    // Le second compartiment est montré à part, et non fondu dans le premier :
    // ses chiffres ne décrivent pas le même étage du livret, et les confondre
    // rémunérerait tout le solde au taux du dépassement.
    const sur = _fiche.sur
      ? '<div class="imp-fiche-t sur">Second compartiment, au-delà du plafond</div>' +
        '<div class="imp-fiche-l">' + FICHE_LIB
          .filter(([cle]) => _fiche.sur[cle] !== undefined && _fiche.sur[cle] !== null)
          .map(([cle, lib, unite]) => {
            const v = _fiche.sur[cle];
            const txt = unite === 'date' ? String(v).split('-').reverse().join('/')
                      : unite === '%'    ? String(v).replace('.', ',') + ' %'
                      : _fmtMontant(v) + ' €';
            return '<span><i>' + _esc(lib) + '</i><b>' + _esc(txt) + '</b></span>';
          }).join('') + '</div>'
      : '';

    box.innerHTML =
      '<div class="imp-fiche-t">Fiche du livret reconnue</div>' +
      '<div class="imp-fiche-l">' + cases + '</div>' + sur +
      '<div class="imp-fiche-s">Ces valeurs viennent de votre banque et ' +
      'remplaceront le calcul : c’est ce qui rend l’affichage exact. ' +
      'Vous pourrez les corriger avant d’enregistrer.' +
      (manque.length
        ? ' <b>Non trouvé : ' + _esc(manque.join(' et ')) + '</b> — à recopier à la main ' +
          'dans « Taux, révisions et relevé de la banque », si votre banque les affiche.'
        : '') +
      '</div>';
  }

  // Une même révision peut figurer deux fois — deux relevés qui se recouvrent,
  // ou la ligne répétée en tête de page. La plus récente pour une date donnée
  // l'emporte, et le tout est rendu du plus ancien au plus récent.
  function _dedoublonnerTaux(taux) {
    const par = {};
    (taux || []).forEach(t => {
      if (t && t.depuis && isFinite(t.taux)) par[t.depuis] = t.taux;
    });
    return Object.keys(par).sort().map(d => ({ depuis: d, taux: par[d] }));
  }

  function _rendreTaux() {
    const box = document.getElementById('imp-taux');
    if (!box) return;
    box.hidden = !_taux.length;
    if (!_taux.length) return;
    box.innerHTML =
      '<div class="imp-taux-t">' +
        _taux.length + ' révision' + (_taux.length > 1 ? 's' : '') + ' de taux trouvée' +
        (_taux.length > 1 ? 's' : '') + ' dans le relevé' +
      '</div>' +
      '<div class="imp-taux-l">' + _taux.map(t =>
        '<span><b>' + _esc(String(t.taux).replace('.', ',')) + ' %</b> au ' +
        _esc(t.depuis.split('-').reverse().join('/')) + '</span>').join('') + '</div>' +
      '<div class="imp-taux-s">Sans elles, l’acquis serait calculé au taux ' +
      'd’aujourd’hui sur toute l’année. Elles seront ajoutées avec les lignes cochées.</div>';
  }

  function _majPied() {
    const retenues = _lignes.filter(l => l.ok);
    const somme = retenues.reduce((s, l) => s + l.m, 0);
    _text('imp-count',
      retenues.length + ' ligne' + (retenues.length > 1 ? 's' : '') + ' sur ' + _lignes.length +
      ' · solde ' + (somme >= 0 ? '+' : '') + _fmtMontant(somme) + ' €' +
      (_taux.length ? ' · ' + _taux.length + ' taux' : '') +
      (_fiche ? ' · fiche' : ''));
    const btn = document.getElementById('imp-ok');
    // Un relevé peut n'apporter que des révisions de taux, ou que la fiche du
    // livret : il reste utile.
    if (btn) btn.disabled = !retenues.length && !_taux.length && !_fiche;
  }

  function setOk(i, v) {
    if (!_lignes[i]) return;
    _lignes[i].ok = !!v;
    _majPied();
  }

  function set(i, champ, val) {
    if (!_lignes[i]) return;
    if (champ === 'm') {
      // _depParse renvoie une valeur absolue : le signe se lit sur la saisie.
      const n = _depParse(val);
      if (!isFinite(n)) return;
      _lignes[i].m = /^\s*-/.test(String(val)) ? -n : n;
      _rendre();
      return;
    }
    _lignes[i][champ] = val;
    _rendre();
  }

  function toutCocher(v) {
    _lignes.forEach(l => { l.ok = !!v; });
    _rendre();
  }

  function valider() {
    const retenues = _lignes
      .filter(l => l.ok && l.d && isFinite(l.m) && l.m !== 0)
      .map(l => ({ d: l.d, m: l.m, label: l.label || '' }));
    const taux  = _taux.slice();
    const fiche = _fiche ? Object.assign({}, _fiche) : null;
    if (!retenues.length && !taux.length && !fiche) return;
    const fn = _dest && _dest.onValider;
    close();
    if (fn) fn(retenues, taux, fiche);
  }

  function retour() { _etape('depot'); }

  // ─── Rouages d'affichage ─────────────────────────────────────────────────

  function _etape(nom) {
    ['depot', 'lecture', 'colonnes', 'validation'].forEach(e => {
      const el = document.getElementById('imp-etape-' + e);
      if (el) el.hidden = (e !== nom);
    });
    // Le pied ne porte le compte et le bouton d'ajout qu'une fois qu'il y a
    // quelque chose à ajouter.
    _hide('imp-count', nom !== 'validation');
    _hide('imp-ok',    nom !== 'validation');
  }

  // ─── Révisions de taux ───────────────────────────────────────────────────
  //
  // Un relevé de livret journalise ses changements de taux, sous forme d'une
  // opération à zéro euro : « NOUVEAU TAUX DU LIVRET JEUNE 3 500% NET AU
  // 01/02/2026 ». Ces lignes sont écartées du calcul — elles ne déplacent pas
  // d'argent — mais elles portent précisément ce qu'il est le plus pénible de
  // saisir à la main, et sans quoi tout l'acquis est calculé au taux du jour.
  //
  // Le séparateur décimal du taux sort souvent en espace : « 3 500% » vaut
  // 3,500 %, pas trois mille cinq cents. Un taux au-delà de 20 % n'existant
  // pas sur un livret, l'ambiguïté se lève seule.
  function revisionTaux(label, dateLigne) {
    const s = String(label || '');
    if (!/nouveau\s+taux|taux\s+(?:du|de)\b|changement\s+de\s+taux/i.test(s)) return null;
    const m = /(\d{1,2})[\s,.](\d{1,3})\s*%/.exec(s) || /(\d{1,2})\s*%/.exec(s);
    if (!m) return null;
    const taux = m[2] === undefined ? Number(m[1]) : Number(m[1] + '.' + m[2]);
    if (!isFinite(taux) || taux <= 0 || taux > 20) return null;
    // La date d'effet est dans le libellé quand la banque la précise ; sinon
    // c'est celle de la ligne, qui tombe le jour du changement.
    const dansLabel = /\b(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/.exec(s);
    const depuis = (dansLabel && window.CBImport.csv.parseDate(dansLabel[1])) || dateLigne || null;
    if (!depuis) return null;
    return { depuis, taux };
  }

  function _text(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }
  function _hide(id, v) { const el = document.getElementById(id); if (el) el.hidden = !!v; }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _fmtMontant(n) {
    return (Math.round(Number(n) * 100) / 100).toFixed(2).replace('.', ',');
  }

  return {
    open, close, onFile, onDrop, onDragOver, dragOff: _dragOff,
    setOk, set, toutCocher, valider, retour, revisionTaux,
    setColonne, setDepuis, relire,
    voirApercu, fermerApercu,
    // Exposée pour la suite de tests : c'est la règle la plus délicate du
    // module, et elle se vérifie sans DOM.
    _fusionner,
    // Les parseurs s'accrochent ici. Seul le CSV est livré pour l'instant.
    csv: null, pdf: null, ocr: null,
    // Exposés pour les tests hors navigateur.
    _outils: null,
  };
})();


// ═══════════════════════════════════════════════════════════════════════════
//  VOIE 1 — CSV
//
//  Toutes les banques françaises exportent leurs opérations en CSV depuis leur
//  espace web. C'est la voie la plus simple des trois : aucune dépendance, un
//  découpage et deux ou trois motifs suffisent.
//
//  Ce que la vraie vie impose, et qui n'est pas dans un tutoriel :
//    • le séparateur est `;` en France, `,` ailleurs, parfois une tabulation ;
//    • l'encodage est souvent windows-1252, pas UTF-8 ;
//    • les montants s'écrivent « 1 234,56 » avec une espace insécable ;
//    • le débit et le crédit occupent deux colonnes distinctes ;
//    • plusieurs banques posent deux ou trois lignes de préambule avant l'entête.
// ═══════════════════════════════════════════════════════════════════════════

window.CBImport.csv = (function () {
  'use strict';

  async function lire(file) {
    const texte = _decoder(await file.arrayBuffer());
    const res = analyser(texte);
    // Le texte accompagne le résultat pour qu'un rattrapage manuel puisse
    // relire le fichier sans le redemander. Il ne vit qu'en mémoire, et le
    // socle le relâche dès la fermeture — rien n'est écrit nulle part.
    if (res.colonnesInconnues) res.texte = texte;
    return res;
  }

  // UTF-8 d'abord. Le caractère de remplacement U+FFFD signale un décodage raté :
  // on retombe alors sur windows-1252, qui couvre les exports des banques
  // françaises. Deviner l'inverse abîmerait les accents sans rien signaler.
  function _decoder(buf) {
    const utf8 = new TextDecoder('utf-8').decode(buf);
    if (utf8.indexOf('�') === -1) return utf8;
    try { return new TextDecoder('windows-1252').decode(buf); } catch (_) { return utf8; }
  }

  // Découpage conforme au RFC 4180 : un séparateur entre guillemets est un
  // caractère comme un autre, et deux guillemets doublés en valent un seul.
  function _decouper(ligne, sep) {
    const out = [];
    let cur = '', dansGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i];
      if (dansGuillemets) {
        if (c === '"') {
          if (ligne[i + 1] === '"') { cur += '"'; i++; }
          else dansGuillemets = false;
        } else cur += c;
      } else if (c === '"') {
        dansGuillemets = true;
      } else if (c === sep) {
        out.push(cur.trim()); cur = '';
      } else cur += c;
    }
    out.push(cur.trim());
    return out;
  }

  // Le séparateur est celui qui découpe le plus de lignes en un même nombre de
  // colonnes, ce nombre valant au moins deux. Compter les occurrences ne suffit
  // pas : un libellé peut contenir plus de virgules que le fichier n'a de
  // colonnes.
  //
  // La condition « au moins deux » ne se négocie pas. Sans elle, un fichier à
  // point-virgule dont une seule ligne contient une virgule décimale élisait la
  // virgule : elle découpait quatre lignes sur cinq en une colonne — parfaite
  // constance, et zéro information.
  function _separateur(lignes) {
    let best = ';', score = -1;
    [';', ',', '\t', '|'].forEach(sep => {
      const tailles = lignes.slice(0, 12)
        .map(l => _decouper(l, sep).length)
        .filter(n => n >= 2);
      if (!tailles.length) return;
      const freq = {};
      tailles.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
      // Taille modale, et le nombre de lignes qui la respectent. À couverture
      // égale, le découpage le plus fin gagne : six colonnes constantes disent
      // plus que deux.
      let modale = 0, couverture = 0;
      Object.keys(freq).forEach(t => {
        const n = freq[t];
        if (n > couverture || (n === couverture && Number(t) > modale)) {
          couverture = n; modale = Number(t);
        }
      });
      const s = couverture * 100 + modale;
      if (s > score) { score = s; best = sep; }
    });
    return best;
  }

  const RE_DATE = /^\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\s*$|^\s*(\d{4})-(\d{2})-(\d{2})/;

  // dd/mm/yyyy, dd.mm.yy, yyyy-mm-dd → ISO. Le jour précède le mois : ces
  // fichiers viennent de banques françaises, et 03/04 y est le 3 avril.
  function parseDate(v) {
    const m = RE_DATE.exec(String(v || ''));
    if (!m) return null;
    if (m[4]) return m[4] + '-' + m[5] + '-' + m[6];
    let [, j, mo, a] = m;
    if (a.length === 2) a = (Number(a) > 70 ? '19' : '20') + a;
    const iso = a + '-' + String(mo).padStart(2, '0') + '-' + String(j).padStart(2, '0');
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime()) || d.getMonth() + 1 !== Number(mo)) return null;
    return iso;
  }

  // « 1 234,56 », « -1.234,56 », « (120,00) » — les parenthèses valent un
  // négatif dans les exports tableur. L'espace insécable et l'espace fine sont
  // deux caractères distincts de l'espace ordinaire : les trois sont retirés.
  function parseMontant(v) {
    let s = String(v == null ? '' : v)
      .replace(/[\s\u00a0\u202f\u2009]/g, '')
      .replace(/€|EUR/gi, '');
    if (!s) return NaN;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (s[0] === '-') { neg = true; s = s.slice(1); }
    if (s[0] === '+') s = s.slice(1);
    // Le dernier séparateur rencontré est le décimal ; l'autre groupe les
    // milliers. « 1.234,56 » et « 1,234.56 » se distinguent ainsi sans réglage.
    const dernierV = s.lastIndexOf(','), dernierP = s.lastIndexOf('.');
    if (dernierV >= 0 && dernierP >= 0) {
      s = dernierV > dernierP ? s.replace(/\./g, '').replace(',', '.')
                              : s.replace(/,/g, '');
    } else if (dernierV >= 0) {
      // Une virgule suivie de trois chiffres exactement est un séparateur de
      // milliers, sauf s'il n'y a rien d'autre — « 1,234 » reste ambigu, et
      // l'usage français tranche pour le décimal.
      s = s.replace(',', '.');
    }
    if (!/^\d*\.?\d+$/.test(s)) return NaN;
    const n = parseFloat(s);
    if (!isFinite(n)) return NaN;
    return neg ? -n : n;
  }

  const MOTS = {
    // La date d'opération d'abord, la date de valeur en dernier recours.
    //
    // Ce n'est pas un détail de nommage. Un relevé de livret porte les deux, et
    // la date de valeur INTÈGRE DÉJÀ la règle des quinzaines — un versement du
    // 3 mars y prend valeur au 16 mars, un retrait du 27 février au 16 février.
    // L'importer reviendrait à appliquer la règle deux fois, puisque
    // _livDebutQuinzaine la rejoue ensuite sur la date reçue : les intérêts
    // seraient décalés d'une quinzaine sur chaque mouvement.
    date:   ['date de comptabilisation', 'date operation', 'date d operation',
             'date', 'jour', 'date valeur', 'date de valeur'],
    label:  ['libelle', 'libellé', 'label', 'description', 'nature', 'motif', 'intitule',
             'intitulé', 'operation', 'opération', 'detail', 'détail'],
    debit:  ['debit', 'débit', 'retrait', 'sortie', 'withdrawal'],
    credit: ['credit', 'crédit', 'versement', 'entree', 'entrée', 'depot', 'dépôt', 'deposit'],
    montant:['montant', 'amount', 'valeur', 'somme'],
    solde:  ['solde', 'balance'],
  };

  // Minuscules sans accent : « Libellé » et « libelle » doivent tomber sur la
  // même entrée du dictionnaire. U+0300–U+036F est le bloc des diacritiques
  // que NFD vient de détacher.
  function _norm(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/["']/g, '').replace(/\s+/g, ' ').trim();
  }

  function _trouver(entetes, famille) {
    const cibles = MOTS[famille].map(_norm);
    // Égalité d'abord, inclusion ensuite : « date de valeur » ne doit pas rafler
    // la place de « date d'opération » quand les deux existent.
    for (const c of cibles) {
      const i = entetes.findIndex(h => h === c);
      if (i >= 0) return i;
    }
    for (const c of cibles) {
      const i = entetes.findIndex(h => h.indexOf(c) >= 0);
      if (i >= 0) return i;
    }
    return -1;
  }

  /**
   * Aperçu d'un fichier dont les colonnes n'ont pas été reconnues.
   *
   * Aucun dictionnaire ne couvrira toutes les banques, et un adaptateur par
   * établissement est une course perdue d'avance. Plutôt que d'échouer, on
   * montre le fichier tel qu'il est découpé et on laisse le membre désigner
   * ses colonnes : cela couvre tout format tabulaire, y compris ceux qu'on
   * n'a jamais vus.
   */
  function apercu(texte) {
    const brut = String(texte || '').split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
    if (!brut.length) return null;
    const sep = _separateur(brut);
    const table = brut.slice(0, 8).map(l => _decouper(l, sep));
    const n = Math.max.apply(null, table.map(r => r.length));
    // La première ligne est-elle une entête ? Si elle ne porte ni date ni
    // montant alors que la suivante en porte, oui — et il ne faut pas
    // l'importer comme une opération.
    const estEntete = table.length > 1 &&
      !table[0].some(v => parseDate(v) || isFinite(parseMontant(v))) &&
      table[1].some(v => parseDate(v) || isFinite(parseMontant(v)));
    return { sep, table, colonnes: n, entete: estEntete };
  }

  /**
   * @param texte   contenu du fichier
   * @param forcees mapping imposé par le membre : { date, label, montant,
   *                debit, credit, solde, depuis } — index de colonne, -1 pour
   *                « aucune », `depuis` étant la première ligne de données.
   */
  function analyser(texte, forcees) {
    const brut = texte.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
    if (brut.length < 2) return { lignes: [], taux: [] };
    const sep = _separateur(brut);

    // Colonnes désignées à la main : on saute toute la détection.
    if (forcees && forcees.date >= 0) {
      const depuis = Number.isFinite(forcees.depuis) ? forcees.depuis : 0;
      return _extraire(brut.slice(depuis).map(l => _decouper(l, sep)), forcees);
    }

    // Plusieurs banques posent un préambule (nom du compte, IBAN, période) avant
    // l'entête. La vraie entête est la première ligne qui nomme une date ET un
    // montant, quel qu'en soit le nom.
    let iEntete = -1, cols = null;
    for (let i = 0; i < Math.min(brut.length, 15); i++) {
      const h = _decouper(brut[i], sep).map(_norm);
      if (h.length < 2) continue;
      const c = {
        date:    _trouver(h, 'date'),
        label:   _trouver(h, 'label'),
        debit:   _trouver(h, 'debit'),
        credit:  _trouver(h, 'credit'),
        montant: _trouver(h, 'montant'),
        solde:   _trouver(h, 'solde'),
      };
      if (c.date >= 0 && (c.montant >= 0 || c.debit >= 0 || c.credit >= 0)) {
        iEntete = i; cols = c; break;
      }
    }

    const corps = brut.slice(iEntete + 1).map(l => _decouper(l, sep));
    // Sans entête reconnue, on devine les colonnes sur le contenu : celle qui
    // ressemble le plus à des dates, celle qui ressemble le plus à des montants.
    if (!cols) cols = _deviner(brut.map(l => _decouper(l, sep)));
    // Toujours rien : le fichier n'est pas perdu pour autant, l'appelant
    // proposera au membre de désigner les colonnes lui-même.
    if (!cols) return { lignes: [], taux: [], colonnesInconnues: true };

    return _extraire(iEntete >= 0 ? corps : brut.map(l => _decouper(l, sep)), cols);
  }

  // Extraction proprement dite, une fois les colonnes connues — qu'elles aient
  // été reconnues, devinées, ou désignées à la main.
  function _extraire(table, brutes) {
    // Une désignation manuelle ne renseigne que ce que le membre a choisi :
    // les autres colonnes valent « aucune », pas `undefined`, sinon
    // `vals[undefined]` remonterait en silence.
    const cols = Object.assign(
      { date: -1, label: -1, debit: -1, credit: -1, montant: -1, solde: -1 },
      brutes || {});
    const lignes = [], taux = [];
    // Toutes les lignes datées, y compris celles à zéro euro : le solde
    // d'ouverture se déduit de la plus ancienne, quelle qu'elle soit.
    const datees = [];

    table.forEach(vals => {
      if (!vals || vals.length < 2) return;
      const d = parseDate(vals[cols.date]);
      if (!d) return;

      let m = NaN;
      if (cols.montant >= 0) {
        m = parseMontant(vals[cols.montant]);
      }
      if (!isFinite(m) && (cols.debit >= 0 || cols.credit >= 0)) {
        const deb = cols.debit  >= 0 ? parseMontant(vals[cols.debit])  : NaN;
        const cre = cols.credit >= 0 ? parseMontant(vals[cols.credit]) : NaN;
        // Une colonne débit porte un montant positif dans la plupart des
        // exports, négatif dans quelques-uns. Sa valeur absolue lève le doute.
        m = (isFinite(cre) ? Math.abs(cre) : 0) - (isFinite(deb) ? Math.abs(deb) : 0);
        if (!isFinite(deb) && !isFinite(cre)) m = NaN;
      }

      const label = cols.label >= 0 ? String(vals[cols.label] || '').replace(/\s+/g, ' ').trim() : '';
      const solde = cols.solde >= 0 ? parseMontant(vals[cols.solde]) : NaN;
      if (isFinite(m)) datees.push({ d, m, solde });

      // Une révision de taux est une opération à zéro euro : elle ne déplace
      // pas d'argent, mais elle porte le taux, qu'on ne peut lire nulle part
      // ailleurs.
      const rev = window.CBImport.revisionTaux(label, d);
      if (rev) { taux.push(rev); return; }

      if (!isFinite(m) || m === 0) return;
      lignes.push({ d, m, label: label.slice(0, 80) });
    });

    return { lignes, taux, report: _report(datees) };
  }

  /**
   * Solde d'ouverture, déduit de la colonne « Solde ».
   *
   * Un export liste des opérations, pas un état : ce qu'il y avait avant la
   * première ligne n'y figure nulle part... sauf dans la colonne Solde, qui
   * porte l'état APRÈS chaque opération. Sur la plus ancienne :
   *
   *     solde d'ouverture = solde de la ligne − montant de la ligne
   *
   * Cas réel : `31/12/2024 ; +23,83 ; INTERETS 2024 ; 33,83` donne 10,00 €.
   * Sans cette ligne, le livret démarre à zéro et tout l'historique est faux
   * d'autant.
   *
   * Le résultat n'est proposé que s'il se vérifie de bout en bout : en
   * repartant de ce solde et en rejouant toutes les opérations, on doit
   * retomber sur le solde de la ligne la plus récente. Si le compte est bon,
   * c'est que la colonne a été comprise, que le sens des débits est le bon et
   * qu'aucune ligne n'a été perdue — un seul contrôle valide tout l'import.
   */
  function _report(datees) {
    if (datees.length < 2) return null;
    const avecSolde = datees.filter(x => isFinite(x.solde));
    if (avecSolde.length !== datees.length) return null;

    // Un relevé descend du plus récent, un export monte : on trie plutôt que de
    // supposer. À date égale, l'ordre du fichier fait foi, d'où le tri stable.
    const trie = datees.slice().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    const premiere = trie[0], derniere = trie[trie.length - 1];

    const ouverture = premiere.solde - premiere.m;
    const cumul = trie.reduce((s, x) => s + x.m, ouverture);
    // Deux centimes de tolérance : les arrondis d'un export ne sont pas les
    // nôtres, mais un écart réel se compte en euros.
    if (Math.abs(cumul - derniere.solde) > 0.02) return null;

    const arrondi = Math.round(ouverture * 100) / 100;
    if (arrondi === 0) return null;   // rien à reporter, le compte partait de zéro

    return {
      // La veille de la première opération : le report existait avant elle, et
      // une date antérieure au 1er janvier démarre à la quinzaine zéro.
      d: _veille(premiere.d),
      m: arrondi,
      label: 'Solde avant le ' + premiere.d.split('-').reverse().join('/'),
    };
  }

  function _veille(iso) {
    const p = String(iso).split('-');
    const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) - 1, 12);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // Repli sans entête : on note chaque colonne sur sa proportion de dates et de
  // montants, et on prend les deux meilleures. Le libellé est la colonne de
  // texte la plus longue en moyenne.
  function _deviner(table) {
    const corps = table.filter(v => v.length >= 2);
    if (!corps.length) return null;
    const n = Math.max.apply(null, corps.map(v => v.length));
    const scoreD = [], scoreM = [], longueur = [];
    for (let c = 0; c < n; c++) {
      let d = 0, m = 0, len = 0;
      corps.forEach(v => {
        if (parseDate(v[c])) d++;
        if (isFinite(parseMontant(v[c]))) m++;
        len += String(v[c] || '').length;
      });
      scoreD[c] = d; scoreM[c] = m; longueur[c] = len / corps.length;
    }
    const iDate = scoreD.indexOf(Math.max.apply(null, scoreD));
    if (scoreD[iDate] < corps.length * 0.5) return null;
    let iMont = -1, best = -1;
    for (let c = 0; c < n; c++) {
      if (c === iDate) continue;
      if (scoreM[c] > best) { best = scoreM[c]; iMont = c; }
    }
    if (iMont < 0 || best < corps.length * 0.5) return null;
    let iLab = -1, bestLen = 3;
    for (let c = 0; c < n; c++) {
      if (c === iDate || c === iMont) continue;
      if (longueur[c] > bestLen) { bestLen = longueur[c]; iLab = c; }
    }
    return { date: iDate, label: iLab, montant: iMont, debit: -1, credit: -1, solde: -1 };
  }

  return { lire, analyser, apercu, parseDate, parseMontant, _decouper, _separateur, _report };
})();


// ═══════════════════════════════════════════════════════════════════════════
//  VOIE 2 — PDF
//
//  Toutes les banques françaises produisent un relevé mensuel et un relevé
//  annuel en PDF. Ce sont des PDF texte, pas des images : le contenu est déjà
//  là, il suffit de le lire. Le relevé annuel donne en prime le solde au
//  31 décembre — exactement la ligne de report qui manque le plus.
//
//  pdf.js (Mozilla, Apache-2.0) tourne entièrement dans le navigateur. Il est
//  hébergé chez nous, comme Chart.js : aucun CDN, la direction est
//  script-src 'self'. Ses 1,8 Mo ne sont chargés que si un PDF est déposé.
//
//  Un relevé est un tableau régulier. getTextContent() rend chaque fragment
//  avec sa position, et c'est la position en X qui distingue une colonne débit
//  d'une colonne crédit — un montant seul ne dit pas son sens.
// ═══════════════════════════════════════════════════════════════════════════

window.CBImport.pdf = (function () {
  'use strict';

  const VERSION = '6.2.108';
  let _lib = null;

  // Chargé à la demande. `import()` dans un script classique résout par rapport
  // au script, pas à la page : on passe par document.baseURI, sinon l'URL
  // deviendrait js/assets/vendor/… et le chargement échouerait en silence.
  async function _charger() {
    if (_lib) return _lib;
    const base = document.baseURI;
    const lib = await import(new URL('assets/vendor/pdf.min.' + VERSION + '.mjs', base).href);
    lib.GlobalWorkerOptions.workerSrc =
      new URL('assets/vendor/pdf.worker.min.' + VERSION + '.mjs', base).href;
    _lib = lib;
    return lib;
  }

  async function lire(file, progres) {
    if (progres) progres('Chargement du lecteur PDF…');
    const lib = await _charger();
    if (progres) progres('Ouverture du document…');

    const data = new Uint8Array(await file.arrayBuffer());
    // isEvalSupported: false — pdf.js n'a aucune raison d'évaluer du code pour
    // extraire du texte, et un relevé vient d'une source qu'on ne contrôle pas.
    const doc = await lib.getDocument({ data, isEvalSupported: false }).promise;

    let lignes = [];
    for (let p = 1; p <= doc.numPages; p++) {
      if (progres) progres('Lecture de la page ' + p + ' sur ' + doc.numPages + '…');
      const page = await doc.getPage(p);
      const contenu = await page.getTextContent();
      lignes = lignes.concat(_lignesDePage(contenu.items, p));
      page.cleanup();
    }
    // Le document est refermé et rien n'en est gardé : le fichier d'origine ne
    // survit pas à la lecture.
    await doc.destroy();

    return analyser(lignes);
  }

  // Les fragments d'une même ligne partagent leur ordonnée à quelques dixièmes
  // près. transform[4] et transform[5] sont X et Y dans le repère de la page.
  function _lignesDePage(items, page) {
    const paquets = [];
    items.forEach(it => {
      const s = String(it.str || '');
      if (!s.trim()) return;
      const x = it.transform[4], y = it.transform[5];
      // 2,5 points de tolérance : assez pour absorber les exposants et les
      // décalages de police, trop peu pour fusionner deux lignes voisines.
      let p = paquets.find(q => Math.abs(q.y - y) < 2.5);
      if (!p) { p = { y, page, items: [] }; paquets.push(p); }
      p.items.push({ str: s, x, w: it.width || 0 });
    });
    paquets.forEach(p => p.items.sort((a, b) => a.x - b.x));
    // Une page se lit de haut en bas, et Y croît vers le haut.
    paquets.sort((a, b) => b.y - a.y);
    return paquets;
  }

  const csv = window.CBImport.csv;

  // Un fragment qui est un montant, et rien d'autre. « 1 234,56 » peut arriver
  // en un seul fragment ou en plusieurs : on recolle d'abord les voisins
  // immédiats, sinon « 1 234,56 » deviendrait 1 puis 234,56.
  function _montantsDe(items) {
    const out = [];
    let i = 0;
    while (i < items.length) {
      let s = items[i].str.trim();
      const x0 = items[i].x;
      let xf = items[i].x + (items[i].w || 0);
      let j = i + 1;
      // Un fragment collé au précédent (moins de 2 points d'écart) et qui
      // prolonge un nombre appartient au même montant.
      while (j < items.length &&
             items[j].x - (items[j - 1].x + (items[j - 1].w || 0)) < 2 &&
             /^[\d,. ]/.test(items[j].str)) {
        s += items[j].str.trim();
        xf = items[j].x + (items[j].w || 0);
        j++;
      }
      const m = csv.parseMontant(s);
      // Une date passe le test du montant si on n'y prend pas garde : 06/08/2026
      // ne contient ni virgule ni point décimal, mais 1.234 si. On exige donc
      // deux décimales, ce qu'un relevé écrit toujours.
      if (isFinite(m) && /\d[,.]\d{2}\s*(?:€|EUR)?$/i.test(s)) {
        // Le centre sert à rattacher le montant à sa colonne : les montants
        // sont alignés à droite, leur bord gauche varie avec le nombre de
        // chiffres et ne dit rien de la colonne.
        out.push({ v: m, x: x0, centre: (x0 + xf) / 2, brut: s });
      }
      i = (j > i + 1) ? j : i + 1;
    }
    return out;
  }

  const MOTS_COL = {
    debit:  ['debit', 'débit', 'retrait'],
    credit: ['credit', 'crédit', 'versement'],
    montant:['montant', 'valeur'],
    solde:  ['solde'],
  };

  // L'apostrophe devient une espace : « Date d'ouverture » et « Date d
  // ouverture » doivent tomber sur la même entrée, et une lecture d'image rend
  // indifféremment l'apostrophe droite, la typographique, ou rien du tout.
  function _norm(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’`]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // Position en X des colonnes de montants, lue sur la ligne d'entête. C'est
  // elle qui donne son sens à un nombre : sans elle, un débit et un crédit sont
  // deux nombres identiques.
  function _colonnes(lignes) {
    const cols = {};
    for (const l of lignes) {
      for (const it of l.items) {
        const n = _norm(it.str);
        Object.keys(MOTS_COL).forEach(k => {
          if (cols[k] !== undefined) return;
          if (MOTS_COL[k].some(mot => n === mot || n === mot + ' (€)' || n === mot + ' €')) {
            // Le centre du libellé, pas son bord : les montants sont alignés à
            // droite, les entêtes souvent centrées.
            cols[k] = it.x + (it.w || 0) / 2;
          }
        });
      }
      if (cols.solde !== undefined && (cols.debit !== undefined || cols.montant !== undefined)) break;
    }
    return cols;
  }

  function analyser(lignes) {
    const cols = _colonnes(lignes);
    const connues = Object.keys(cols);
    const out = [], taux = [];

    lignes.forEach(l => {
      // Une ligne d'opération commence par une date. Le reste — pied de page,
      // mentions légales, totaux — n'en a pas.
      let d = null, iDate = -1;
      for (let i = 0; i < l.items.length && i < 3; i++) {
        const v = csv.parseDate(l.items[i].str.trim());
        if (v) { d = v; iDate = i; break; }
      }
      if (!d) return;

      const montants = _montantsDe(l.items.slice(iDate + 1));
      if (!montants.length) return;

      let m = NaN;
      if (connues.length) {
        // Chaque montant rejoint la colonne dont le centre est le plus proche.
        // Un montant sous « Solde » est ignoré : c'est un état, pas un flux.
        let deb = 0, cre = 0, mont = NaN, vus = 0;
        montants.forEach(x => {
          let meilleure = null, dist = Infinity;
          connues.forEach(k => {
            const e = Math.abs(cols[k] - x.centre);
            if (e < dist) { dist = e; meilleure = k; }
          });
          if (meilleure === 'solde') return;
          vus++;
          if (meilleure === 'debit')  deb += Math.abs(x.v);
          else if (meilleure === 'credit') cre += Math.abs(x.v);
          else mont = x.v;
        });
        if (!vus) return;
        m = isFinite(mont) ? mont : (cre - deb);
      } else {
        // Sans entête reconnue : un seul nombre est le montant ; deux nombres,
        // le second est le solde courant, convention de tous les relevés que
        // nous avons vus. Au-delà, on ne devine pas — la ligne part quand même
        // à l'écran de validation, où elle sera corrigée ou décochée.
        m = montants[0].v;
      }
      const label = l.items.slice(iDate + 1)
        .map(it => it.str.trim())
        .filter(s => !/^[\d,. ]*(?:€|EUR)?$/i.test(s))
        .join(' ').replace(/\s+/g, ' ').trim();

      // Une révision de taux se lit aussi sur un relevé PDF, sous la même
      // forme : une opération à zéro euro dont le libellé porte le taux.
      const rev = window.CBImport.revisionTaux(label, d);
      if (rev) { taux.push(rev); return; }

      if (!isFinite(m) || m === 0) return;
      out.push({ d, m, label: label.slice(0, 80) });
    });
    return { lignes: out, taux };
  }

  return { lire, analyser, _lignesDePage, _montantsDe, _colonnes };
})();

// ═══════════════════════════════════════════════════════════════════════════
//  VOIE 3 — CAPTURES D'ÉCRAN, LUES PAR UN MODÈLE DE VISION
//
//  Le repli, et le seul recours quand la banque n'expose son relevé que dans
//  son application mobile — cas du CIC, dont l'appli affiche les opérations
//  sans jamais proposer de fichier.
//
//  Cette voie a d'abord été écrite avec tesseract.js, en local. Sur du texte il
//  tient ; sur des chiffres, non, et un 8 lu 3 fausse un solde sans rien
//  signaler. Le dictionnaire pesait 6,5 Mo pour un résultat qu'il fallait
//  relire ligne à ligne de toute façon.
//
//  L'image part donc au Worker, qui la donne à un modèle de vision de Workers
//  AI. afaire-import.md classait cette voie en dernier parce que « l'image part
//  chez un tiers » — le raisonnement visait un fournisseur externe. Cloudflare
//  héberge déjà le Worker, le KV et R2 : ce n'est pas un nouveau sous-traitant,
//  et sa documentation dit que les entrées ne servent ni à entraîner ses
//  modèles ni à améliorer ses services.
//
//  Ce qui ne change pas : le consentement est demandé avant le premier envoi,
//  l'image n'est stockée nulle part, et l'écran de validation reste obligatoire.
//
//  Le modèle ne rend QUE du texte. Toute la structuration — dates héritées d'un
//  en-tête de groupe, signes, montants — reste dans analyserTexte() ci-dessous,
//  qui est testée. Un modèle n'a pas à inventer un montant.
//
//  Une capture d'appli mobile n'a pas la forme d'un relevé : pas de colonnes,
//  et surtout pas de date par ligne. La date est un en-tête de groupe — « 06
//  août » — sous lequel se rangent plusieurs opérations.
// ═══════════════════════════════════════════════════════════════════════════

window.CBImport.ocr = (function () {
  'use strict';

  // Consentement donné pour la session. Volontairement non persisté : un envoi
  // de relevé mérite d'être redemandé, pas coché une fois pour toutes.
  let _accepte = false;

  /**
   * Demande de consentement, en modale propre.
   *
   * Un `confirm()` natif ferait l'affaire fonctionnellement, mais c'est le
   * seul écran de l'application où l'on demande à sortir une donnée bancaire :
   * il mérite d'être lisible, et de ressembler au reste. Une boîte système
   * grise, sans mise en forme, donne l'impression d'un avertissement de
   * navigateur qu'on écarte sans lire.
   *
   * Rend une promesse : la lecture attend la réponse.
   */
  function _demanderConsentement() {
    return new Promise(resolve => {
      const ov = document.getElementById('imp-consent');
      if (!ov) return resolve(false);   // pas de modale : on ne devine pas un accord
      let fini = false;
      const clore = (ok) => {
        if (fini) return;
        fini = true;
        ov.classList.remove('open');
        document.removeEventListener('keydown', onEsc);
        resolve(ok);
      };
      const onEsc = (e) => { if (e.key === 'Escape') clore(false); };
      ov.querySelector('.imp-consent-non').onclick = () => clore(false);
      ov.querySelector('.imp-consent-oui').onclick = () => clore(true);
      // Un clic dans le vide vaut refus : sur une demande de ce genre, le
      // silence ne peut pas valoir accord.
      ov.onclick = (e) => { if (e.target === ov) clore(false); };
      document.addEventListener('keydown', onEsc);
      ov.classList.add('open');
      setTimeout(() => { const b = ov.querySelector('.imp-consent-oui'); if (b) b.focus(); }, 40);
    });
  }

  async function lire(file, progres) {
    if (!_accepte) {
      const ok = await _demanderConsentement();
      if (!ok) {
        throw new Error('Lecture annulée. Vous pouvez déposer un CSV ou un PDF, ' +
                        'qui sont lus sans rien envoyer.');
      }
      _accepte = true;
    }

    if (progres) progres('Envoi de l’image…');
    const jeton = await _jeton();
    if (!jeton) throw new Error('Reconnectez-vous pour utiliser la lecture d’image.');

    const res = await fetch(_worker() + '/lire-releve', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + jeton,
        'X-File-Type': file.type || 'image/png',
        'Content-Type': 'application/octet-stream',
      },
      body: file,
    });

    let data = null;
    try { data = await res.json(); } catch (_) { /* réponse non JSON */ }
    if (!res.ok) {
      // Le diagnostic ne porte que des noms de modèles et de champs, jamais de
      // contenu : il est affichable sans risque, et sans lui un échec de
      // lecture ne se distingue pas d'un autre.
      if (data && data.diagnostic) console.warn('[import] vision :', data.diagnostic);
      throw new Error(((data && data.error) || 'La lecture de l’image a échoué.') +
        (data && data.diagnostic ? '\n\n' + data.diagnostic : ''));
    }
    if (progres) progres('Analyse du texte lu…');
    const texte = (data && data.texte) || '';

    // Deux écrans possibles, et ils n'ont rien à voir : la liste des opérations
    // ou la fiche « Caractéristiques ». La seconde se reconnaît à ses libellés
    // et ne contient aucune opération — inutile de lui chercher des dates.
    const fiche = analyserFiche(texte);
    if (fiche) return { lignes: [], taux: [], fiche };

    const lu = analyserTexte(texte);

    // Rien, ou presque : c'est le symptôme d'une fiche dont on ne connaît pas
    // les libellés. Plutôt que d'allonger indéfiniment CHAMPS banque par
    // banque, on demande au modèle de désigner les valeurs dans le texte qu'il
    // vient lui-même de transcrire — et on vérifie chacune contre ce texte.
    //
    // Le seuil : au-delà de deux opérations, c'est une vraie liste, et une
    // fiche n'en produit pas autant. Sans lui, une capture d'opérations
    // déclencherait un appel inutile à chaque import.
    if (lu.lignes.length < 3 && !lu.taux.length) {
      if (progres) progres('Reconnaissance des champs…');
      let rendu = null;
      try { rendu = await _champsParIA(texte); } catch (_) { /* le repli reste lu */ }
      const parIA = rendu ? ficheDepuisChamps(texte, rendu) : null;
      if (parIA) return { lignes: [], taux: [], fiche: parIA };
    }

    return lu;
  }

  /**
   * Deuxième passe : le texte transcrit repart au Worker, qui demande au modèle
   * de pointer les valeurs. Voir le bloc VISION_CHAMPS_* du Worker.
   *
   * Rend le texte brut du modèle, jamais un objet : la conversion en nombres
   * reste ici, dans du code testé.
   */
  async function _champsParIA(texte) {
    const jeton = await _jeton();
    if (!jeton) return null;
    const res = await fetch(_worker() + '/lire-releve', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + jeton,
        'X-Etape': 'champs',
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: texte,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return (data && data.champs) || null;
  }

  // WORKER_URL et fbAuth sont des globales de app.js. WORKER_URL est un `const`
  // de haut niveau : il vit dans la portée globale mais n'est PAS une propriété
  // de window, d'où la référence nue plutôt que window.WORKER_URL, qui vaudrait
  // undefined. Même convention que onboarding.js pour isAdmin et showPage.
  function _worker() {
    return (typeof WORKER_URL === 'string' && WORKER_URL) || 'https://api.capitalboard.fr';
  }

  async function _jeton() {
    try {
      if (typeof fbAuth === 'undefined' || !fbAuth) return null;
      const u = fbAuth.currentUser;
      return u ? await u.getIdToken() : null;
    } catch (_) { return null; }
  }

  // ─── Analyse du texte reconnu ────────────────────────────────────────────

  const MOIS = {
    janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
    aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
    janv: 1, fev: 2, avr: 4, juil: 7, sept: 9, oct: 10, nov: 11, dec: 12,
  };

  // L'apostrophe devient une espace : « Date d'ouverture » et « Date d
  // ouverture » doivent tomber sur la même entrée, et une lecture d'image rend
  // indifféremment l'apostrophe droite, la typographique, ou rien du tout.
  function _norm(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’`]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // « 06 août », « 31 décembre 2025 », « 06/08/2026 ». Sans année, c'est
  // l'année en cours — sauf si la date tombe dans le futur, auquel cas le
  // relevé parle de l'année précédente.
  function enTeteDate(ligne, aujourdHui) {
    const n = _norm(ligne);
    const iso = window.CBImport.csv.parseDate(n);
    if (iso) return iso;
    const m = /^(\d{1,2})\s+([a-z]+)\.?\s*(\d{4})?$/.exec(n);
    if (!m) return null;
    const mois = MOIS[m[2]];
    if (!mois) return null;
    const today = aujourdHui || new Date();
    let an = m[3] ? Number(m[3]) : today.getFullYear();
    const faire = (a) => a + '-' + String(mois).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    if (!m[3]) {
      const d = new Date(faire(an) + 'T12:00:00');
      if (d.getTime() > today.getTime()) an -= 1;
    }
    return faire(an);
  }

  /**
   * Fiche « Caractéristiques » d'un livret, lue sur une capture.
   *
   * L'autre écran de l'application bancaire, et de loin le plus utile : il
   * porte les deux chiffres qu'aucun calcul ne reproduit — les intérêts acquis
   * et les prévisionnels — plus le taux, le plafond et les dates.
   *
   * C'est ici que la lecture d'image gagne vraiment. Une liste d'opérations
   * existe déjà en CSV ; cette fiche-là n'existe nulle part ailleurs qu'à
   * l'écran, et sans elle il faut recopier sept champs à la main.
   */
  // Les libellés ont été recopiés du CIC, puis élargis aux formulations les plus
  // répandues. Cette liste n'a pas de fin — c'est un raccourci gratuit, pas la
  // réponse : quand elle ne trouve rien, `_champsParIA` prend le relais et
  // reconnaît la fiche quelle que soit la banque.
  const CHAMPS = [
    { cle: 'acquis',   type: 'montant', mots: ['interets a ce jour', 'interets acquis', 'interets courus', 'interets au', 'interets percus', 'interets cumules'] },
    { cle: 'projete',  type: 'montant', mots: ['interets previsionnels', 'interets projetes', 'interets estimes', 'previsionnel', 'projection'] },
    { cle: 'plafond',  type: 'montant', mots: ['plafond', 'montant maximum', 'versement maximum'] },
    { cle: 'solde',    type: 'montant', mots: ['solde', 'encours', 'capital'] },
    { cle: 'taux',     type: 'taux',    mots: ['taux', 'remuneration'] },
    { cle: 'fin',      type: 'date',    mots: ['date de fin de validite', 'fin de validite', 'echeance', 'date d echeance', 'date de cloture'] },
    { cle: 'ouverture',type: 'date',    mots: ['date d ouverture', 'date douverture', 'ouverture', 'ouvert le', 'souscrit le', 'date de souscription'] },
  ];

  const RE_VAL_MONTANT = /([+\-−–])?\s*(\d[\d  .]*(?:[,.]\d{2})?)\s*(?:€|EUR)/i;
  const RE_VAL_TAUX    = /(\d{1,2}(?:[,.]\d{1,3})?)\s*%/;
  const RE_VAL_DATE    = /(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/;

  // Toutes les valeurs trouvées, dans l'ordre du texte. Une clé peut revenir :
  // une fiche répète son solde entre le résumé et le détail, et une capture
  // peut porter DEUX compartiments d'un même livret.
  function _valeursFiche(texte) {
    const lignes = String(texte || '').split(/\r?\n/).map(l => _redresser(l.trim())).filter(Boolean);
    const trouves = [];

    CHAMPS.forEach(champ => {
      for (let i = 0; i < lignes.length; i++) {
        const n = _norm(lignes[i]);
        // Le libellé doit ouvrir la ligne : « Plafond » ne doit pas être
        // trouvé dans « Plafond atteint sur votre autre livret ».
        if (!champ.mots.some(mot => n.indexOf(mot) === 0)) continue;

        // La valeur suit le libellé sur la même ligne, ou occupe la suivante :
        // l'OCR d'un tableau à deux colonnes rend l'un ou l'autre selon
        // l'espacement.
        //
        // Le découpage se fait sur la ligne NORMALISÉE, pas sur la brute : le
        // libellé a été cherché dans la première, et `_norm` réduit les suites
        // d'espaces. Un tableau largement espacé décalait donc l'index, et la
        // coupe tombait au milieu du montant.
        const apres = n.slice(_indexApres(n, champ.mots));
        const candidats = [apres, lignes[i + 1] || ''];
        for (const c of candidats) {
          const v = _valeur(c, champ.type);
          if (v !== null) { trouves.push({ i, cle: champ.cle, v }); break; }
        }
      }
    });

    return trouves.sort((a, b) => a.i - b.i);
  }

  /**
   * Découpe les valeurs en blocs, un par compartiment.
   *
   * Un Livret A du CIC porte deux étages sur le même écran : le réglementé
   * jusqu'à 22 950 € à 1,70 %, puis le compartiment de dépassement à 0,30 %,
   * avec son propre plafond. Ne retenir que le premier était juste tant que les
   * captures arrivaient dans l'ordre, et faux dès que le membre n'envoyait que
   * la seconde.
   *
   * La coupure se fait sur une clé qui revient AVEC UNE AUTRE VALEUR : la même
   * répétée est la même fiche vue deux fois, un solde ou un taux différent est
   * un autre compartiment.
   */
  function _blocsFiche(texte) {
    const blocs = [];
    let cur = null;
    _valeursFiche(texte).forEach(x => {
      if (!cur) { cur = {}; blocs.push(cur); }
      if (cur[x.cle] !== undefined) {
        if (cur[x.cle] === x.v) return;          // répétition inoffensive
        cur = {}; blocs.push(cur);               // autre compartiment
      }
      cur[x.cle] = x.v;
    });
    return _recoller(blocs).map(_ordonner);
  }

  // Un bloc sans taux ni plafond ne décrit pas un compartiment : c'est l'en-tête
  // général de la fiche, ou sa fin. Il ne fait donc pas nombre — il complète le
  // compartiment voisin au lieu d'en devenir un.
  function _recoller(blocs) {
    const compart = (b) => b.taux !== undefined || b.plafond !== undefined;
    const out = [];
    let entete = null;   // en-tête lu avant tout compartiment
    blocs.forEach(b => {
      if (!compart(b)) {
        // Après un compartiment, un bloc sans taux ni plafond n'est qu'une fin
        // de fiche : il comble les trous du dernier, sans rien écraser.
        if (out.length && !entete) _completer(out[out.length - 1], b);
        else entete = entete ? _completer(entete, b) : Object.assign({}, b);
        return;
      }
      const n = Object.assign({}, b);
      // L'en-tête, lui, a été lu EN PREMIER : ses valeurs priment, comme du
      // temps où la première rencontrée gagnait.
      if (entete) { Object.assign(n, entete); entete = null; }
      out.push(n);
    });
    if (entete) out.push(entete);
    return out;
  }

  function _completer(cible, source) {
    Object.keys(source).forEach(k => { if (cible[k] === undefined) cible[k] = source[k]; });
    return cible;
  }

  // Clés dans l'ordre du catalogue plutôt que dans celui du texte : deux
  // captures de la même fiche doivent rendre le même objet.
  function _ordonner(b) {
    const o = {};
    CHAMPS.forEach(c => { if (b[c.cle] !== undefined) o[c.cle] = b[c.cle]; });
    return o;
  }

  function analyserFiche(texte) {
    const blocs = _blocsFiche(texte);
    if (!blocs.length) return null;
    const out = Object.assign({}, blocs[0]);

    // Deux repères au minimum, sinon c'est une capture d'autre chose : un
    // écran d'opérations contient « Solde », et cela ne suffit pas à en faire
    // une fiche.
    const forts = ['acquis', 'projete', 'plafond', 'ouverture', 'fin']
      .filter(k => out[k] !== undefined).length;
    if (forts < 2) return null;

    // Le second compartiment est rendu à part, sans être interprété : c'est au
    // module qui connaît le type de livret de dire lequel des deux est le
    // réglementé, en les comparant à son barème.
    const sur = blocs.slice(1).find(b => b.taux !== undefined || b.plafond !== undefined);
    if (sur) out.sur = sur;
    return out;
  }

  const CHAMPS_TYPE = CHAMPS.reduce((a, c) => { a[c.cle] = c.type; return a; }, {});

  // Les réponses vides que rendent les modèles quand la valeur manque, plutôt
  // que d'omettre la ligne comme on le leur demande.
  const RE_VIDE = /^(non|aucun|aucune|null|none|n\/?a|inconnu|absent|-{1,3}|\?)$/i;

  /**
   * Transforme la réponse de la deuxième passe en fiche — et jette tout ce qui
   * ne se trouve pas dans la transcription.
   *
   * C'EST ICI QUE TIENT LA GARANTIE. Un modèle interrogé sur des chiffres finit
   * par en produire un qui n'existe pas : le 13/08, llava a rendu « +225,65 € »
   * sur une image qui n'en portait aucun. Plausible, faux, et rien ne le
   * signalait. Une valeur inventée n'étant, par définition, pas dans le texte
   * transcrit, la comparer à ce texte suffit à l'écarter.
   *
   * Le modèle ne fait donc que DÉSIGNER : il ne calcule pas, il ne reformate
   * pas, et ce qu'il désigne est converti par les mêmes regex que la voie par
   * libellés. Sa seule liberté est de se tromper de valeur — visible à l'écran
   * de validation, contrairement à une valeur inventée.
   *
   * Exporté pour `scripts/t-import.cjs` : c'est la fonction à ne jamais casser.
   */
  function ficheDepuisChamps(texte, rendu) {
    // La comparaison ignore les espaces : le modèle rend « 1 234,56 » là où la
    // transcription porte « 1234,56 », et l'espace fine insécable d'un montant
    // français survit rarement à un aller-retour. Le reste est comparé tel quel.
    const foin = _sansEspaces(_redresser(String(texte || '')));
    const out = {};

    String(rendu || '').split(/\r?\n/).forEach(ligne => {
      // « acquis=19,94 € », « - acquis : 19,94 € », « **acquis** = 19,94 € ».
      const m = /^[\s\-*•]*\**\s*([a-zéè]+)\**\s*[=:]\s*(.+?)\s*$/i.exec(ligne);
      if (!m) return;
      const cle = _norm(m[1]);
      const type = CHAMPS_TYPE[cle];
      if (!type || out[cle] !== undefined) return;

      const brut = m[2].replace(/^["'«»\s]+/, '').replace(/["'«».,;\s]+$/, '');
      if (!brut || RE_VIDE.test(brut)) return;

      // LE CONTRÔLE.
      if (foin.indexOf(_sansEspaces(_redresser(brut))) === -1) return;

      const v = _valeurLibre(brut, type);
      if (v !== null) out[cle] = v;
    });

    // Au moins un repère fort, sinon c'est un solde isolé lu sur un écran
    // quelconque : cela ne fait pas une fiche de livret.
    const forts = ['acquis', 'projete', 'plafond', 'ouverture', 'fin']
      .filter(k => out[k] !== undefined).length;
    return forts >= 1 ? out : null;
  }

  function _sansEspaces(s) {
    return String(s || '').toLowerCase().replace(/[\s  ]/g, '');
  }

  /**
   * Comme `_valeur`, mais sur une valeur déjà isolée par le modèle.
   *
   * Deux différences, et elles ne valent que dans ce contexte : le symbole €
   * n'est plus exigé — il sert à repérer un montant dans une ligne, pas à le
   * valider une fois seul — et une date en toutes lettres est acceptée, parce
   * qu'une fiche écrit « 12 mars 2020 » aussi souvent que « 12/03/2020 ».
   */
  function _valeurLibre(brut, type) {
    const s = _redresser(brut);
    if (type === 'montant' && !/€|EUR/i.test(s)) return _valeur(s + ' €', type);
    if (type === 'date') {
      const v = _valeur(s, type);
      return v !== null ? v : enTeteDate(s);
    }
    return _valeur(s, type);
  }

  // Position où commence la valeur, sur une ligne DÉJÀ normalisée.
  function _indexApres(n, mots) {
    let fin = 0;
    mots.forEach(mot => { if (n.indexOf(mot) === 0) fin = Math.max(fin, mot.length); });
    if (!fin) return 0;

    // Renvoi de note collé au libellé. Une fiche porte « Intérêts
    // prévisionnels³ », et l'exposant revient aplati : « previsionnels3 ». Ce 3
    // se recolle alors au montant suivant, et « 3 0,00 EUR » se lit 30,00 € —
    // vu sur une vraie fiche de Livret A, où les intérêts valaient 0.
    // Deux chiffres au plus, et seulement s'ils sont suivis d'une espace : un
    // libellé qui finirait par un vrai nombre collé n'existe pas.
    const m = /^\d{1,2}(?=\s|$)/.exec(n.slice(fin));
    return fin + (m ? m[0].length : 0);
  }

  function _valeur(s, type) {
    if (type === 'taux') {
      const m = RE_VAL_TAUX.exec(s);
      const v = m ? Number(m[1].replace(',', '.')) : NaN;
      return (isFinite(v) && v > 0 && v <= 20) ? v : null;
    }
    if (type === 'date') {
      const m = RE_VAL_DATE.exec(s);
      return m ? window.CBImport.csv.parseDate(m[1]) : null;
    }
    const m = RE_VAL_MONTANT.exec(s);
    if (!m) return null;
    const v = window.CBImport.csv.parseMontant(m[2]);
    if (!isFinite(v)) return null;
    // Le signe d'une fiche est décoratif : « +850,00 EUR » est un solde, pas un
    // versement. On rend la valeur absolue, le sens n'a pas de place ici.
    return Math.abs(v);
  }

  // Toute lecture d'image confond un jour O et 0, l et 1 — un OCR classique
  // souvent, un modèle de vision plus rarement, mais aucun jamais. La
  // correction se fait mot par mot, et seulement sur un mot qui contient déjà
  // un chiffre : « Solde » ne doit pas devenir « 501de », mais « 1O5,OO » doit
  // devenir « 105,00 ».
  //
  // Écrit sans lookbehind à dessein : `(?<=…)` n'existe qu'à partir de
  // Safari 16.4, et une erreur de syntaxe ici emporterait tout le fichier, donc
  // les trois voies d'import, sur un iPhone un peu ancien.
  function _redresser(s) {
    return String(s || '').split(' ').map(mot => {
      if (!/\d/.test(mot)) return mot;
      // Un mot déjà mêlé de lettres et de chiffres reste ambigu — « C/C » ou un
      // numéro de compte. On ne redresse que ce qui ressemble à un nombre.
      if (!/^[+\-−–]?[\dOoLlIiSs  .,]+(?:€|EUR)?$/i.test(mot)) return mot;
      return mot.replace(/[Oo]/g, '0').replace(/[LlIi]/g, '1').replace(/[Ss]/g, '5');
    }).join(' ');
  }

  // Un montant en fin de ligne, avec son signe. Le signe est l'information
  // essentielle et la seule que l'écran mobile donne vraiment : « + 735,00 € »
  // est un versement, « - 105,00 € » un retrait.
  const RE_MONTANT = /([+\-−–])?\s*(\d[\d  .]*[,.]\d{2})\s*(?:€|EUR)/i;

  function analyserTexte(texte, aujourdHui) {
    const lignes = String(texte || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out = [], taux = [];
    let dateCourante = null;
    let attente = [];        // libellés lus depuis le dernier montant

    lignes.forEach(brut => {
      const ligne = _redresser(brut);

      const d = enTeteDate(ligne, aujourdHui);
      if (d) { dateCourante = d; attente = []; return; }

      const m = RE_MONTANT.exec(ligne);
      if (!m) {
        // Ni date ni montant : c'est un libellé, ou du décor. On le garde pour
        // la prochaine opération — sur mobile le libellé précède le montant.
        const t = ligne.replace(/\s+/g, ' ').trim();
        if (t.length > 2 && !/^(virements? internes?|hors budget[, ]*divers|op[ée]rations?|caract[ée]ristiques?|retour|solde\s*:?)$/i.test(_norm(t))) {
          attente.push(t);
        }
        return;
      }

      const val = window.CBImport.csv.parseMontant(m[2]);

      // Sur une capture, la révision de taux apparaît comme partout ailleurs :
      // une opération à 0,00 € dont le libellé porte le taux. Il est au-dessus
      // du montant, dans les libellés en attente.
      const rev = window.CBImport.revisionTaux(
        (ligne.slice(0, m.index) + ' ' + attente.join(' ')).trim(), dateCourante);
      if (rev) { taux.push(rev); attente = []; return; }

      if (!isFinite(val) || val === 0) return;
      // − (U+2212) et – (tiret demi-cadratin) sortent régulièrement d'un OCR à
      // la place du trait d'union.
      const negatif = m[1] === '-' || m[1] === '−' || m[1] === '–';

      // Le libellé peut être sur la même ligne que le montant, ou au-dessus.
      const surPlace = ligne.slice(0, m.index).replace(/\s+/g, ' ').trim();
      const label = (surPlace.length > 2 ? surPlace : attente.join(' ')).slice(0, 80);
      attente = [];

      out.push({
        d: dateCourante,
        m: negatif ? -val : val,
        label: label,
        // Un montant sans signe explicite est un pari. L'écran de validation
        // le montre comme les autres, mais on garde l'information au cas où.
        signeDeduit: !m[1],
      });
    });

    // Une opération lue avant toute date n'est pas exploitable : la capture a
    // été rognée au-dessus de l'en-tête de groupe. On la rend quand même, à la
    // date du jour, pour que le membre la corrige plutôt que de la perdre.
    const defaut = (aujourdHui || new Date()).toISOString().slice(0, 10);
    return {
      lignes: out.filter(o => o.m !== 0).map(o => ({
        d: o.d || defaut,
        m: o.m,
        label: o.label,
      })),
      taux: taux,
    };
  }

  return { lire, analyserTexte, analyserFiche, ficheDepuisChamps, enTeteDate, _redresser };
})();

// Exposé pour la suite de tests hors navigateur (scripts/t-import.cjs).
window.CBImport._outils = window.CBImport.csv;

if (typeof module !== 'undefined' && module.exports) module.exports = window.CBImport;
