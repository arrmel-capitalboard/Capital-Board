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
//    • le fichier est lu dans le navigateur et n'est JAMAIS téléversé ;
//    • seules les lignes cochées par le membre sont écrites ;
//    • le fichier d'origine n'est jamais conservé, aucune copie, aucun cache.
//  Ces trois points sont affichés sur l'écran d'import, pas seulement dans les
//  CGU : c'est ce qui fait accepter le dépôt d'un relevé.
//
//  Chargé après app.js, dont il utilise les globales (_depParse, _attr…).
// ═══════════════════════════════════════════════════════════════════════════

window.CBImport = (function () {
  'use strict';

  // Destination courante. Posée par open(), oubliée à la fermeture — rien de ce
  // qui vient du fichier ne survit à ce module.
  let _dest   = null;
  let _lignes = [];     // { d, m, label, ok }
  let _source = '';     // nom du parseur qui a produit les lignes, pour l'entête

  // ─── Ouverture ───────────────────────────────────────────────────────────
  //
  // dest = {
  //   titre    : titre du modal
  //   sous     : sous-titre
  //   existant : [{ d, m }] déjà saisis, pour signaler les doublons
  //   onValider: (lignes) => void, reçoit [{ d, m, label }]
  // }
  function open(dest) {
    _dest   = dest || {};
    _lignes = [];
    _source = '';
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
    _source = '';
    const input = document.getElementById('imp-file');
    if (input) input.value = '';
  }

  // ─── Réception du fichier ────────────────────────────────────────────────

  function onFile(ev) {
    const f = ev && ev.target && ev.target.files && ev.target.files[0];
    if (f) lire(f);
    if (ev && ev.target) ev.target.value = '';   // même fichier redéposable
  }

  function onDrop(ev) {
    ev.preventDefault();
    _dragOff();
    const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f) lire(f);
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
  async function lire(file) {
    const nom = (file.name || '').toLowerCase();
    const ext = nom.slice(nom.lastIndexOf('.') + 1);
    const mime = file.type || '';

    _etape('lecture');
    _text('imp-lecture-nom', file.name || 'fichier');
    _text('imp-lecture-etat', 'Lecture en cours…');

    try {
      let lignes;
      if (ext === 'csv' || ext === 'txt' || ext === 'tsv' ||
          mime === 'text/csv' || mime.indexOf('excel') >= 0 || mime.indexOf('spreadsheet') >= 0) {
        lignes = await window.CBImport.csv.lire(file);
        _source = 'CSV';
      } else if (ext === 'pdf' || mime === 'application/pdf') {
        if (!window.CBImport.pdf) throw new Error('La lecture des PDF n’est pas encore disponible.');
        lignes = await window.CBImport.pdf.lire(file, m => _text('imp-lecture-etat', m));
        _source = 'PDF';
      } else if (mime.indexOf('image/') === 0 || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        if (!window.CBImport.ocr) throw new Error('La lecture des captures n’est pas encore disponible.');
        lignes = await window.CBImport.ocr.lire(file, m => _text('imp-lecture-etat', m));
        _source = 'capture';
      } else {
        throw new Error('Format non reconnu. Déposez un CSV, un PDF ou une capture d’écran.');
      }

      if (!lignes.length) {
        throw new Error('Aucune opération trouvée dans ce fichier. ' +
          'Vérifiez qu’il contient bien un relevé, avec une date et un montant par ligne.');
      }

      // Les plus anciennes d'abord : c'est l'ordre dans lequel elles seront
      // saisies, et celui du calcul par quinzaines.
      lignes.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
      _lignes = lignes.map(l => Object.assign({}, l, { ok: !l.doublon }));
      _rendre();
      _etape('validation');
    } catch (e) {
      console.error('[import]', e);
      _etape('depot');
      _hide('imp-erreur', false);
      _text('imp-erreur', e && e.message ? e.message : 'Lecture impossible.');
    }
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
          (l.doublon ? '<i class="imp-tag">déjà saisi</i>' : '') +
        '</span>' +
        '<input class="imp-m' + (l.m < 0 ? ' neg' : '') + '" type="text" inputmode="decimal"' +
          ' value="' + _attr(_fmtMontant(l.m)) + '"' +
          ' onchange="CBImport.set(' + i + ',\'m\',this.value)">' +
      '</div>'
    ).join('');
    _majPied();
  }

  function _majPied() {
    const retenues = _lignes.filter(l => l.ok);
    const somme = retenues.reduce((s, l) => s + l.m, 0);
    _text('imp-count',
      retenues.length + ' ligne' + (retenues.length > 1 ? 's' : '') + ' sur ' + _lignes.length +
      ' · solde ' + (somme >= 0 ? '+' : '') + _fmtMontant(somme) + ' €');
    const btn = document.getElementById('imp-ok');
    if (btn) btn.disabled = !retenues.length;
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
    if (!retenues.length) return;
    const fn = _dest && _dest.onValider;
    close();
    if (fn) fn(retenues);
  }

  function retour() { _etape('depot'); }

  // ─── Rouages d'affichage ─────────────────────────────────────────────────

  function _etape(nom) {
    ['depot', 'lecture', 'validation'].forEach(e => {
      const el = document.getElementById('imp-etape-' + e);
      if (el) el.hidden = (e !== nom);
    });
    // Le pied ne porte le compte et le bouton d'ajout qu'une fois qu'il y a
    // quelque chose à ajouter.
    _hide('imp-count', nom !== 'validation');
    _hide('imp-ok',    nom !== 'validation');
  }

  function _text(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }
  function _hide(id, v) { const el = document.getElementById(id); if (el) el.hidden = !!v; }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _fmtMontant(n) {
    return (Math.round(Number(n) * 100) / 100).toFixed(2).replace('.', ',');
  }

  return {
    open, close, onFile, onDrop, onDragOver, dragOff: _dragOff,
    setOk, set, toutCocher, valider, retour,
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
    return analyser(texte);
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
    date:   ['date de comptabilisation', 'date operation', 'date d operation', 'date valeur',
             'date de valeur', 'date', 'jour'],
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

  function analyser(texte) {
    const brut = texte.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
    if (brut.length < 2) return [];
    const sep = _separateur(brut);

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
    if (!cols) return [];

    const lignes = [];
    (iEntete >= 0 ? corps : brut.map(l => _decouper(l, sep))).forEach(vals => {
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
      if (!isFinite(m) || m === 0) return;

      const label = cols.label >= 0 ? String(vals[cols.label] || '').replace(/\s+/g, ' ').trim() : '';
      lignes.push({ d, m, label: label.slice(0, 80) });
    });
    return lignes;
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

  return { lire, analyser, parseDate, parseMontant, _decouper, _separateur };
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

  function _norm(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
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
    const out = [];

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
      if (!isFinite(m) || m === 0) return;

      const label = l.items.slice(iDate + 1)
        .map(it => it.str.trim())
        .filter(s => !/^[\d,. ]*(?:€|EUR)?$/i.test(s))
        .join(' ').replace(/\s+/g, ' ').trim();

      out.push({ d, m, label: label.slice(0, 80) });
    });
    return out;
  }

  return { lire, analyser, _lignesDePage, _montantsDe, _colonnes };
})();

// Exposé pour la suite de tests hors navigateur (scripts/t-import.cjs).
window.CBImport._outils = window.CBImport.csv;

if (typeof module !== 'undefined' && module.exports) module.exports = window.CBImport;
