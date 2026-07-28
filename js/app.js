// ─── MOTION OVERRIDE (voir les anims malgré prefers-reduced-motion) ───
// Flag localStorage 'cb_force_motion'=='1' → force les animations.
// Console : toggleMotion()  pour activer/désactiver puis recharger.
try { if (localStorage.getItem('cb_force_motion') === '1') document.documentElement.classList.add('force-motion'); } catch(_) {}
function _reduceMotion() {
  try { if (localStorage.getItem('cb_force_motion') === '1') return false; } catch(_) {}
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
window.toggleMotion = function() {
  let on = false;
  try { on = localStorage.getItem('cb_force_motion') === '1'; localStorage.setItem('cb_force_motion', on ? '0' : '1'); } catch(_) {}
  console.log('[motion] anims forcées : ' + (!on));
  location.reload();
};

// ─── ICON SYSTEM (colored SVG) ─────────────────────────
const IC = {
  briefcase: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
  bell:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  target:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9f43" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  wallet:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00cec9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/></svg>',
  barchart:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  gift:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
  trophy:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 4H4v7a5 5 0 0 0 10 0V4H7z"/><path d="M17 4h3v7a5 5 0 0 1-5 5"/></svg>',
  trending:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e09e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  clock:     '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  zap:       '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  calendar:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  crown:     '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e17055" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="m4 20 4-12 4 7 4-10 4 15"/></svg>',
  user:      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  message:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fd79a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  list:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  trash:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  trendDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
  bellOff:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  phone:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  mail:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  moon:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  inbox:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  scroll:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  checkCirc: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e09e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  square:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>',
  lock:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  save:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00cec9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  eye:       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit:      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  coin:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9.5a3 3 0 0 0-2.5-1.5h-1a3 3 0 0 0 0 6h1a3 3 0 0 1 0 6h-1A3 3 0 0 1 9 18"/><line x1="12" y1="5" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="19"/></svg>',
  warning:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  dotGold:   '<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="#f5b731"/></svg>',
  dotGreen:  '<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="#00e09e"/></svg>',
  dotRed:    '<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="#ff4d6a"/></svg>',
};

// ─── FIREBASE AUTH ────────────────────────────────────
// ─── FIREBASE (chargement dynamique, compatible sans bundler) ─────
let fbApp, fbAuth, db,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification,
    signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
    signInWithRedirect, getRedirectResult,
    updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser,
    getFirestoreDoc, getDocFromServer, setFirestoreDoc, firestoreDoc, firestoreCollection, deleteFirestoreDoc, getDocs,
    addFirestoreDoc, onSnapshot, firestoreQuery, firestoreWhere, firestoreOrderBy, serverTimestamp,
    firestoreArrayUnion, firestoreArrayRemove, firestoreOr, firestoreDeleteField;

let fbStorage = null, fbStorageRef, fbStorageUploadBytes, fbStorageGetDownloadURL;
let fcmMessaging = null, getFCMToken, onFCMMessage;
let _fcmMsgHandlerSet = false;   // évite d'empiler le listener onMessage (toasts en double)
// VAPID key : Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
const VAPID_KEY = 'BJH8L9RSirzMMmN9b1PwTVPj-2DDWAzDtJy_2000H_D0HA90aNu8-EWqVYgJA6W6Tn4eL4i2JW_yp1bvvrHpHkQ';

// Version de l'app — à bumper à chaque déploiement (sync avec version.json)
const APP_VERSION = '20260729a';

const WORKER_URL = 'https://api.capitalboard.fr';
const TURNSTILE_SITEKEY = '0x4AAAAAADn5LAr4t8vCvyjS';

// Liaison Discord : capture le token avant l'authentification (il survit au login).
try {
  const _dl = new URLSearchParams(location.search).get('dl');
  if (_dl) sessionStorage.setItem('pendingDiscordLink', _dl);
} catch (_) {}

const _turnstileState = {}; // 'pending' | 'ready' | 'error'

window.onTurnstileLoginSuccess   = () => { _turnstileState['turnstile-login']    = 'ready'; };
window.onTurnstileLoginError     = () => { _turnstileState['turnstile-login']    = 'error'; };
window.onTurnstileRegisterSuccess = () => { _turnstileState['turnstile-register'] = 'ready'; };
window.onTurnstileRegisterError   = () => { _turnstileState['turnstile-register'] = 'error'; };
window.onTurnstileForgotSuccess   = () => { _turnstileState['turnstile-forgot']   = 'ready'; };
window.onTurnstileForgotError     = () => { _turnstileState['turnstile-forgot']   = 'error'; };

function _checkTurnstile(containerId) {
  const state = _turnstileState[containerId];
  if (!state || state === 'pending') return 'pending';
  return state; // 'ready' ou 'error'
}

function _getTurnstileToken(containerId) {
  const el = document.getElementById(containerId);
  return el?.querySelector('[name="cf-turnstile-response"]')?.value || null;
}

function _resetTurnstile(containerId) {
  _turnstileState[containerId] = 'pending';
  const el = document.getElementById(containerId);
  if (el && window.turnstile) window.turnstile.reset(el);
}

// 2FA device-based — durée trust appareil
const DEVICE_TRUST_DAYS = 90;
const DEVICE_TRUST_MS   = DEVICE_TRUST_DAYS * 24 * 60 * 60 * 1000;

let _splashWatchdog = null;
function _hideSplash() {
  if (_splashWatchdog) { clearTimeout(_splashWatchdog); _splashWatchdog = null; }
  const s = document.getElementById('splash-screen');
  if (s) s.style.display = 'none';
}
function _splashError(msg) {
  if (_splashWatchdog) { clearTimeout(_splashWatchdog); _splashWatchdog = null; }
  const err  = document.getElementById('splash-error');
  const sp   = document.getElementById('splash-spinner');
  const txt  = document.getElementById('splash-text');
  const btn  = document.getElementById('splash-reload');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
  if (sp)  sp.style.display = 'none';
  if (txt) txt.style.display = 'none';
  if (btn) btn.style.display = 'inline-block';
}

// Filet de sécurité : si l'app n'a pas démarré après 15 s (réseau bloqué,
// CDN Firebase injoignable…), on sort de l'écran de chargement avec une erreur.
_splashWatchdog = setTimeout(() => {
  const s = document.getElementById('splash-screen');
  if (s && s.style.display !== 'none') {
    _splashError("Le chargement prend trop de temps. Vérifiez votre connexion internet puis rechargez.");
  }
}, 20000);

(async function initFirebase() {
 try {
  // Imports Firebase en PARALLÈLE (au lieu de 6 imports CDN séquentiels).
  // Sur mobile à forte latence, le séquentiel cumulait les allers-retours et
  // dépassait le watchdog de 15 s (« chargement trop long »).
  const V = "https://www.gstatic.com/firebasejs/10.12.0/";
  const [appMod, auth, firestore, appCheckMod, msgMod, storageMod] = await Promise.all([
    import(V + "firebase-app.js"),
    import(V + "firebase-auth.js"),
    import(V + "firebase-firestore.js"),
    import(V + "firebase-app-check.js").catch(e => (console.warn('[appcheck] import KO:', e.message), null)),
    import(V + "firebase-messaging.js").catch(e => (console.warn('[fcm] import KO:', e.message), null)),
    import(V + "firebase-storage.js").catch(e => (console.warn('[storage] import KO:', e.message), null)),
  ]);
  const { initializeApp } = appMod;

  createUserWithEmailAndPassword = auth.createUserWithEmailAndPassword;
  signInWithEmailAndPassword     = auth.signInWithEmailAndPassword;
  sendEmailVerification          = auth.sendEmailVerification;
  signOut                        = auth.signOut;
  onAuthStateChanged             = auth.onAuthStateChanged;
  GoogleAuthProvider             = auth.GoogleAuthProvider;
  signInWithPopup                = auth.signInWithPopup;
  signInWithRedirect             = auth.signInWithRedirect;
  getRedirectResult              = auth.getRedirectResult;
  updateProfile                  = auth.updateProfile;
  updatePassword                 = auth.updatePassword;
  reauthenticateWithCredential   = auth.reauthenticateWithCredential;
  EmailAuthProvider              = auth.EmailAuthProvider;
  deleteUser                     = auth.deleteUser;

  getFirestoreDoc     = firestore.getDoc;
  getDocFromServer    = firestore.getDocFromServer;
  setFirestoreDoc     = firestore.setDoc;
  firestoreDoc        = firestore.doc;
  firestoreCollection = firestore.collection;
  deleteFirestoreDoc  = firestore.deleteDoc;
  getDocs             = firestore.getDocs;
  addFirestoreDoc     = firestore.addDoc;
  onSnapshot          = firestore.onSnapshot;
  firestoreQuery      = firestore.query;
  firestoreWhere      = firestore.where;
  firestoreOrderBy    = firestore.orderBy;
  serverTimestamp     = firestore.serverTimestamp;
  firestoreArrayUnion  = firestore.arrayUnion;
  firestoreArrayRemove = firestore.arrayRemove;
  firestoreOr          = firestore.or;
  firestoreDeleteField = firestore.deleteField;

  fbApp  = initializeApp(firebaseConfig);

  // App Check — protège Firestore et Auth contre les appels hors navigateur
  if (appCheckMod) try {
    const appCheck = appCheckMod.initializeAppCheck(fbApp, {
      provider: new appCheckMod.ReCaptchaV3Provider('6LcrZwstAAAAAIOKXUFbgxO49SUoVmoQycZf3Ekq'),
      isTokenAutoRefreshEnabled: true,
    });
    // Exposés pour pouvoir vérifier l'obtention d'un jeton depuis la console :
    //   await checkAppCheck()
    window._appCheck = appCheck;
    window._appCheckMod = appCheckMod;
  } catch(e) { console.warn('[appcheck] init échoué:', e.message); }

  fbAuth = auth.getAuth(fbApp);
  db     = firestore.getFirestore(fbApp);

  if (msgMod) try {
    getFCMToken  = msgMod.getToken;
    onFCMMessage = msgMod.onMessage;
    fcmMessaging = msgMod.getMessaging(fbApp);
  } catch(e) { console.warn('FCM unavailable:', e.message); }

  if (storageMod) try {
    fbStorage = storageMod.getStorage(fbApp);
    fbStorageRef = storageMod.ref;
    fbStorageUploadBytes = storageMod.uploadBytes;
    fbStorageGetDownloadURL = storageMod.getDownloadURL;
  } catch(e) { console.warn('Storage unavailable:', e.message); }

  // Google Sign-In : récupère le résultat du signInWithRedirect (iOS/PWA standalone).
  try {
    const redirectResult = await getRedirectResult(fbAuth);
    if (redirectResult && redirectResult.user) {
      const isNew = redirectResult._tokenResponse && redirectResult._tokenResponse.isNewUser;
      if (isNew) {
        // Inscriptions fermées : refuse le nouveau compte Google
        if (!(await _isSignupOpen())) {
          try { await redirectResult.user.delete(); } catch(_) {}
          try { await signOut(fbAuth); } catch(_) {}
          const errEl = document.getElementById('login-error');
          if (errEl) errEl.textContent = 'Les inscriptions sont temporairement fermées.';
        } else {
          try { localStorage.setItem('signup_auto_trust', '1'); } catch(_) {}
        }
      }
    }
  } catch(e) {
    console.warn('[google] getRedirectResult:', e && e.message);
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.textContent = 'Connexion Google impossible : ' + (e && (e.message || e.code) || 'erreur');
  }

  if (window.IS_DEMO) {
    startApp({
      uid: 'demo-user',
      email: 'demo@capitalboard.fr',
      displayName: 'Démo',
      providerData: [{ providerId: 'password' }],
      metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
      emailVerified: true,
      photoURL: null
    });
  } else {
    auth.onAuthStateChanged(fbAuth, async user => {
      if (!user) { stopApp(); return; }
      // Gate vérification email — providers OAuth (Google) ont emailVerified=true direct
      try { await user.reload(); } catch(_) {}
      const u = fbAuth.currentUser || user;
      if (!u.emailVerified) {
        showVerifyView(u.email);
        return;
      }
      // Gate maintenance — bloque tout le monde sauf admin
      try {
        const cfg = await _getAppConfig();
        if (cfg.maintenance && u.uid !== ADMIN_UID) {
          showMaintenanceScreen(cfg.maintenanceMsg);
          return;
        }
      } catch(_) { /* fail-open : pas de blocage si lecture KO */ }
      // Gate 2FA device — vérif appareil de confiance (90j)
      try {
        const deviceId = _getDeviceId();
        // Signup : auto-trust 1er device après vérif email
        let autoTrust = false;
        try { autoTrust = localStorage.getItem('signup_auto_trust') === '1'; } catch(_) {}
        if (autoTrust) {
          try { await u.getIdToken(true); } catch(_) {}
          try {
            const ipInfo = await _fetchIpInfo();
            await _addTrustedDevice(u.uid, deviceId, _getDeviceLabel(), ipInfo);
          } catch(_) {}
          try { localStorage.removeItem('signup_auto_trust'); } catch(_) {}
        } else {
          const trusted = await _isDeviceTrusted(u.uid, deviceId);
          if (!trusted) {
            showDeviceVerifyView(u.email);
            return;
          }
          // Trusted → bump lastSeen async (pas bloquant)
          _updateDeviceLastSeen(u.uid, deviceId);
        }
      } catch(e) {
        console.error('[2fa] device check échoué:', e);
        // En cas d'erreur Firestore : fail-open (laisse passer) pour éviter lockout
      }
      // Gate PIN — obligatoire pour tous les users, à chaque chargement (refresh inclus)
      try {
        // Kill-switch global (admin) : désactive le PIN pour TOUS les comptes.
        // Erreur de lecture → on garde le PIN actif (fail-safe, pas de bypass).
        if (await _isPinGloballyDisabled()) {
          startApp(u);
          return;
        }
        const pinOn = await _isPinEnabled(u.uid);
        if (!pinOn) {
          // Compte sans PIN : force la configuration avant l'accès
          showPinSetupView(u);
          return;
        }
        showPinLockView(u);
        return;
      } catch(e) {
        console.error('[pin] check échoué:', e);
        // Fail-open : laisse passer en cas d'erreur Firestore (évite lockout)
      }
      startApp(u);
    });
  }
 } catch(e) {
   console.error('Échec initialisation Firebase:', e);
   _splashError("Impossible de charger l'application. Vérifiez votre connexion internet puis rechargez la page.");
 }
})();

const firebaseConfig = {
  apiKey: "AIzaSyBnHkOTwFoJNMvYOgG7Ne-AFKgE3GBRiNU",
  authDomain: "capitalboard.firebaseapp.com",
  projectId: "capitalboard",
  storageBucket: "capitalboard.firebasestorage.app",
  messagingSenderId: "719745213666",
  appId: "1:719745213666:web:02a3276a6348df7fed6abb"
};


let currentUser = null;

// ─── COUCHE DONNÉES FIRESTORE (cache synchrone + sync arrière-plan) ──────
// Les lectures/écritures sont SYNCHRONES via un cache mémoire.
// Firestore est chargé au démarrage et écrit en arrière-plan.

const _localCache = {};

// Charge toutes les données depuis Firestore au démarrage
async function loadAllUserData(uid) {
  if (!uid) return;
  if (window.IS_DEMO) {
    try {
      const resp = await fetch('data/demo-portfolio.json', { cache: 'no-store' });
      const data = await resp.json();
      _localCache[uid + '_portfolio']    = data.portfolio    || [];
      _localCache[uid + '_transactions'] = data.transactions || [];
      _localCache[uid + '_versements']   = data.versements   || [];
      _localCache[uid + '_watchlist']    = data.watchlist    || [];
      _localCache[uid + '_dailyValues']  = data.dailyValues  || [];
      _localCache[uid + '_alerts']       = data.alerts       || [];
      _localCache[uid + '_notifHistory'] = data.notifHistory || [];
      _localCache[uid + '_trCohort']     = data.trCohort     || [];
      _localCache[uid + '_divIgnored']   = data.divIgnored   || [];
      _localCache[uid + '_settings']     = data.settings     || { pushRecap: false };
      _localCache[uid + '_recap']        = data.recap        || null;
      _localCache[uid + '_weeklyRecap']  = data.weeklyRecap  || null;
    } catch(e) {
      console.error('Demo dataset load failed:', e);
    }
    return;
  }
  if (!db) return;
  // Enregistrer l'email pour la recherche par email (gestion des rôles)
  const _u = fbAuth.currentUser;
  if (_u) setFirestoreDoc(firestoreDoc(db, 'users', uid), { email: _u.email }, { merge: true }).catch(() => {});
  const cols = ['portfolio', 'transactions', 'versements', 'watchlist', 'dailyValues', 'alerts', 'notifHistory', 'trCohort', 'divIgnored'];
  await Promise.all(cols.map(async col => {
    try {
      const snap = await getFirestoreDoc(firestoreDoc(db, 'users', uid, 'data', col));
      _localCache[uid + '_' + col] = snap.exists() ? (snap.data().items || []) : [];
    } catch(e) {
      _localCache[uid + '_' + col] = [];
    }
  }));
  // Charger les settings
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'users', uid, 'data', 'settings'));
    _localCache[uid + '_settings'] = snap.exists() ? snap.data() : { pushRecap: true };
  } catch(e) {
    _localCache[uid + '_settings'] = { pushRecap: true };
  }
  // Appliquer préférence en attente (premier compte)
  if (window._pendingRecapPref !== undefined) {
    await saveUserSettings(uid, { pushRecap: window._pendingRecapPref });
    window._pendingRecapPref = undefined;
  }
  // Charger le dernier récap quotidien + rapport hebdo (générés serveur)
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'users', uid, 'data', 'recap'));
    _localCache[uid + '_recap'] = snap.exists() ? snap.data() : null;
  } catch(e) {
    _localCache[uid + '_recap'] = null;
  }
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'users', uid, 'data', 'weeklyRecap'));
    _localCache[uid + '_weeklyRecap'] = snap.exists() ? snap.data() : null;
  } catch(e) {
    _localCache[uid + '_weeklyRecap'] = null;
  }
}

function getUserSettings(uid) {
  return _localCache[(uid||currentUser) + '_settings'] || { pushRecap: true };
}

function getRecap(uid) {
  return _localCache[(uid || currentUser) + '_recap'] || null;
}

function getWeeklyRecap(uid) {
  return _localCache[(uid || currentUser) + '_weeklyRecap'] || null;
}

async function saveUserSettings(uid, settings) {
  const current = getUserSettings(uid);
  const merged  = { ...current, ...settings };
  _localCache[(uid||currentUser) + '_settings'] = merged;
  if (window.IS_DEMO) return;
  if (!db) return;
  await setFirestoreDoc(firestoreDoc(db, 'users', uid||currentUser, 'data', 'settings'), merged);
}

// Lecture synchrone depuis le cache
// Une seule entrée nulle dans le portefeuille fait planter renderPortfolio()
// (row.qty) ET refreshPrices() (row.ticker) — les deux tournant sous try/catch,
// l'échec est silencieux : plus de mise à jour des cours ni d'animation. On
// écarte donc les lignes invalides à la lecture, en gardant le tableau
// d'origine tant qu'il est sain (son identité sert aux appelants qui le mutent).
function getPortfolio(user) {
  const raw = _localCache[(user||currentUser) + '_portfolio'];
  if (!Array.isArray(raw)) return [];
  const ok = (r) => r && typeof r === 'object';
  return raw.every(ok) ? raw : raw.filter(ok);
}
function getTransactions(user) { return _localCache[(user||currentUser) + '_transactions'] || []; }
function getVersements(user)   { return _localCache[(user||currentUser) + '_versements']   || []; }
function getWatchlist(user)    { return _localCache[(user||currentUser) + '_watchlist']    || []; }
function getDailyValues(user)  { return _localCache[(user||currentUser) + '_dailyValues']  || []; }

// Écriture synchrone dans le cache + Firestore en arrière-plan
function savePortfolio(user, data)    { _perfCache = null; _fsWrite(user||currentUser, 'portfolio',    data); }
function saveTransactions(user, data) { _perfCache = null; _fsWrite(user||currentUser, 'transactions', data); }
function saveVersements(user, data)   { _perfCache = null; _fsWrite(user||currentUser, 'versements',   data); }
function saveWatchlist(user, data)    { _fsWrite(user||currentUser, 'watchlist',    data); }
function saveDailyValues(user, data)  { _perfCache = null; _fsWrite(user||currentUser, 'dailyValues', data); }
// trCohort : résultat de perf cohorte importé depuis un CSV Trade Republic (objet unique en array)
function getTRCohort(user)  { const a = _localCache[(user||currentUser) + '_trCohort']; return (a && a[0]) || null; }
function saveTRCohort(user, obj) { _perfCache = null; _fsWrite(user||currentUser, 'trCohort', obj ? [obj] : []); }
// divIgnored : dividendes auto-détectés (Yahoo) que l'utilisateur a supprimés
// depuis l'Activité. Sans ces « pierres tombales », _autoLogDividends() les
// re-crée au chargement suivant et la suppression paraît sans effet.
function getDivIgnored(user)  { return _localCache[(user||currentUser) + '_divIgnored'] || []; }
function saveDivIgnored(user, data) { _fsWrite(user||currentUser, 'divIgnored', data); }
function _divKey(ticker, date) { return (ticker || '') + '|' + (date || ''); }
function isDivIgnored(ticker, date) { return getDivIgnored().includes(_divKey(ticker, date)); }

function getAlerts(user)       { return _localCache[(user||currentUser) + '_alerts']       || []; }
function getNotifHistory(user) { return _localCache[(user||currentUser) + '_notifHistory']  || []; }
function saveAlerts(user, data)       { _fsWrite(user||currentUser, 'alerts',       data); }
function saveNotifHistory(user, data) { _fsWrite(user||currentUser, 'notifHistory',  data); }

// ─── LIAISON DISCORD ──────────────────────────────────────────────
// Flux : l'utilisateur tape /link sur Discord → le bot crée
// discordLinkRequests/{token} et donne un lien capitalboard.fr/app.html?dl=TOKEN.
// Ouvert ici en étant connecté, on appelle le Worker qui vérifie l'idToken
// et écrit le lien (discordLinks/{discordId} = {uid}). Aucune écriture cliente.
async function _processDiscordLink(user) {
  if (window.IS_DEMO || !user) return;
  const params = new URLSearchParams(location.search);
  const token = params.get('dl') || sessionStorage.getItem('pendingDiscordLink');
  if (!token) return;
  sessionStorage.removeItem('pendingDiscordLink');
  // Nettoie l'URL (retire ?dl=...).
  if (params.get('dl')) {
    params.delete('dl');
    const q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }
  try {
    const idToken = await user.getIdToken();
    const res = await fetch(WORKER_URL + '/discord-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, token }),
    });
    const data = await res.json().catch(() => ({}));
    const discordIcon = '<svg width="34" height="26" viewBox="0 0 71 55" fill="#5865F2" aria-hidden="true"><path d="M60.1 4.9A58.6 58.6 0 0 0 45.5.36a.22.22 0 0 0-.23.1c-.63 1.12-1.33 2.58-1.82 3.73a54 54 0 0 0-16.23 0 37.4 37.4 0 0 0-1.85-3.73.23.23 0 0 0-.23-.1A58.4 58.4 0 0 0 10.3 4.9a.2.2 0 0 0-.1.08C.96 18.7-1.58 32.15.04 45.43a.24.24 0 0 0 .09.16 58.9 58.9 0 0 0 17.74 8.97.23.23 0 0 0 .25-.08c1.37-1.87 2.59-3.84 3.63-5.92a.22.22 0 0 0-.12-.31 38.8 38.8 0 0 1-5.54-2.64.23.23 0 0 1-.02-.38c.37-.28.74-.57 1.1-.86a.22.22 0 0 1 .23-.03c11.62 5.3 24.2 5.3 35.68 0a.22.22 0 0 1 .23.03c.36.3.73.58 1.1.86a.23.23 0 0 1-.02.38 36.4 36.4 0 0 1-5.54 2.64.22.22 0 0 0-.12.31 46.5 46.5 0 0 0 3.63 5.91.23.23 0 0 0 .25.09 58.7 58.7 0 0 0 17.77-8.97.23.23 0 0 0 .09-.16c1.94-15.35-2.06-28.69-8.7-40.45a.18.18 0 0 0-.09-.09ZM23.73 37.34c-3.5 0-6.38-3.21-6.38-7.15 0-3.95 2.82-7.16 6.38-7.16 3.58 0 6.43 3.24 6.38 7.16 0 3.94-2.83 7.15-6.38 7.15Zm23.59 0c-3.5 0-6.38-3.21-6.38-7.15 0-3.95 2.82-7.16 6.38-7.16 3.59 0 6.43 3.24 6.38 7.16 0 3.94-2.79 7.15-6.38 7.15Z"/></svg>';
    if (res.ok && data.ok) {
      showConfirmModal({
        icon: discordIcon,
        title: 'Compte Discord lié',
        body: 'Votre compte Discord est maintenant lié. Utilisez /portefeuille sur le serveur Discord pour consulter vos données.',
        okLabel: 'Parfait',
        infoOnly: true,
      });
    } else {
      showConfirmModal({
        icon: discordIcon,
        title: 'Liaison Discord échouée',
        body: data.error || 'Lien invalide ou expiré. Refaites /link sur Discord pour obtenir un nouveau lien.',
        okLabel: 'OK',
        infoOnly: true,
      });
    }
  } catch (e) {
    console.error('discord link', e);
    showConfirmModal({
      title: 'Liaison Discord échouée',
      body: 'Une erreur est survenue. Réessayez dans un instant.',
      okLabel: 'OK',
      infoOnly: true,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
//  EXPORT / IMPORT — sauvegarde complète d'un compte en JSON
//  Inclut : portfolio, transactions, versements, watchlist, dailyValues, settings.
//  N'inclut PAS : email ni mot de passe (gérés par Firebase Auth).
// ─────────────────────────────────────────────────────────────────
function exportAllUserData() {
  const uid = currentUser;
  if (!uid) { alert('Vous devez être connecté.'); return; }

  const payload = {
    _meta: {
      format: 'capital-board-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      uid: uid,
    },
    portfolio:    getPortfolio(uid),
    transactions: getTransactions(uid),
    versements:   getVersements(uid),
    watchlist:    getWatchlist(uid),
    dailyValues:  getDailyValues(uid),
    settings:     getUserSettings(uid),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
              + '_' + String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0');
  a.href = url;
  a.download = 'capital-board-backup_' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importAllUserData(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = ''; // permettre de ré-importer le même fichier
  if (!file) return;
  const uid = currentUser;
  if (!uid) { alert('Vous devez être connecté.'); return; }

  // Lecture
  let payload;
  try {
    const txt = await file.text();
    payload = JSON.parse(txt);
  } catch(e) {
    alert('Fichier JSON invalide.');
    return;
  }

  // Validation minimale
  if (!payload || typeof payload !== 'object' || !payload._meta || !['capital-board-export', 'dashboard-pea-export'].includes(payload._meta.format)) {
    alert('Ce fichier n\'est pas un export valide de Capital Board.');
    return;
  }

  // Compter les items pour la confirmation
  const counts = {
    portfolio:    (payload.portfolio    || []).length,
    transactions: (payload.transactions || []).length,
    versements:   (payload.versements   || []).length,
    watchlist:    (payload.watchlist    || []).length,
    dailyValues:  (payload.dailyValues  || []).length,
  };
  const total = Object.values(counts).reduce((s,n) => s+n, 0);

  const msg = 'Importer l\'export suivant ?\n\n'
    + '• Portefeuille : ' + counts.portfolio + ' lignes\n'
    + '• Transactions : ' + counts.transactions + '\n'
    + '• Versements   : ' + counts.versements + '\n'
    + '• Watchlist    : ' + counts.watchlist + '\n'
    + '• Valorisations quotidiennes : ' + counts.dailyValues + '\n\n'
    + 'Exporté le : ' + (payload._meta.exportedAt || '?') + '\n\n'
    + '⚠ Cela REMPLACE toutes les données actuelles de votre compte.';

  if (!confirm(msg)) return;

  // Application
  try {
    if (Array.isArray(payload.portfolio))    savePortfolio(uid, payload.portfolio);
    if (Array.isArray(payload.transactions)) saveTransactions(uid, payload.transactions);
    if (Array.isArray(payload.versements))   saveVersements(uid, payload.versements);
    if (Array.isArray(payload.watchlist))    saveWatchlist(uid, payload.watchlist);
    if (Array.isArray(payload.dailyValues))  saveDailyValues(uid, payload.dailyValues);
    if (payload.settings && typeof payload.settings === 'object') {
      await saveUserSettings(uid, payload.settings);
    }
  } catch(e) {
    alert('Erreur pendant l\'import : ' + (e.message || e));
    return;
  }

  alert('✓ Import réussi (' + total + ' éléments). La page va être rechargée.');
  location.reload();
}

window.exportAllUserData = exportAllUserData;
window.importAllUserData = importAllUserData;

function _fsWrite(uid, col, data) {
  _localCache[uid + '_' + col] = data;
  if (window.IS_DEMO) return;
  if (!db) return;
  setFirestoreDoc(firestoreDoc(db, 'users', uid, 'data', col), { items: data })
    .catch(e => console.warn('Firestore write error:', col, e));
}

// Suppression complète des données utilisateur
async function deleteAllUserData(uid) {
  const del = (path) => deleteFirestoreDoc(firestoreDoc(db, ...path)).catch(() => {});

  // Docs sous users/{uid}/data
  const dataDocs = [
    'portfolio', 'transactions', 'versements', 'watchlist',
    'dailyValues', 'alerts', 'notifHistory', 'trCohort', 'divIgnored',
    'settings', 'recap', 'weeklyRecap', 'fcmTokens'
  ];

  // Support chat messages (besoin getDocs avant delete)
  const supportMsgsTask = (async () => {
    try {
      const msgsCol = firestoreCollection(db, 'supportChats', uid, 'messages');
      const msgs = await getDocs(msgsCol);
      await Promise.all(msgs.docs.map(d => deleteFirestoreDoc(d.ref).catch(() => {})));
    } catch(_) {}
  })();

  // Storage support-attachments : skip (bucket CORS non configuré + en pratique 0 fichier).
  // À réactiver si pièces jointes chat support ré-implémentées + bucket CORS configuré.
  const storageTask = Promise.resolve();

  // Tout en parallèle
  await Promise.all([
    ...dataDocs.map(d => del(['users', uid, 'data', d])),
    del(['users', uid]),
    del(['supportChats', uid]),
    del(['supportThreads', uid]),
    del(['presence', uid]),
    del(['roles', uid]),
    supportMsgsTask,
    storageTask,
  ]);
}

// logTransaction reste synchrone
function logTransaction(user, tx) {
  const txs = getTransactions(user);
  txs.push({ ...tx, id: Date.now() });
  saveTransactions(user, txs);
}

// ─── HELPERS ERREURS FIREBASE ─────────────────────────
function firebaseErrorMsg(code) {
  const msgs = {
    'auth/invalid-email':            'Adresse email invalide.',
    'auth/user-not-found':           'Aucun compte avec cet email.',
    'auth/wrong-password':           'Mot de passe incorrect.',
    'auth/email-already-in-use':     'Cet email est déjà utilisé.',
    'auth/weak-password':            'Mot de passe trop faible (6 caractères min).',
    'auth/too-many-requests':        'Trop de tentatives. Réessayez plus tard.',
    'auth/invalid-credential':       'Email ou mot de passe incorrect.',
  };
  return msgs[code] || 'Une erreur est survenue. Réessayez.';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  const labels = {
    'btn-login-submit': 'Connexion',
    'btn-forgot-submit': 'Envoyer le lien',
    'del-final-btn': 'Envoyer le mail',
  };
  btn.textContent = loading ? 'Chargement…' : (labels[btnId] || 'Créer le compte');
}

// ─── NAVIGATION LOGIN / REGISTER ─────────────────────
window.showLoginView = function() {
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('register-view').style.display = 'none';
  const vv = document.getElementById('verify-view'); if (vv) vv.style.display = 'none';
  const dv = document.getElementById('device-verify-view'); if (dv) dv.style.display = 'none';
  const pv = document.getElementById('pin-lock-view'); if (pv) pv.style.display = 'none';
  const ps = document.getElementById('pin-setup-view'); if (ps) ps.style.display = 'none';
  const fv = document.getElementById('forgot-view'); if (fv) fv.style.display = 'none';
  document.getElementById('login-error').textContent = '';
  stopVerifyPolling();
};
window.showForgotView = function() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'none';
  const vv = document.getElementById('verify-view'); if (vv) vv.style.display = 'none';
  const dv = document.getElementById('device-verify-view'); if (dv) dv.style.display = 'none';
  const pv = document.getElementById('pin-lock-view'); if (pv) pv.style.display = 'none';
  const ps = document.getElementById('pin-setup-view'); if (ps) ps.style.display = 'none';
  document.getElementById('forgot-view').style.display = 'block';
  const err = document.getElementById('forgot-error'); if (err) { err.textContent = ''; err.style.display = 'none'; }
  const ok = document.getElementById('forgot-success'); if (ok) ok.style.display = 'none';
  const form = document.getElementById('forgot-form'); if (form) form.style.display = 'block';
  // Pré-remplit avec l'email déjà saisi sur l'écran de connexion
  const le = document.getElementById('input-email');
  const fe = document.getElementById('forgot-email');
  if (le && fe && le.value.trim()) fe.value = le.value.trim();
  stopVerifyPolling();
};

// ─── MOT DE PASSE OUBLIÉ ─────────────────────────────
let _fpLastSent = 0;
window.doForgotPassword = async function() {
  const email = (document.getElementById('forgot-email').value || '').trim();
  const err   = document.getElementById('forgot-error');
  err.textContent = ''; err.style.display = 'none';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    err.textContent = 'Veuillez saisir une adresse email valide.';
    err.style.display = 'block';
    return;
  }
  if (_checkTurnstile('turnstile-forgot') !== 'ready') {
    err.textContent = 'Veuillez compléter la vérification de sécurité.';
    err.style.display = 'block';
    return;
  }
  const now = Date.now();
  if (now - _fpLastSent < 60000) {
    const wait = Math.ceil((60000 - (now - _fpLastSent)) / 1000);
    err.textContent = `Patientez ${wait}s avant de renvoyer un email.`;
    err.style.display = 'block';
    return;
  }
  setLoading('btn-forgot-submit', true);
  try {
    const res = await fetch(`${WORKER_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, turnstileToken: _getTurnstileToken('turnstile-forgot') }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Échec');
    }
    _fpLastSent = now;
  } catch(e) {
    _resetTurnstile('turnstile-forgot');
    err.textContent = "Échec de l'envoi. Réessayez dans un instant.";
    err.style.display = 'block';
    setLoading('btn-forgot-submit', false);
    return;
  }
  _resetTurnstile('turnstile-forgot');
  setLoading('btn-forgot-submit', false);
  // Message identique que l'adresse existe ou non (anti-énumération)
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('forgot-success').style.display = 'block';
};
window.showRegisterView = async function() {
  // Inscriptions fermées → on ne montre même pas le formulaire
  let open = true;
  try { open = (await _getAppConfig()).signupOpen !== false; } catch(_) {}
  if (!open) {
    const lv = document.getElementById('login-view');
    if (lv) lv.style.display = 'block';
    const rv = document.getElementById('register-view'); if (rv) rv.style.display = 'none';
    const err = document.getElementById('login-error');
    if (err) { err.textContent = 'Les inscriptions sont actuellement fermées.'; err.style.display = 'block'; }
    return;
  }
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'block';
  const vv = document.getElementById('verify-view'); if (vv) vv.style.display = 'none';
  const dv = document.getElementById('device-verify-view'); if (dv) dv.style.display = 'none';
  const pv = document.getElementById('pin-lock-view'); if (pv) pv.style.display = 'none';
  const ps = document.getElementById('pin-setup-view'); if (ps) ps.style.display = 'none';
  const fv = document.getElementById('forgot-view'); if (fv) fv.style.display = 'none';
  document.getElementById('register-error').textContent = '';
  stopVerifyPolling();
};

// ─── VÉRIFICATION EMAIL ──────────────────────────────
let _veLastSent = 0;
let _vePollTimer = null;

function showVerifyView(email) {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'none';
  const fv = document.getElementById('forgot-view'); if (fv) fv.style.display = 'none';
  const view = document.getElementById('verify-view');
  if (view) view.style.display = 'block';
  const eDisp = document.getElementById('verify-email-display');
  if (eDisp) eDisp.textContent = email || '';
  _hideSplash();
  startVerifyPolling();
}

function startVerifyPolling() {
  stopVerifyPolling();
  _vePollTimer = setInterval(_veSilentCheck, 4000);
  window.addEventListener('focus', _veSilentCheck);
  document.addEventListener('visibilitychange', _veSilentCheck);
}
function stopVerifyPolling() {
  if (_vePollTimer) { clearInterval(_vePollTimer); _vePollTimer = null; }
  window.removeEventListener('focus', _veSilentCheck);
  document.removeEventListener('visibilitychange', _veSilentCheck);
}
async function _veSilentCheck() {
  if (document.hidden) return;
  if (!fbAuth || !fbAuth.currentUser) return;
  try {
    await fbAuth.currentUser.reload();
    if (fbAuth.currentUser.emailVerified) {
      stopVerifyPolling();
      startApp(fbAuth.currentUser);
    }
  } catch(_) {}
}

window.veCheck = async function() {
  const err = document.getElementById('verify-error');
  const ok  = document.getElementById('verify-success');
  err.style.display = 'none'; ok.style.display = 'none';
  if (!fbAuth || !fbAuth.currentUser) return;
  setLoading('btn-verify-check', true);
  try {
    await fbAuth.currentUser.reload();
    if (fbAuth.currentUser.emailVerified) {
      stopVerifyPolling();
      startApp(fbAuth.currentUser);
    } else {
      err.textContent = "Email pas encore vérifié. Clique le lien reçu puis réessaie.";
      err.style.display = 'block';
      setLoading('btn-verify-check', false);
    }
  } catch(e) {
    err.textContent = "Erreur de vérification. Réessayez.";
    err.style.display = 'block';
    setLoading('btn-verify-check', false);
  }
};

window.veResend = async function() {
  const err = document.getElementById('verify-error');
  const ok  = document.getElementById('verify-success');
  err.style.display = 'none'; ok.style.display = 'none';
  if (!fbAuth || !fbAuth.currentUser) return;
  const now = Date.now();
  if (now - _veLastSent < 60000) {
    const wait = Math.ceil((60000 - (now - _veLastSent)) / 1000);
    err.textContent = `Attends ${wait}s avant de renvoyer.`;
    err.style.display = 'block';
    return;
  }
  setLoading('btn-verify-resend', true);
  try {
    await sendEmailVerification(fbAuth.currentUser, {
      url: window.location.origin + window.location.pathname + '?verified=1',
      handleCodeInApp: false
    });
    _veLastSent = now;
    ok.textContent = "Mail renvoyé. Vérifiez votre boîte (et le spam).";
    ok.style.display = 'block';
  } catch(e) {
    err.textContent = "Échec d'envoi. Réessayez plus tard.";
    err.style.display = 'block';
  } finally {
    setLoading('btn-verify-resend', false);
  }
};

window.veLogout = async function() {
  stopVerifyPolling();
  try { await signOut(fbAuth); } catch(_) {}
  showLoginView();
};

// ─── 2FA NOUVEL APPAREIL — UI ───────────────────────────
let _dvLastSent = 0;
let _dvResendTimer = null;

function showDeviceVerifyView(email) {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'none';
  const vv = document.getElementById('verify-view'); if (vv) vv.style.display = 'none';
  const view = document.getElementById('device-verify-view');
  if (view) view.style.display = 'block';
  const eDisp = document.getElementById('dv-email-display');
  if (eDisp) eDisp.textContent = email || '';
  const dLabel = document.getElementById('dv-device-label');
  if (dLabel) dLabel.textContent = _getDeviceLabel();
  // Reset étapes
  document.getElementById('dv-step-send').style.display = 'block';
  document.getElementById('dv-step-verify').style.display = 'none';
  const se = document.getElementById('dv-send-error'); if (se) se.style.display = 'none';
  const ve = document.getElementById('dv-verify-error'); if (ve) ve.style.display = 'none';
  const oi = document.getElementById('dv-otp-input'); if (oi) oi.value = '';
  _hideSplash();
}

function _startDvResendCooldown() {
  const btn = document.getElementById('dv-resend-btn');
  if (!btn) return;
  if (_dvResendTimer) clearInterval(_dvResendTimer);
  const tick = () => {
    const remain = Math.max(0, 60 - Math.floor((Date.now() - _dvLastSent) / 1000));
    if (remain > 0) {
      btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed';
      btn.textContent = `Renvoyer le code (${remain}s)`;
    } else {
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      btn.textContent = 'Renvoyer le code';
      clearInterval(_dvResendTimer); _dvResendTimer = null;
    }
  };
  tick();
  _dvResendTimer = setInterval(tick, 1000);
}

async function _dvGenerateAndSend(user) {
  // Force refresh token (rules _isVerified)
  try { await user.reload(); await user.getIdToken(true); } catch(_) {}
  const code = _genOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const deviceId = _getDeviceId();
  const deviceLabel = _getDeviceLabel();
  // Fetch IP/location en parallèle (best-effort, non bloquant si échoue)
  const ipInfo = await _fetchIpInfo();
  // Stocke IP info dans deviceOtp pour pouvoir l'ajouter au trustedDevice après vérif
  const ref = firestoreDoc(db, 'users', user.uid, 'data', 'deviceOtp');
  const payload = {
    code, expiresAt, attempts: 0, deviceId, deviceLabel,
    ipInfo: ipInfo || null,
    createdAt: Date.now(),
  };
  try {
    await setFirestoreDoc(ref, payload);
  } catch(e) {
    if (e.code === 'permission-denied') {
      await new Promise(r => setTimeout(r, 800));
      try { await user.getIdToken(true); } catch(_) {}
      await setFirestoreDoc(ref, payload);
    } else { throw e; }
  }
  const location = _fmtLocation(ipInfo) || 'Lieu inconnu';
  await _send2faOtpEmail(user.email, code, deviceLabel, location);
  _dvLastSent = Date.now();
}

window.dvSendOtp = async function() {
  const err = document.getElementById('dv-send-error');
  if (err) err.style.display = 'none';
  const user = fbAuth.currentUser;
  if (!user || !user.email) return;
  setLoading('dv-send-btn', true);
  try {
    await _dvGenerateAndSend(user);
    document.getElementById('dv-step-send').style.display = 'none';
    document.getElementById('dv-step-verify').style.display = 'block';
    const oi = document.getElementById('dv-otp-input');
    if (oi) { oi.value = ''; setTimeout(() => oi.focus(), 50); }
    _startDvResendCooldown();
  } catch(e) {
    console.error('[2fa] envoi code échoué:', e);
    if (err) {
      err.textContent = 'Erreur envoi du code : ' + (e.message || e.text || 'inconnue');
      err.style.display = 'block';
    }
  } finally {
    setLoading('dv-send-btn', false);
  }
};

window.dvResendOtp = async function() {
  if (Date.now() - _dvLastSent < 60 * 1000) return;
  const user = fbAuth.currentUser;
  if (!user || !user.email) return;
  const ve = document.getElementById('dv-verify-error');
  try {
    await _dvGenerateAndSend(user);
    _startDvResendCooldown();
    if (ve) {
      ve.textContent = 'Nouveau code envoyé.';
      ve.style.color = '#22d98a'; ve.style.background = 'rgba(34,217,138,0.08)';
      ve.style.display = 'block';
      setTimeout(() => { ve.style.display = 'none'; ve.style.color = '#ff4d6a'; ve.style.background = 'rgba(255,77,106,0.08)'; }, 3000);
    }
  } catch(e) {
    console.error('[2fa] renvoi code échoué:', e);
    if (ve) { ve.textContent = 'Échec renvoi : ' + (e.message || e.text || 'inconnue'); ve.style.display = 'block'; }
  }
};

window.dvVerifyOtp = async function() {
  const ve = document.getElementById('dv-verify-error');
  if (ve) ve.style.display = 'none';
  const oi = document.getElementById('dv-otp-input');
  const input = (oi?.value || '').trim();
  if (!/^\d{6}$/.test(input)) {
    if (ve) { ve.textContent = 'Code invalide (6 chiffres attendus).'; ve.style.display = 'block'; }
    return;
  }
  const user = fbAuth.currentUser;
  if (!user || !user.email) return;
  setLoading('dv-verify-btn', true);
  try {
    const ref = firestoreDoc(db, 'users', user.uid, 'data', 'deviceOtp');
    const snap = await getFirestoreDoc(ref);
    if (!snap.exists()) {
      if (ve) { ve.textContent = 'Code expiré. Renvoyez-en un nouveau.'; ve.style.display = 'block'; }
      return;
    }
    const data = snap.data();
    if (Date.now() > data.expiresAt) {
      if (ve) { ve.textContent = 'Code expiré. Renvoyez-en un nouveau.'; ve.style.display = 'block'; }
      return;
    }
    if ((data.attempts || 0) >= 5) {
      if (ve) { ve.textContent = 'Trop de tentatives. Renvoyez un nouveau code.'; ve.style.display = 'block'; }
      return;
    }
    if (data.code !== input) {
      const left = 5 - ((data.attempts || 0) + 1);
      await setFirestoreDoc(ref, { ...data, attempts: (data.attempts || 0) + 1 });
      if (ve) { ve.textContent = `Code incorrect. ${left} tentative(s) restante(s).`; ve.style.display = 'block'; }
      return;
    }
    // OK → ajoute device trusté avec IP info stockée dans le doc OTP + cleanup
    const deviceId = _getDeviceId();
    await _addTrustedDevice(user.uid, deviceId, _getDeviceLabel(), data.ipInfo || null);
    try { await deleteFirestoreDoc(ref); } catch(_) {}
    document.getElementById('device-verify-view').style.display = 'none';
    // Gate PIN — obligatoire même après validation 2FA
    try {
      const pinOn = await _isPinEnabled(user.uid);
      if (!pinOn) { showPinSetupView(user); return; }
      showPinLockView(user); return;
    } catch(_) {}
    startApp(user);
  } catch(e) {
    console.error('[2fa] verify échoué:', e);
    if (ve) { ve.textContent = 'Erreur : ' + (e.message || e.code || 'inconnue'); ve.style.display = 'block'; }
  } finally {
    setLoading('dv-verify-btn', false);
  }
};

window.dvLogout = async function() {
  try { await signOut(fbAuth); } catch(_) {}
  showLoginView();
};

// ─── PIN KEYPAD (custom, désactive clavier natif iPhone/Android) ─────
const _PIN_BACKSPACE_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>';

let _pinKeyboardHandler = null;

function _renderPinKeypad(keypadId, inputId, onComplete) {
  const kp = document.getElementById(keypadId);
  if (!kp) return;
  const keys = ['1','2','3','4','5','6','7','8','9','', '0','back'];
  kp.innerHTML = keys.map(k => {
    if (k === '') return '<button class="pin-key empty" tabindex="-1"></button>';
    if (k === 'back') return `<button class="pin-key back" data-action="back" tabindex="-1">${_PIN_BACKSPACE_SVG}</button>`;
    return `<button class="pin-key" data-digit="${k}" tabindex="-1">${k}</button>`;
  }).join('');

  function handlePinInput(digit, isBack) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    let v = (inp.value || '').replace(/\D/g, '');
    if (digit !== undefined) {
      if (v.length >= 6) return;
      v += digit;
    } else if (isBack) {
      v = v.slice(0, -1);
    }
    inp.value = v;
    if (inputId === 'pin-lock-input') _updatePinDots(v.length);
    if (v.length === 6 && typeof onComplete === 'function') onComplete();
  }

  // Click handlers
  kp.querySelectorAll('.pin-key').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      const d = btn.getAttribute('data-digit');
      const a = btn.getAttribute('data-action');
      if (d) handlePinInput(d);
      else if (a === 'back') handlePinInput(undefined, true);
    };
  });

  // Clavier PC / pavé numérique
  if (_pinKeyboardHandler) document.removeEventListener('keydown', _pinKeyboardHandler);
  _pinKeyboardHandler = e => {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const container = inp.closest('#pin-lock-view, #pin-setup-view, #pin-setup-modal');
    if (!container || getComputedStyle(container).display === 'none') return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      handlePinInput(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handlePinInput(undefined, true);
    }
  };
  document.addEventListener('keydown', _pinKeyboardHandler);
}

// ─── PIN — VUE FORCE SETUP (comptes sans PIN) ─────────
let _pinSetupViewUser = null;
let _pinSetupViewStep1 = '';

function showPinSetupView(user) {
  _pinSetupViewUser = user;
  _pinSetupViewStep1 = '';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'none';
  const vv = document.getElementById('verify-view'); if (vv) vv.style.display = 'none';
  const dv = document.getElementById('device-verify-view'); if (dv) dv.style.display = 'none';
  const lv = document.getElementById('pin-lock-view'); if (lv) lv.style.display = 'none';
  const view = document.getElementById('pin-setup-view');
  if (view) view.style.display = 'block';
  document.getElementById('pin-setup-view-step-label').textContent = 'Étape 1/2 — Saisissez un nouveau code';
  document.getElementById('pin-setup-view-btn').textContent = 'Continuer';
  const inp = document.getElementById('pin-setup-view-input');
  if (inp) inp.value = '';
  _renderPinKeypad('pin-setup-view-keypad', 'pin-setup-view-input', () => window.pinSetupViewSubmit());
  const err = document.getElementById('pin-setup-view-error'); if (err) err.style.display = 'none';
  _hideSplash();
}

window.pinSetupViewSubmit = async function() {
  const inp = document.getElementById('pin-setup-view-input');
  const err = document.getElementById('pin-setup-view-error');
  const btn = document.getElementById('pin-setup-view-btn');
  const stepLbl = document.getElementById('pin-setup-view-step-label');
  const val = (inp?.value || '').trim();
  if (err) err.style.display = 'none';
  if (!/^\d{6}$/.test(val)) {
    if (err) { err.textContent = 'Le code doit faire exactement 6 chiffres.'; err.style.display = 'block'; }
    return;
  }
  if (!_pinSetupViewStep1) {
    _pinSetupViewStep1 = val;
    inp.value = '';
    stepLbl.textContent = 'Étape 2/2 — Confirmez le code';
    btn.textContent = 'Valider';
    setTimeout(() => inp.focus(), 50);
    return;
  }
  if (val !== _pinSetupViewStep1) {
    if (err) { err.textContent = 'Les codes ne correspondent pas. Recommencez.'; err.style.display = 'block'; }
    _pinSetupViewStep1 = '';
    inp.value = '';
    stepLbl.textContent = 'Étape 1/2 — Saisissez un nouveau code';
    btn.textContent = 'Continuer';
    setTimeout(() => inp.focus(), 50);
    return;
  }
  const user = _pinSetupViewUser || fbAuth.currentUser;
  if (!user) return;
  setLoading('pin-setup-view-btn', true);
  try {
    try { await user.reload(); await user.getIdToken(true); } catch(_) {}
    await _setupPin(user.uid, val);
    document.getElementById('pin-setup-view').style.display = 'none';
    _pinSetupViewUser = null; _pinSetupViewStep1 = '';
    startApp(user);
  } catch(e) {
    console.error('[pin] force setup échoué:', e);
    if (err) { err.textContent = 'Erreur : ' + (e.message || e.code || 'inconnue'); err.style.display = 'block'; }
  } finally {
    setLoading('pin-setup-view-btn', false);
  }
};

// ─── PIN LOCK SCREEN ──────────────────────────────────
let _pinLockUser = null;
let _pinLockAttempts = 0;
const _PIN_MAX_ATTEMPTS = 5;

function _updatePinDots(len) {
  const dots = document.querySelectorAll('#pin-dots .pin-dot');
  dots.forEach((d, i) => d.classList.toggle('filled', i < len));
}

function _shakePinDots() {
  const dots = document.querySelectorAll('#pin-dots .pin-dot');
  dots.forEach(d => { d.classList.add('shake'); setTimeout(() => d.classList.remove('shake'), 400); });
}

function showPinLockView(user) {
  _pinLockUser = user;
  _pinLockAttempts = 0;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'none';
  const vv = document.getElementById('verify-view'); if (vv) vv.style.display = 'none';
  const dv = document.getElementById('device-verify-view'); if (dv) dv.style.display = 'none';
  const view = document.getElementById('pin-lock-view');
  if (view) view.style.display = 'block';
  const inp = document.getElementById('pin-lock-input');
  if (inp) {
    inp.value = '';
    _updatePinDots(0);
  }
  _renderPinKeypad('pin-lock-keypad', 'pin-lock-input', () => window.pinLockSubmit());
  const err = document.getElementById('pin-lock-error'); if (err) err.style.display = 'none';
  _hideSplash();
}

window.pinLockSubmit = async function() {
  const inp = document.getElementById('pin-lock-input');
  const err = document.getElementById('pin-lock-error');
  if (err) err.style.display = 'none';
  const val = (inp?.value || '').trim();
  if (!/^\d{6}$/.test(val)) {
    if (err) { err.textContent = 'Saisissez 6 chiffres.'; err.style.display = 'block'; }
    return;
  }
  const user = _pinLockUser || fbAuth.currentUser;
  if (!user) return;
  setLoading('pin-lock-btn', true);
  try {
    const ok = await _verifyPin(user.uid, val);
    if (ok) {
      _pinLockAttempts = 0;
      _pinUnlockSuccess(user);
    } else {
      _pinLockAttempts++;
      _shakePinDots();
      inp.value = '';
      _updatePinDots(0);
      const remain = _PIN_MAX_ATTEMPTS - _pinLockAttempts;
      if (remain <= 0) {
        if (err) { err.textContent = 'Trop de tentatives. Déconnexion.'; err.style.display = 'block'; }
        setTimeout(() => window.pinLockLogout(), 1500);
      } else {
        if (err) { err.textContent = `Code incorrect. ${remain} tentative(s) restante(s).`; err.style.display = 'block'; }
        setTimeout(() => inp.focus(), 50);
      }
    }
  } catch(e) {
    console.error('[pin] verify échoué:', e);
    if (err) { err.textContent = 'Erreur : ' + (e.message || e.code || 'inconnue'); err.style.display = 'block'; }
  } finally {
    setLoading('pin-lock-btn', false);
  }
};

// Séquence déverrouillage réussi : dots verts → check pop → fondu carte → app.
function _pinUnlockSuccess(user) {
  const reduce = _reduceMotion();
  const view = document.getElementById('pin-lock-view');
  const dotsWrap = document.getElementById('pin-dots');
  const dots = document.querySelectorAll('#pin-dots .pin-dot');
  const finish = () => {
    if (view) { view.style.display = 'none'; view.classList.remove('pin-card-exit'); }
    if (dotsWrap) { dotsWrap.classList.remove('unlocked'); dotsWrap.style.position = ''; }
    const chk = document.getElementById('pin-unlock-check'); if (chk) chk.remove();
    dots.forEach(d => d.classList.remove('success'));
    startApp(user);
  };
  if (reduce || !view) { finish(); return; }
  dots.forEach(d => { d.classList.remove('filled'); d.classList.add('success'); });
  if (dotsWrap && !document.getElementById('pin-unlock-check')) {
    dotsWrap.style.position = 'relative';
    const chk = document.createElement('div');
    chk.id = 'pin-unlock-check';
    chk.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    dotsWrap.appendChild(chk);
    // léger délai pour laisser les dots verdir avant de disparaître
    setTimeout(() => dotsWrap.classList.add('unlocked'), 120);
  }
  setTimeout(() => {
    view.classList.add('pin-card-exit');
    setTimeout(finish, 320);
  }, 560);
}

window.pinLockLogout = async function() {
  _pinLockUser = null;
  try { await signOut(fbAuth); } catch(_) {}
  showLoginView();
};

// ─── PIN — UI Profil (status + actions) ───────────────
window.refreshPinStatus = async function() {
  const box = document.getElementById('pin-status-box');
  const actions = document.getElementById('pin-actions');
  if (!box || !actions) return;
  const user = fbAuth.currentUser;
  if (!user) { box.textContent = 'Non connecté'; actions.innerHTML = ''; return; }
  try {
    const enabled = await _isPinEnabled(user.uid);
    if (enabled) {
      box.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;color:#22d98a;font-weight:600"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Code PIN actif</span><div style="font-size:11px;color:var(--text3);margin-top:4px">Demandé à chaque ouverture et à chaque rechargement de l\'application. Obligatoire, non désactivable.</div>';
      actions.innerHTML = `
        <button onclick="openPinSetupModal('change')" style="flex:1;padding:9px;background:var(--s2);border:1px solid var(--border);color:var(--text);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--sans)">Changer le code</button>
      `;
    } else {
      box.innerHTML = '<span style="color:#ff4d6a;font-weight:600">⚠ Code PIN obligatoire — non configuré.</span><div style="font-size:11px;color:var(--text3);margin-top:4px">Sera demandé au prochain rechargement.</div>';
      actions.innerHTML = `<button onclick="openPinSetupModal('setup')" style="flex:1;padding:9px;background:#7c6df5;border:none;color:#fff;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--sans)">Configurer maintenant</button>`;
    }
  } catch(e) {
    box.textContent = 'Erreur de chargement.';
    actions.innerHTML = '';
  }
};

let _pinSetupMode = 'setup'; // 'setup' | 'change'
let _pinSetupStep1 = '';     // valeur 1ère saisie

window.openPinSetupModal = function(mode) {
  _pinSetupMode = mode || 'setup';
  _pinSetupStep1 = '';
  const m = document.getElementById('pin-setup-modal');
  if (!m) return;
  document.getElementById('pin-setup-title').textContent = mode === 'change' ? 'Changer le code PIN' : 'Configurer un code PIN';
  document.getElementById('pin-setup-sub').textContent = 'Saisissez un nouveau code à 6 chiffres.';
  document.getElementById('pin-setup-btn').textContent = 'Continuer';
  const inp = document.getElementById('pin-setup-input');
  if (inp) inp.value = '';
  _renderPinKeypad('pin-setup-keypad', 'pin-setup-input', () => window.pinSetupSubmit());
  const err = document.getElementById('pin-setup-error'); if (err) err.style.display = 'none';
  m.style.display = 'flex';
};

window.closePinSetupModal = function() {
  const m = document.getElementById('pin-setup-modal');
  if (m) m.style.display = 'none';
  _pinSetupStep1 = '';
};

window.pinSetupSubmit = async function() {
  const inp = document.getElementById('pin-setup-input');
  const err = document.getElementById('pin-setup-error');
  const btn = document.getElementById('pin-setup-btn');
  const val = (inp?.value || '').trim();
  if (err) err.style.display = 'none';
  if (!/^\d{6}$/.test(val)) {
    if (err) { err.textContent = 'Le code doit faire exactement 6 chiffres.'; err.style.display = 'block'; }
    return;
  }
  if (!_pinSetupStep1) {
    // Étape 1 → mémorise + passe à étape 2
    _pinSetupStep1 = val;
    inp.value = '';
    document.getElementById('pin-setup-sub').textContent = 'Confirmez votre code en le saisissant à nouveau.';
    btn.textContent = 'Valider';
    setTimeout(() => inp.focus(), 50);
    return;
  }
  // Étape 2 → compare
  if (val !== _pinSetupStep1) {
    if (err) { err.textContent = 'Les codes ne correspondent pas. Recommencez.'; err.style.display = 'block'; }
    _pinSetupStep1 = '';
    inp.value = '';
    document.getElementById('pin-setup-sub').textContent = 'Saisissez un nouveau code à 6 chiffres.';
    btn.textContent = 'Continuer';
    setTimeout(() => inp.focus(), 50);
    return;
  }
  // Confirme → enregistre Firestore
  const user = fbAuth.currentUser;
  if (!user) return;
  setLoading('pin-setup-btn', true);
  try {
    try { await user.reload(); await user.getIdToken(true); } catch(_) {}
    await _setupPin(user.uid, val);
    window.closePinSetupModal();
    await window.refreshPinStatus();
  } catch(e) {
    console.error('[pin] setup échoué:', e);
    if (err) { err.textContent = 'Erreur : ' + (e.message || e.code || 'inconnue'); err.style.display = 'block'; }
  } finally {
    setLoading('pin-setup-btn', false);
  }
};

// Désactivation PIN supprimée : code obligatoire, non désactivable.

// ─── CODE PIN 6 CHIFFRES — App lock au démarrage ───────
// Stockage: users/{uid}/data/security = { pinHash, pinSalt, enabled, createdAt }
// Hash: SHA-256(salt + pin) via SubtleCrypto.

async function _sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function _genSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function _loadSecurity(uid) {
  try {
    const ref = firestoreDoc(db, 'users', uid, 'data', 'security');
    const snap = await getFirestoreDoc(ref);
    if (!snap.exists()) return null;
    return snap.data();
  } catch(_) { return null; }
}

async function _isPinEnabled(uid) {
  const sec = await _loadSecurity(uid);
  return !!(sec && sec.enabled && sec.pinHash && sec.pinSalt);
}

// ─── Kill-switch PIN global (admin) ──────────────────────────────
// Doc Firestore config/app { pinDisabled: bool }. Lu par tous, écrit par admin.
async function _isPinGloballyDisabled() {
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'config', 'app'));
    return !!(snap.exists() && snap.data().pinDisabled);
  } catch (e) {
    console.warn('[pin] lecture config globale échouée:', e);
    return false; // fail-safe : PIN reste actif
  }
}

async function _setPinGloballyDisabled(disabled) {
  await _setAppConfig({ pinDisabled: !!disabled });
}

// ─── Config globale app (config/app) — lu par tous, écrit par admin ────
async function _getAppConfig() {
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'config', 'app'));
    return snap.exists() ? (snap.data() || {}) : {};
  } catch (e) {
    console.warn('[config] lecture échouée:', e);
    return {};
  }
}
async function _setAppConfig(fields) {
  const ref = firestoreDoc(db, 'config', 'app');
  await setFirestoreDoc(ref, Object.assign({
    updatedAt: Date.now(),
    updatedBy: currentUser || null,
  }, fields), { merge: true });
}
// Maintenance : bloque tout le monde sauf admin. Défaut : off.
async function _isMaintenance() { const c = await _getAppConfig(); return !!c.maintenance; }
// Inscriptions : ouvertes par défaut (n'importe quelle erreur → on ne bloque pas).
async function _isSignupOpen() { const c = await _getAppConfig(); return c.signupOpen !== false; }

function showMaintenanceScreen(msg) {
  const login = document.getElementById('login-screen');
  const app = document.getElementById('app');
  if (login) login.style.display = 'none';
  if (app) app.style.display = 'none';
  let el = document.getElementById('maintenance-screen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'maintenance-screen';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:24px;text-align:center';
    document.body.appendChild(el);
  }
  el.innerHTML =
    '<div style="max-width:440px">' +
    '<div style="width:64px;height:64px;margin:0 auto 20px;border-radius:16px;background:rgba(245,183,49,.12);display:grid;place-items:center">' +
    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' +
    '</div>' +
    '<div style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:12px">Maintenance en cours</div>' +
    '<div style="font-size:14px;color:var(--text2);line-height:1.7">' + (msg || 'Capital Board revient très vite. Merci de votre patience.') + '</div>' +
    '</div>';
  el.style.display = 'flex';
}

// ─── Prénom + Nom obligatoires (comptes existants sans nom) ───
async function _ensureUserName(user) {
  if (window.IS_DEMO || !user) return;
  if (isAdmin()) { window._nameSetupDone = true; return; } // admin identifié par UID : pas d'onboarding nom
  if (window._nameSetupDone) return; // déjà validé pendant cette session
  const ref = firestoreDoc(db, 'roles', user.uid);
  let snap;
  try {
    // Lecture serveur autoritative UNIQUEMENT. Si elle échoue (réseau, session
    // Firestore pas encore prête juste après le login), on NE montre PAS le
    // modal : un repli sur le cache local lirait un doc pas encore synchronisé
    // et rouvrirait le modal à tort à un utilisateur déjà renseigné.
    snap = await getDocFromServer(ref);
  } catch (_) { return; } // pas de confirmation serveur → on ne bloque pas
  const d = snap.exists() ? (snap.data() || {}) : {};
  if (d.firstName && d.lastName && d.username) { window._nameSetupDone = true; return; }
  showNameSetupModal(user);
}
function showNameSetupModal(user) {
  let el = document.getElementById('name-setup-modal');
  if (!el) { el = document.createElement('div'); el.id = 'name-setup-modal'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);padding:20px;box-sizing:border-box';
  const inp = 'width:100%;box-sizing:border-box;background:#0a0c14;border:1px solid rgba(255,255,255,.10);border-radius:10px;color:#f0f2f8;font-size:14px;padding:11px 13px;outline:none;font-family:inherit';
  el.innerHTML =
    '<div style="max-width:400px;width:100%;box-sizing:border-box;background:#12141e;border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:28px;box-shadow:0 24px 60px -20px rgba(0,0,0,.8);font-family:var(--sans,sans-serif)">' +
      '<div style="font-size:20px;font-weight:800;color:#f0f2f8;margin-bottom:8px">Bienvenue 👋</div>' +
      '<div style="font-size:13px;color:#98a1b5;line-height:1.6;margin-bottom:20px">Choisissez comment vous apparaissez sur Capital Board pour continuer.</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:11px">' +
        '<input id="name-setup-first" placeholder="Prénom" autocomplete="given-name" style="' + inp + '">' +
        '<input id="name-setup-last" placeholder="Nom" autocomplete="family-name" style="' + inp + '">' +
      '</div>' +
      '<div style="position:relative;margin-bottom:11px">' +
        '<span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#5b6377;font-size:14px;pointer-events:none">@</span>' +
        '<input id="name-setup-username" placeholder="nom_utilisateur" autocomplete="off" style="' + inp + ';padding-left:26px">' +
      '</div>' +
      '<div id="name-setup-error" style="display:none;color:#ff5d78;font-size:12px;margin-bottom:10px"></div>' +
      '<button id="name-setup-btn" onclick="saveNameSetup(\'' + user.uid + '\')" style="width:100%;box-sizing:border-box;padding:12px;border:none;border-radius:12px;background:#7c6df5;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Continuer</button>' +
    '</div>';
}

async function _isUsernameTaken(username, selfUid) {
  const q = firestoreQuery(firestoreCollection(db, 'roles'), firestoreWhere('username', '==', username));
  const snap = await getDocs(q);
  return snap.docs.some(d => d.id !== selfUid);
}

async function saveNameSetup(uid) {
  const f = (document.getElementById('name-setup-first').value || '').trim();
  const l = (document.getElementById('name-setup-last').value || '').trim();
  const uRaw = (document.getElementById('name-setup-username').value || '').trim().toLowerCase();
  const errEl = document.getElementById('name-setup-error');
  const btn = document.getElementById('name-setup-btn');
  const fail = m => { if (errEl) { errEl.textContent = m; errEl.style.display = 'block'; } };
  if (errEl) errEl.style.display = 'none';
  if (!f || !l) return fail('Prénom et nom requis.');
  if (/capitalboard/i.test((f + l).replace(/[\s._-]/g, ''))) return fail("Ce nom n'est pas autorisé.");
  if (!/^[a-z0-9._-]{3,20}$/.test(uRaw)) return fail('Nom d\'utilisateur : 3–20 caractères (lettres, chiffres, . - _).');
  if (btn) { btn.disabled = true; btn.textContent = 'Vérification…'; }
  try {
    if (await _isUsernameTaken(uRaw, uid)) { if (btn) { btn.disabled = false; btn.textContent = 'Continuer'; } return fail('Ce nom d\'utilisateur est déjà pris.'); }
    await setFirestoreDoc(firestoreDoc(db, 'roles', uid), { firstName: f, lastName: l, username: uRaw }, { merge: true });
    window._nameSetupDone = true;
    try { if (auth.updateProfile && fbAuth.currentUser) await auth.updateProfile(fbAuth.currentUser, { displayName: f + ' ' + l }); } catch (_) {}
    const el = document.getElementById('name-setup-modal'); if (el) el.remove();
    try {
      const nd = document.getElementById('user-name-display'); if (nd) nd.textContent = f;
      const av = document.getElementById('user-avatar'); if (av) av.textContent = (f[0] || '?').toUpperCase();
    } catch (_) {}
  } catch (e) {
    console.error('[name] save:', e);
    if (btn) { btn.disabled = false; btn.textContent = 'Continuer'; }
    fail('Échec de l\'enregistrement, réessayez.');
  }
}

async function _setupPin(uid, pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN doit faire 6 chiffres');
  const salt = _genSalt();
  const pinHash = await _sha256(salt + pin);
  const ref = firestoreDoc(db, 'users', uid, 'data', 'security');
  await setFirestoreDoc(ref, {
    pinHash, pinSalt: salt, enabled: true, createdAt: Date.now(),
  }, { merge: true });
}

async function _verifyPin(uid, pin) {
  try {
    const idToken = await fbAuth.currentUser.getIdToken();
    const res = await fetch(`${WORKER_URL}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, pin }),
    });
    const { valid } = await res.json();
    return !!valid;
  } catch (e) {
    console.error('_verifyPin error:', e);
    return false;
  }
}

async function _disablePin(uid) {
  const ref = firestoreDoc(db, 'users', uid, 'data', 'security');
  try { await deleteFirestoreDoc(ref); } catch(_) {}
}

// ─── MASQUER LE SOLDE (toggle œil) — masque tout texte avec € ou % ──
const _EYE_OPEN_SVG = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
const _EYE_OFF_SVG  = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

// Remplace les chiffres par • dans les text nodes contenant € / % / $ etc.
// Plus propre que blur (pas de carré moche autour).
const _MONEY_RE = /[€$£¥%]|\bEUR\b|\bUSD\b/;
const _origTextMap = new WeakMap();
let _hideObserver = null;
let _hideActive = false;

function _maskTextNode(n) {
  // Si la valeur actuelle a des chiffres, c'est une nouvelle valeur originale → l'enregistrer
  if (/\d/.test(n.nodeValue || '')) {
    _origTextMap.set(n, n.nodeValue);
  } else if (!_origTextMap.has(n)) {
    return; // pas de chiffres et pas d'original connu → rien à masquer
  }
  const orig = _origTextMap.get(n);
  const masked = orig.replace(/\d/g, '•');
  if (n.nodeValue !== masked) n.nodeValue = masked;
}

function _unmaskTextNode(n) {
  if (_origTextMap.has(n)) {
    n.nodeValue = _origTextMap.get(n);
    _origTextMap.delete(n);
  }
}

function _maskSensitiveIn(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      if (!_MONEY_RE.test(n.nodeValue || '')) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest('script,style,#device-verify-view,#verify-view,#login-view,#register-view')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n;
  const nodes = [];
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(_maskTextNode);
}

// Throttle re-mask pour éviter de saturer le main thread sur renders fréquents
let _maskScheduled = false;
function _scheduleRemaskAll() {
  if (_maskScheduled) return;
  _maskScheduled = true;
  requestAnimationFrame(() => {
    _maskScheduled = false;
    if (_hideActive) _maskSensitiveIn(document.body);
  });
}

function _startHideObserver() {
  _hideActive = true;
  _maskSensitiveIn(document.body);
  if (_hideObserver) return;
  _hideObserver = new MutationObserver(mutations => {
    if (!_hideActive) return;
    let needsRemask = false;
    for (const m of mutations) {
      if (m.type === 'childList') {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 || (node.nodeType === 3 && _MONEY_RE.test(node.nodeValue || ''))) {
            needsRemask = true; break;
          }
        }
      } else if (m.type === 'characterData') {
        const v = m.target.nodeValue || '';
        // Skip si plus aucun chiffre (déjà masqué) — évite boucle infinie
        if (/\d/.test(v)) { needsRemask = true; }
      }
      if (needsRemask) break;
    }
    if (needsRemask) _scheduleRemaskAll();
  });
  _hideObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function _stopHideObserver() {
  _hideActive = false;
  if (_hideObserver) { _hideObserver.disconnect(); _hideObserver = null; }
  // Restore tous les nodes masqués
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let n;
  const nodes = [];
  while ((n = walker.nextNode())) if (_origTextMap.has(n)) nodes.push(n);
  nodes.forEach(_unmaskTextNode);
}

function _applyHideBalances(hidden) {
  document.body.classList.toggle('balance-hidden', !!hidden);
  if (hidden) _startHideObserver();
  else _stopHideObserver();
  const mi = document.getElementById('mobile-hide-icon');
  if (mi) mi.innerHTML = hidden ? _EYE_OFF_SVG : _EYE_OPEN_SVG;
  const si = document.getElementById('sidebar-hide-icon');
  if (si) si.innerHTML = hidden ? _EYE_OFF_SVG : _EYE_OPEN_SVG;
  const lbl = document.getElementById('sidebar-hide-label');
  if (lbl) lbl.textContent = hidden ? 'Afficher le solde' : 'Masquer le solde';
}

window.toggleHideBalances = function() {
  const cur = document.body.classList.contains('balance-hidden');
  const next = !cur;
  try { localStorage.setItem('balance_hidden', next ? '1' : '0'); } catch(_) {}
  _applyHideBalances(next);
};

function _restoreHideBalances() {
  try {
    const hidden = localStorage.getItem('balance_hidden') === '1';
    _applyHideBalances(hidden);
  } catch(_) {}
}

// ─── PROFIL — Appareils de confiance ────────────────────
function _fmtDeviceDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
}

// ISO country code (2 lettres) → emoji drapeau
function _countryFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  const A = 0x1F1E6, codeA = 'A'.charCodeAt(0);
  return String.fromCodePoint(...cc.toUpperCase().split('').map(c => A + (c.charCodeAt(0) - codeA)));
}

// Traductions EN → FR pour régions/pays renvoyés par ipapi.co
const _REGION_FR = {
  'Normandy': 'Normandie',
  'Brittany': 'Bretagne',
  'Corsica': 'Corse',
  'Burgundy': 'Bourgogne',
  'Alsace': 'Alsace',
  'Lorraine': 'Lorraine',
  'Picardy': 'Picardie',
};
const _COUNTRY_FR = {
  'United States': 'États-Unis',
  'United Kingdom': 'Royaume-Uni',
  'Germany': 'Allemagne',
  'Spain': 'Espagne',
  'Italy': 'Italie',
  'Belgium': 'Belgique',
  'Netherlands': 'Pays-Bas',
  'Switzerland': 'Suisse',
  'Luxembourg': 'Luxembourg',
  'Portugal': 'Portugal',
  'Canada': 'Canada',
  'Brazil': 'Brésil',
  'China': 'Chine',
  'Japan': 'Japon',
  'Russia': 'Russie',
  'Morocco': 'Maroc',
  'Algeria': 'Algérie',
  'Tunisia': 'Tunisie',
  'Sweden': 'Suède',
  'Norway': 'Norvège',
  'Denmark': 'Danemark',
  'Finland': 'Finlande',
  'Poland': 'Pologne',
  'Czech Republic': 'République Tchèque',
  'Austria': 'Autriche',
  'Ireland': 'Irlande',
  'Greece': 'Grèce',
  'Turkey': 'Turquie',
  'India': 'Inde',
  'Australia': 'Australie',
  'Mexico': 'Mexique',
  'Argentina': 'Argentine',
  'South Korea': 'Corée du Sud',
  'New Zealand': 'Nouvelle-Zélande',
};
function _trRegion(s)  { return _REGION_FR[s] || s || ''; }
function _trCountry(s) { return _COUNTRY_FR[s] || s || ''; }

window.refreshTrustedDevices = async function() {
  const container = document.getElementById('trusted-devices-list');
  if (!container) return;
  const user = fbAuth.currentUser;
  if (!user) { container.innerHTML = '<div style="color:var(--text3);font-style:italic;padding:8px 0">Non connecté</div>'; return; }
  container.innerHTML = '<div style="color:var(--text3);font-style:italic;padding:8px 0">Chargement…</div>';
  try {
    const devices = await _getTrustedDevices(user.uid);
    const currentId = _getDeviceId();
    const entries = Object.entries(devices);
    if (!entries.length) {
      container.innerHTML = '<div style="color:var(--text3);font-style:italic;padding:8px 0">Aucun appareil de confiance.</div>';
      return;
    }
    // Tri : current first, puis lastSeen desc
    entries.sort((a, b) => {
      if (a[0] === currentId) return -1;
      if (b[0] === currentId) return 1;
      return (b[1].lastSeen || 0) - (a[1].lastSeen || 0);
    });
    container.innerHTML = entries.map(([id, d]) => {
      const isCurrent = id === currentId;
      const expiresIn = Math.max(0, Math.ceil((d.expiresAt - Date.now()) / (24*60*60*1000)));
      const loc = _trCountry(d.country) || '';
      const flag = d.countryCode ? _countryFlag(d.countryCode) : '';
      const icoDevice = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
      const icoIp = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
      const icoLoc = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
      const icoClock = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      const icoTrash = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';

      const borderColor = isCurrent ? 'rgba(34,217,138,0.25)' : 'var(--border)';
      const bgColor = isCurrent ? 'linear-gradient(180deg, rgba(34,217,138,0.04) 0%, var(--s2) 100%)' : 'var(--s2)';

      return `
        <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px">

          <!-- Header : label + badge + bouton -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;color:var(--text2);margin-bottom:4px">
                ${icoDevice}<span style="font-weight:700;color:var(--text);font-size:13px;font-family:var(--sans)">${_escapeHtmlChat(d.label || 'Appareil inconnu')}</span>
              </div>
              ${isCurrent ? '<div style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#22d98a;background:rgba(34,217,138,0.12);padding:3px 8px;border-radius:20px;font-weight:700;letter-spacing:0.4px"><span style="width:6px;height:6px;background:#22d98a;border-radius:50%;box-shadow:0 0 6px #22d98a"></span>CET APPAREIL</div>' : ''}
            </div>
            <button onclick="revokeTrustedDevice('${id}')" title="${isCurrent ? 'Révoquer cet appareil et se déconnecter' : 'Révoquer cet appareil'}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 11px;background:rgba(255,77,106,0.08);border:1px solid rgba(255,77,106,0.25);color:#ff4d6a;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:var(--sans);flex-shrink:0;transition:background .15s" onmouseover="this.style.background='rgba(255,77,106,0.15)'" onmouseout="this.style.background='rgba(255,77,106,0.08)'">
              ${icoTrash}<span>${isCurrent ? 'Révoquer & déconnecter' : 'Révoquer'}</span>
            </button>
          </div>

          <!-- Détails : grille 2 lignes -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;font-size:11px;color:var(--text3);padding-top:10px;border-top:1px solid var(--border)">
            ${d.ip ? `<div style="display:flex;align-items:center;gap:6px"><span style="color:var(--text2)">${icoIp}</span><span style="font-family:var(--mono);color:var(--text2)">${_escapeHtmlChat(d.ip)}</span></div>` : ''}
            ${loc ? `<div style="display:flex;align-items:center;gap:6px"><span style="color:var(--text2)">${icoLoc}</span><span>${flag} ${_escapeHtmlChat(loc)}</span></div>` : ''}
            <div style="display:flex;align-items:center;gap:6px"><span style="color:var(--text2)">${icoClock}</span><span>Ajouté ${_fmtDeviceDate(d.firstSeen)}</span></div>
            <div style="display:flex;align-items:center;gap:6px"><span style="color:var(--text2)">${icoClock}</span><span>Vu ${_fmtDeviceDate(d.lastSeen)}</span></div>
          </div>

          <!-- Footer : expiration -->
          <div style="font-size:10px;color:var(--text3);text-align:right;font-style:italic">
            Expire dans ${expiresIn} jour${expiresIn > 1 ? 's' : ''}
          </div>

        </div>
      `;
    }).join('');
  } catch(e) {
    console.error('[2fa] refresh devices échoué:', e);
    container.innerHTML = '<div style="color:#ff4d6a;font-size:11px;padding:8px 0">Erreur de chargement.</div>';
  }
};

const _DEVICE_TRASH_SVG = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';

window.revokeTrustedDevice = function(deviceId) {
  const user = fbAuth.currentUser;
  if (!user) return;
  const isCurrent = deviceId === _getDeviceId();
  showConfirmModal({
    icon: _DEVICE_TRASH_SVG,
    title: isCurrent ? 'Révoquer cet appareil ?' : 'Révoquer cet appareil ?',
    body: isCurrent
      ? 'Vous allez être déconnecté immédiatement. Vous devrez refaire une vérification email pour vous reconnecter.'
      : 'Il devra refaire une vérification email pour se reconnecter à votre compte.',
    okLabel: isCurrent ? 'Révoquer & déconnecter' : 'Révoquer',
    cancelLabel: 'Annuler',
    danger: true,
    onConfirm: async () => {
      try {
        await _revokeTrustedDevice(user.uid, deviceId);
        if (isCurrent) {
          try { window.closeProfilModal && window.closeProfilModal(); } catch(_) {}
          try { await signOut(fbAuth); } catch(_) {}
          try { stopApp(); } catch(_) {}
        } else {
          await window.refreshTrustedDevices();
        }
      } catch(e) {
        console.error('[2fa] revoke échoué:', e);
        showConfirmModal({
          icon: _DEVICE_TRASH_SVG,
          title: 'Erreur',
          body: 'Échec révocation : ' + (e.message || e.code || 'inconnue'),
          okLabel: 'OK',
          cancelLabel: '',
          onConfirm: () => {},
        });
      }
    },
  });
};

window.revokeAllOtherDevices = function() {
  const user = fbAuth.currentUser;
  if (!user) return;
  showConfirmModal({
    icon: _DEVICE_TRASH_SVG,
    title: 'Révoquer tous les autres appareils ?',
    body: 'Vous resterez connecté ici, mais les autres appareils devront refaire la vérification email.',
    okLabel: 'Révoquer tous',
    cancelLabel: 'Annuler',
    danger: true,
    onConfirm: async () => {
      try {
        const devices = await _getTrustedDevices(user.uid);
        const currentId = _getDeviceId();
        const kept = devices[currentId] ? { [currentId]: devices[currentId] } : {};
        const ref = firestoreDoc(db, 'users', user.uid, 'data', 'trustedDevices');
        await setFirestoreDoc(ref, { devices: kept });
        await window.refreshTrustedDevices();
      } catch(e) {
        console.error('[2fa] revoke all échoué:', e);
      }
    },
  });
};

// ─── LOGIN ────────────────────────────────────────────
window.doLogin = async function() {
  const email = document.getElementById('input-email').value.trim();
  const pass  = document.getElementById('input-pass').value;
  const err   = document.getElementById('login-error');
  err.textContent = '';
  if (!email || !pass) { err.textContent = 'Veuillez remplir tous les champs.'; err.style.display = 'block'; return; }
  if (_checkTurnstile('turnstile-login') !== 'ready') {
    err.textContent = 'Veuillez compléter la vérification de sécurité.';
    err.style.display = 'block';
    return;
  }
  setLoading('btn-login-submit', true);
  try {
    await signInWithEmailAndPassword(fbAuth, email, pass);
    // onAuthStateChanged prend le relai
  } catch(e) {
    err.textContent = firebaseErrorMsg(e.code);
    err.style.display = 'block';
    setLoading('btn-login-submit', false);
  }
};

// ─── REGISTER ─────────────────────────────────────────
window.doRegister = async function() {
  const firstName = (document.getElementById('reg-firstname').value || '').trim();
  const lastName  = (document.getElementById('reg-lastname').value || '').trim();
  const username  = (document.getElementById('reg-username').value || '').trim().toLowerCase();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const err   = document.getElementById('register-error');
  const rgpdErr = document.getElementById('register-rgpd-error');
  err.textContent = ''; err.style.display = 'none';
  if (rgpdErr) rgpdErr.style.display = 'none';
  if (!firstName || !lastName) { err.textContent = 'Veuillez indiquer votre prénom et votre nom.'; err.style.display = 'block'; return; }
  if (/capitalboard/i.test((firstName + lastName).replace(/[\s._-]/g, ''))) { err.textContent = "Ce nom n'est pas autorisé."; err.style.display = 'block'; return; }
  if (!/^[a-z0-9._-]{3,20}$/.test(username)) { err.textContent = 'Nom d\'utilisateur : 3–20 caractères (lettres, chiffres, . - _).'; err.style.display = 'block'; return; }
  if (!email || !pass || !pass2) { err.textContent = 'Veuillez remplir tous les champs.'; err.style.display = 'block'; return; }
  try {
    if (await _isUsernameTaken(username, '')) { err.textContent = 'Ce nom d\'utilisateur est déjà pris.'; err.style.display = 'block'; return; }
  } catch (_) { /* si la vérif échoue on laisse passer, contrôle repassé au 1er login */ }
  if (pass !== pass2) { err.textContent = 'Les mots de passe ne correspondent pas.'; err.style.display = 'block'; return; }
  if (pass.length < 6) { err.textContent = 'Mot de passe trop court (6 caractères min).'; err.style.display = 'block'; return; }
  const rgpdChecked = document.getElementById('reg-rgpd')?.checked;
  if (!rgpdChecked) { if (rgpdErr) { rgpdErr.style.display = 'block'; } return; }
  if (!(await _isSignupOpen())) {
    err.textContent = 'Les inscriptions sont temporairement fermées.';
    err.style.display = 'block';
    return;
  }
  if (_checkTurnstile('turnstile-register') !== 'ready') {
    err.textContent = 'Veuillez compléter la vérification de sécurité.';
    err.style.display = 'block';
    return;
  }
  setLoading('btn-register-submit', true);
  const wantsRecap = document.getElementById('reg-recap')?.checked !== false;
  try {
    const cred = await createUserWithEmailAndPassword(fbAuth, email, pass);
    // Prénom + Nom → roles/{uid} (lisible admin) + displayName Auth
    try {
      await setFirestoreDoc(firestoreDoc(db, 'roles', cred.user.uid), { firstName, lastName, username }, { merge: true });
      window._nameSetupDone = true;
    } catch (_) {}
    try { if (auth.updateProfile) await auth.updateProfile(cred.user, { displayName: firstName + ' ' + lastName }); } catch (_) {}
    // Sauvegarder préférence recap — onAuthStateChanged prend le relai ensuite
    // On sauvegarde après le login via startApp, mais on stocke en attendant
    window._pendingRecapPref = wantsRecap;
    // Envoi mail de vérification — onAuthStateChanged va aussi router vers verify-view
    try {
      await sendEmailVerification(cred.user, {
        url: window.location.origin + window.location.pathname + '?verified=1',
        handleCodeInApp: false
      });
      _veLastSent = Date.now();
    } catch(eMail) {
      console.warn('sendEmailVerification failed:', eMail);
    }
    // Flag : auto-trust ce device au passage emailVerified=true (skip 2FA pour 1er device)
    try { localStorage.setItem('signup_auto_trust', '1'); } catch(_) {}
  } catch(e) {
    err.textContent = firebaseErrorMsg(e.code);
    err.style.display = 'block';
    setLoading('btn-register-submit', false);
  }
};

// ─── GOOGLE LOGIN ─────────────────────────────────────
// En PWA iOS (écran d'accueil) ou sur mobile en général, signInWithPopup
// échoue silencieusement : iOS bloque les popups et casse le retour vers
// la webapp standalone. On détecte ces contextes et on bascule sur
// signInWithRedirect, qui fait une vraie navigation dans la même fenêtre.
function _shouldUseRedirectAuth() {
  try {
    // Mode standalone = app ajoutée à l'écran d'accueil (iOS ou Android)
    const isStandalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
    // Safari iOS même en mode navigateur pose problème avec les popups
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    return isStandalone || isIOS;
  } catch (e) {
    return false;
  }
}

window.doLoginGoogle = async function() {
  // Affiche l'erreur dans la vue active (login ou inscription)
  const regVisible = document.getElementById('register-view')
    && document.getElementById('register-view').style.display !== 'none';
  const errEl = document.getElementById(regVisible ? 'register-error' : 'login-error');
  const showErr = (m) => { if (errEl) { errEl.textContent = m; errEl.style.display = 'block'; } };
  if (errEl) errEl.textContent = '';

  // Sur la vue inscription : acceptation CGU/RGPD obligatoire avant tout signup.
  if (regVisible) {
    const rgpd = document.getElementById('reg-rgpd');
    if (rgpd && !rgpd.checked) {
      const rgpdErr = document.getElementById('register-rgpd-error');
      if (rgpdErr) rgpdErr.style.display = 'block';
      return;
    }
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // iOS / PWA standalone : les popups échouent → navigation par redirect.
    if (_shouldUseRedirectAuth()) {
      await signInWithRedirect(fbAuth, provider);
      return; // la page navigue, le résultat est récupéré au retour (getRedirectResult)
    }

    const result = await signInWithPopup(fbAuth, provider);
    // Nouveau compte Google → auto-trust du 1er appareil (skip 2FA), comme au signup email.
    try {
      const isNew = result && result._tokenResponse && result._tokenResponse.isNewUser;
      if (isNew) localStorage.setItem('signup_auto_trust', '1');
    } catch(_) {}
    // onAuthStateChanged prend le relais (gate email/2FA/PIN).
  } catch(e) {
    const code = e && e.code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    if (code === 'auth/account-exists-with-different-credential') {
      showErr('Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.');
      return;
    }
    showErr('Connexion Google impossible : ' + (e && (e.message || e.code) || 'erreur inconnue'));
  }
};

// ─── LOGOUT ───────────────────────────────────────────
window.doLogout = async function() {
  await signOut(fbAuth);
};

// Résout au plus tard après `ms` même si la promesse ne répond jamais
// (réseau bloqué côté iOS). Évite de rester coincé sur l'écran noir.
function _withTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise).catch(() => {}),
    new Promise(resolve => setTimeout(resolve, ms)),
  ]);
}

// ─── DÉMARRAGE APP ────────────────────────────────────
// ─── VERSION CHECK ───────────────────────────────────────────
let _versionCheckInterval = null;
let _updateGateShown = false;
async function _checkVersion() {
  try {
    const res = await fetch('data/version.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const { v } = await res.json();
      if (v && v !== APP_VERSION) { window._serverVersion = v; _showUpdateGate(); return; }   // strict : bloque tout
    }
  } catch(e) { /* silencieux — pas de blocage si offline */ }
  // MAJ forcée par l'admin (config/app.minVersion) : bloque uniquement les
  // versions STRICTEMENT plus anciennes que le plancher. Les versions égales
  // ou plus récentes passent (sinon chaque nouveau déploiement, dont la version
  // diffère du plancher figé, rebloquerait tout le monde). Comparaison de
  // chaînes datées de même format (ex. 20260719r) → tri lexicographique correct.
  try {
    const cfg = await _getAppConfig();
    if (cfg.minVersion && APP_VERSION < cfg.minVersion) { window._serverVersion = cfg.minVersion; _showUpdateGate(); }
  } catch(_) {}
}
// Écran bloquant : impossible d'utiliser une version obsolète, seule action = recharger.
function _showUpdateGate() {
  if (_updateGateShown) return;
  _updateGateShown = true;
  let el = document.getElementById('update-gate');
  if (!el) { el = document.createElement('div'); el.id = 'update-gate'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#04060b;padding:24px;text-align:center';
  el.innerHTML =
    '<div style="max-width:420px">' +
    '<div style="width:64px;height:64px;margin:0 auto 20px;border-radius:16px;background:rgba(124,109,245,.12);display:grid;place-items:center">' +
    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7c6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>' +
    '</div>' +
    '<div style="font-size:22px;font-weight:800;color:#f0f2f8;margin-bottom:12px">Nouvelle version disponible</div>' +
    '<div style="font-size:14px;color:#98a1b5;line-height:1.7;margin-bottom:22px">Une version plus récente de Capital Board est en ligne. Rechargez la page pour continuer.</div>' +
    '<button onclick="_forceReload()" style="padding:12px 28px;border:none;border-radius:12px;background:#7c6df5;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--sans, sans-serif)">Recharger maintenant</button>' +
    '</div>';
}
async function _forceReload() {
  // 1) Vider CacheStorage + désinscrire les service workers.
  try { if (window.caches && caches.keys) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch(_) {}
  try { if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } } catch(_) {}
  // 2) Re-fetch forcé de l'app.js CIBLE (celle que le nouvel HTML référencera :
  //    js/app.js?v=<version serveur>). Réécrit l'entrée de cache HTTP éventuellement
  //    empoisonnée pendant un déploiement (edge CDN incohérent), sinon le reload
  //    resservirait l'ancien app.js et le gate boucle.
  const target = window._serverVersion || String(Date.now());
  try { await fetch('js/app.js?v=' + target, { cache: 'reload' }); } catch(_) {}
  // 3) Recharger le document en cassant le cache HTML.
  const u = new URL(window.location.href);
  u.searchParams.set('_v', Date.now());
  window.location.replace(u.toString());
}
function _startVersionCheck() {
  _checkVersion();
  if (_versionCheckInterval) clearInterval(_versionCheckInterval);
  _versionCheckInterval = setInterval(_checkVersion, 60 * 1000);
}

// ─── Chrono perf dashboard (F12) ──────────────────────────────────────────
// Mesure le temps d'apparition chiffres + courbe depuis le déverrouillage.
// Chaque clé n'est loguée qu'une fois par cycle startApp.
//
// Silencieux par défaut : ces mesures servent au diagnostic, pas aux
// utilisateurs. Flag localStorage 'cb_debug'=='1' pour les rallumer.
// Console : toggleDebug()  puis recharger.
function _debugOn() {
  try { return localStorage.getItem('cb_debug') === '1'; } catch(_) { return false; }
}
window.toggleDebug = function() {
  let on = false;
  try { on = _debugOn(); localStorage.setItem('cb_debug', on ? '0' : '1'); } catch(_) {}
  console.log('[debug] logs perf : ' + (!on));
  location.reload();
};

function _perfMark(key, extra) {
  if (!window._perfT0) return;
  window._perfMarks = window._perfMarks || {};
  if (window._perfMarks[key]) return;
  window._perfMarks[key] = true;
  if (!_debugOn()) return;
  const ms = Math.round(performance.now() - window._perfT0);
  console.log('%c[perf] ' + key + (extra ? ' ' + extra : '') + ' : ' + ms + ' ms',
    'color:#7c6df5;font-weight:bold');
}

async function startApp(user) {
  try {
    window._perfT0 = performance.now();
    window._perfMarks = {};
    currentUser = user.uid;
    window.currentUser = user.uid;
    const displayName = user.displayName || user.email.split('@')[0];
    document.getElementById('login-screen').style.display = 'none';
    const appEl = document.getElementById('app');
    appEl.style.display = 'block';
    appEl.classList.add('app-enter');
    setTimeout(() => appEl.classList.remove('app-enter'), 600);
    _restoreHideBalances();
    _startVersionCheck();
    document.getElementById('user-avatar').textContent = (displayName[0] || '?').toUpperCase();
    document.getElementById('user-name-display').textContent = displayName;

    // On bloque le 1er rendu UNIQUEMENT sur les données Firestore (rapide).
    // Les taux FX passent par les proxies CORS Yahoo (souvent lents/morts) et
    // ne servent qu'aux lignes non-EUR : on les charge en arrière-plan puis on
    // re-render. Évite que le dashboard attende 9 s pour 2 fetchs EURUSD/EURGBP.
    await _withTimeout(loadAllUserData(user.uid), 12000);
    _perfMark('données chargées (Firestore)');
    loadFxRates().then(() => {
      _perfMark('FX chargé (arrière-plan)');
      try { window.renderPortfolio(); } catch(_) {}
    });

    // Avatar + sync roles APRÈS chargement des settings (avatarHue dispo)
    updateMobileAvatar(user);
    if (!window.IS_DEMO) setFirestoreDoc(firestoreDoc(db, 'roles', user.uid), { avatarHue: _avatarHue(user.uid) }, { merge: true }).catch(() => {});
    loadProfilePage(user);
    window.renderPortfolio();
    window.fetchAllLogos();
    if (!window.autoRefreshInterval) window.toggleAutoRefresh();
    setTimeout(initStatCardsScroll, 1500);
    setTimeout(initChartExpandButtons, 800);

    // Preload des données lourdes (Benchmark + Performance + Watchlist)
    // en arrière-plan, pour que les pages s'affichent instantanément quand
    // l'utilisateur clique dessus.
    setTimeout(() => { preloadAll().catch(e => console.warn('Preload:', e)); }, 200);
    // Enregistrement auto des dividendes versés, sans avoir à ouvrir la page Dividendes.
    if (!window.IS_DEMO) setTimeout(() => { _autoLogDividends(); }, 1200);
    _updateNotifBadge();
    if (!window.IS_DEMO && Notification.permission === 'granted') initPush(user.uid).catch(() => {});
    try { _initSupportBadge(); } catch(e) { console.warn('support badge:', e); }
    try { _ensureUserName(user); } catch(e) { console.warn('name setup:', e); }
    try { _enforcePasswordChange(user); } catch(e) { console.warn('pw change:', e); }
    // Menu custom + feature flags — organisation et sections désactivées
    // (applyNavLayout gère aussi la visibilité de l'entrée Admin)
    _getAppConfig().then(c => {
      applySocialLinks(c.social);
      applyNavLayout(c.nav);
      applyFeatureFlags(c.features);
    }).catch(() => {
      applySocialLinks(null);
      applyNavLayout(null);
      applyFeatureFlags({});
    });
    try { _startPresenceHeartbeat(); } catch(e) { console.warn('presence:', e); }
    try { _processDiscordLink(user); } catch(e) { console.warn('discord link:', e); }
  } catch(e) {
    console.error('startApp error:', e);
  } finally {
    // L'app est affichée : on retire l'écran de chargement dans tous les cas.
    _hideSplash();
  }
}

function stopApp() {
  _hideSplash();
  if (window.IS_DEMO) {
    // En démo, rediriger vers signup au lieu d'afficher login (l'écran de login est masqué)
    location.href = 'app.html?signup=1';
    return;
  }
  currentUser = null;
  window.currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('input-email').value = '';
  document.getElementById('input-pass').value = '';
  const params = new URLSearchParams(location.search);
  if (params.get('signup') === '1') {
    showRegisterView();
  } else {
    showLoginView();
  }
}

// ─── OBSERVATEUR géré dans initFirebase() ─────

// ─── PROFIL ───────────────────────────────────────────
window.openProfilModal = function() {
  // Charge liste appareils confiance à l'ouverture
  try { window.refreshTrustedDevices && window.refreshTrustedDevices(); } catch(_) {}
  try { window.refreshPinStatus && window.refreshPinStatus(); } catch(_) {}
  document.getElementById('profil-modal-overlay').classList.add('open');
  loadProfilePage(fbAuth.currentUser);
};
window.closeProfilModal = function() {
  document.getElementById('profil-modal-overlay').classList.remove('open');
};

// Échap ferme la fenêtre profil quand elle est ouverte.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('profil-modal-overlay')?.classList.contains('open')) {
    closeProfilModal();
  }
});

// Active/désactive le récap quotidien push. Synchronise les deux
// contrôles (select du profil + case de la page Récap).
window.saveRecapPref = async function(value) {
  const on = value === 'on';
  await saveUserSettings(currentUser, { pushRecap: on });
  const st = document.getElementById('recap-freq-status');
  if (st) { st.textContent = '✓ Sauvegardé'; setTimeout(() => { st.textContent = ''; }, 2500); }
  _paintRecapButtons(on);
  const chk = document.getElementById('recap-notif-toggle');
  if (chk) chk.checked = on;
  _showChatToast({ icon: on ? IC.bell : IC.bellOff, title: on ? 'Récap activé' : 'Récap désactivé',
    msg: on ? 'Notification push chaque jour ouvré à 20h.' : 'Vous ne recevrez plus le récap quotidien.' });
};

function loadProfilePage(user) {
  if (!user) return;

  // Avatar : logo recoloré + palette de couleurs
  const letter = document.getElementById('profil-avatar-letter');
  if (letter) {
    letter.style.display = 'block';
    letter.innerHTML = defaultAvatarHtml(user.uid);
  }
  renderAvatarSwatches();

  // Nom & email
  const nameEl = document.getElementById('profil-display-name');
  const emailEl = document.getElementById('profil-email');
  const nameInput = document.getElementById('profil-name-input');
  nameEl.textContent = user.displayName || user.email.split('@')[0];
  emailEl.textContent = user.email;
  nameInput.value = user.displayName || '';

  // Badge fournisseur
  const badge = document.getElementById('profil-provider-badge');
  const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
  badge.innerHTML = isGoogle
    ? '<span style="font-size:10px;background:rgba(66,133,244,0.12);color:#4285F4;border:1px solid rgba(66,133,244,0.25);padding:2px 8px;border-radius:4px;font-family:var(--mono)">Connecté via Google</span>'
    : '<span style="font-size:10px;background:var(--accent-d);color:var(--accent);border:1px solid rgba(124,109,245,0.2);padding:2px 8px;border-radius:4px;font-family:var(--mono)">Email / Mot de passe</span>';

  // Cacher section MDP si Google
  const passSection = document.getElementById('profil-password-section');
  if (passSection) passSection.style.display = isGoogle ? 'none' : 'block';

  // Préférence récap quotidien push
  const settings    = getUserSettings(user.uid);
  _paintRecapButtons(settings.pushRecap !== false);

  // Nom d'utilisateur + état du cooldown
  _loadProfileUsername(user.uid);
}

const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

// Charge le username courant dans le champ profil + verrouille si cooldown actif.
async function _loadProfileUsername(uid) {
  const input  = document.getElementById('profil-username-input');
  const status = document.getElementById('profil-username-status');
  const btn    = document.getElementById('profil-username-btn');
  if (!input) return;
  const lock = (locked) => {
    input.disabled = locked;
    if (btn) { btn.disabled = locked; btn.style.opacity = locked ? '0.5' : '1'; btn.style.cursor = locked ? 'not-allowed' : 'pointer'; }
  };
  if (window.IS_DEMO) {
    input.value = 'demo.capitalboard';
    input.dataset.current = 'demo.capitalboard';
    status.textContent = 'Nom d\'utilisateur (démo).';
    status.style.color = 'var(--text3)';
    lock(true);
    return;
  }
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'roles', uid));
    const d = snap.exists() ? snap.data() : {};
    input.value = d.username || '';
    input.dataset.current = d.username || '';
    const rem = d.usernameChangedAt ? (USERNAME_COOLDOWN_MS - (Date.now() - d.usernameChangedAt)) : 0;
    if (rem > 0) {
      const days = Math.ceil(rem / (24 * 60 * 60 * 1000));
      status.textContent = `Prochain changement possible dans ${days} jour(s).`;
      status.style.color = 'var(--text3)';
      lock(true);
    } else {
      status.textContent = 'Modifiable une fois par mois. 3–20 caractères (lettres, chiffres, . - _).';
      status.style.color = 'var(--text3)';
      lock(false);
    }
  } catch (e) {
    console.warn('[username] load:', e.message);
  }
}

window.saveUsername = async function() {
  const input  = document.getElementById('profil-username-input');
  const status = document.getElementById('profil-username-status');
  const btn    = document.getElementById('profil-username-btn');
  const uname  = (input.value || '').trim().toLowerCase();
  const current = input.dataset.current || '';
  const set = (msg, ok) => { status.textContent = msg; status.style.color = ok ? 'var(--positive)' : 'var(--negative)'; };
  if (!/^[a-z0-9._-]{3,20}$/.test(uname)) return set('3–20 caractères : lettres, chiffres, . - _.', false);
  if (/capitalboard/.test(uname))         return set("Ce nom d'utilisateur n'est pas autorisé.", false);
  if (uname === current)                  return set("C'est déjà votre nom d'utilisateur.", false);
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    const idToken = await fbAuth.currentUser.getIdToken();
    const res = await fetch(`${WORKER_URL}/change-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, username: uname }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) {
      set(d.error || 'Échec du changement.', false);
      if (btn) { btn.disabled = false; btn.textContent = 'Changer'; }
      return;
    }
    input.value = d.username;
    input.dataset.current = d.username;
    set("✓ Nom d'utilisateur mis à jour !", true);
    if (btn) btn.textContent = 'Changer';
    // Cooldown désormais actif → recharge l'état (verrouille l'UI)
    setTimeout(() => _loadProfileUsername(fbAuth.currentUser.uid), 1500);
  } catch (e) {
    set('Erreur réseau, réessayez.', false);
    if (btn) { btn.disabled = false; btn.textContent = 'Changer'; }
  }
};

// Met en évidence le bouton actif du toggle Récap quotidien (Activé/Désactivé).
function _paintRecapButtons(on) {
  const bOn  = document.getElementById('btn-recap-on');
  const bOff = document.getElementById('btn-recap-off');
  if (!bOn || !bOff) return;
  const base     = 'border-radius:8px;padding:6px 14px;font-size:12px;font-family:var(--sans);font-weight:600;cursor:pointer;transition:all .15s;';
  const active   = 'background:var(--accent);border:1px solid var(--accent);color:#fff;';
  const inactive = 'background:var(--s2);border:1px solid var(--border);color:var(--text3);';
  bOn.style.cssText  = base + (on ? active : inactive);
  bOff.style.cssText = base + (on ? inactive : active);
}

window.saveDisplayName = async function() {
  const user = fbAuth.currentUser;
  const name = document.getElementById('profil-name-input').value.trim();
  const status = document.getElementById('profil-name-status');
  if (!name) { status.textContent = 'Le nom ne peut pas être vide.'; status.style.color = 'var(--negative)'; return; }
  // Pré-check client (UX) ; le refus autoritaire est fait côté Worker.
  if (/capitalboard/i.test(name.replace(/[\s._-]/g, ''))) { status.textContent = "Ce nom d'affichage n'est pas autorisé."; status.style.color = 'var(--negative)'; return; }
  status.textContent = 'Enregistrement…'; status.style.color = 'var(--text3)';
  try {
    const idToken = await user.getIdToken();
    const res = await fetch(`${WORKER_URL}/change-displayname`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, name }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) { status.textContent = d.error || 'Échec de la mise à jour.'; status.style.color = 'var(--negative)'; return; }
    // Rafraîchit le profil Auth local (le Worker a écrit côté serveur)
    try { await user.reload(); } catch(_) {}
    const applied = d.name || name;
    document.getElementById('user-name-display').textContent = applied;
    document.getElementById('profil-display-name').textContent = applied;
    document.getElementById('profil-name-input').value = applied;
    status.textContent = '✓ Nom mis à jour !';
    status.style.color = 'var(--positive)';
    setTimeout(() => { status.textContent = ''; }, 3000);
  } catch(e) {
    status.textContent = 'Erreur réseau, réessayez.';
    status.style.color = 'var(--negative)';
  }
};

window.saveNewPassword = async function() {
  const user = fbAuth.currentUser;
  const oldPass  = document.getElementById('profil-old-pass').value;
  const newPass  = document.getElementById('profil-new-pass').value;
  const newPass2 = document.getElementById('profil-new-pass2').value;
  const status   = document.getElementById('profil-pass-status');
  status.textContent = '';

  if (!oldPass || !newPass || !newPass2) { status.textContent = 'Remplissez tous les champs.'; status.style.color = 'var(--negative)'; return; }
  if (newPass !== newPass2) { status.textContent = 'Les mots de passe ne correspondent pas.'; status.style.color = 'var(--negative)'; return; }
  if (newPass.length < 6) { status.textContent = 'Mot de passe trop court (6 caractères min).'; status.style.color = 'var(--negative)'; return; }

  try {
    const cred = EmailAuthProvider.credential(user.email, oldPass);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPass);
    document.getElementById('profil-old-pass').value = '';
    document.getElementById('profil-new-pass').value = '';
    document.getElementById('profil-new-pass2').value = '';
    status.textContent = '✓ Mot de passe mis à jour !';
    status.style.color = 'var(--positive)';
    setTimeout(() => { status.textContent = ''; }, 3000);
  } catch(e) {
    const msgs = {
      'auth/wrong-password': 'Mot de passe actuel incorrect.',
      'auth/weak-password':  'Nouveau mot de passe trop faible.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    };
    status.textContent = msgs[e.code] || 'Erreur : ' + e.message;
    status.style.color = 'var(--negative)';
  }
};

// ─── SUPPRESSION COMPTE — modal 2 étapes ────────────
window.confirmDeleteAccount = function() {
  const modal = document.getElementById('delete-account-modal');
  if (!modal) return;
  document.getElementById('del-step-1').style.display = 'block';
  document.getElementById('del-step-2').style.display = 'none';
  document.getElementById('del-error').style.display = 'none';
  const pi = document.getElementById('del-pass-input');
  if (pi) pi.value = '';
  modal.style.display = 'flex';
};

window.closeDeleteAccountModal = function() {
  const modal = document.getElementById('delete-account-modal');
  if (modal) modal.style.display = 'none';
};

window.delGoToStep2 = function() {
  const user = fbAuth.currentUser;
  if (!user || !user.email) return;
  document.getElementById('del-step-1').style.display = 'none';
  document.getElementById('del-step-2').style.display = 'block';
  const disp = document.getElementById('del-email-display');
  if (disp) disp.textContent = user.email;
};

window.delBackToStep1 = function() {
  document.getElementById('del-step-2').style.display = 'none';
  const s3 = document.getElementById('del-step-3'); if (s3) s3.style.display = 'none';
  const s4 = document.getElementById('del-step-4'); if (s4) s4.style.display = 'none';
  document.getElementById('del-step-1').style.display = 'block';
  const err = document.getElementById('del-error'); if (err) err.style.display = 'none';
  const oerr = document.getElementById('del-otp-error'); if (oerr) oerr.style.display = 'none';
  const oi = document.getElementById('del-otp-input'); if (oi) oi.value = '';
};

// Génère code 6 chiffres
function _genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── 2FA DEVICE TRUST ──────────────────────────────────────

// ID unique persistant pour cet appareil/navigateur (stocké localStorage)
function _getDeviceId() {
  try {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
      localStorage.setItem('device_id', id);
    }
    return id;
  } catch(_) {
    // Fallback session-only
    if (!window._sessionDeviceId) window._sessionDeviceId = 'sess_' + Date.now().toString(36);
    return window._sessionDeviceId;
  }
}

// Label lisible depuis userAgent : "Firefox sur Windows" / "Safari sur iPhone"
function _getDeviceLabel() {
  const ua = navigator.userAgent || '';
  let browser = 'Navigateur';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  let os = 'OS inconnu';
  if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua) && !/Mobile/.test(ua)) os = 'macOS';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iPhone/iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Linux/.test(ua)) os = 'Linux';
  return `${browser} sur ${os}`;
}

// Lit la liste des appareils trustés (purge expirés au passage)
async function _getTrustedDevices(uid) {
  try {
    const ref = firestoreDoc(db, 'users', uid, 'data', 'trustedDevices');
    const snap = await getFirestoreDoc(ref);
    if (!snap.exists()) return {};
    const data = snap.data() || {};
    const devices = data.devices || {};
    const now = Date.now();
    // Filtre expirés
    const valid = {};
    for (const [id, d] of Object.entries(devices)) {
      if (d && d.expiresAt && d.expiresAt > now) valid[id] = d;
    }
    return valid;
  } catch(_) { return {}; }
}

async function _isDeviceTrusted(uid, deviceId) {
  const devices = await _getTrustedDevices(uid);
  const d = devices[deviceId];
  return !!(d && d.expiresAt > Date.now());
}

// Récupère IPv4 publique + localisation. Chain: api.ipify.org (force IPv4) → ipapi.co (geoloc).
async function _fetchIpInfo() {
  try {
    // 1) IPv4 publique
    let ipv4 = '';
    try {
      const ctrl1 = new AbortController();
      const t1 = setTimeout(() => ctrl1.abort(), 3000);
      const r1 = await fetch('https://api.ipify.org?format=json', { signal: ctrl1.signal });
      clearTimeout(t1);
      if (r1.ok) {
        const j1 = await r1.json();
        ipv4 = j1.ip || '';
      }
    } catch(_) {}
    // 2) Geoloc via ipapi.co — si IPv4 récupérée, force avec /{ip}/json/, sinon auto
    const url = ipv4 ? `https://ipapi.co/${ipv4}/json/` : 'https://ipapi.co/json/';
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 4000);
    const res = await fetch(url, { signal: ctrl2.signal });
    clearTimeout(t2);
    if (!res.ok) return ipv4 ? { ip: ipv4, city: '', region: '', country: '', countryCode: '' } : null;
    const j = await res.json();
    return {
      ip:      ipv4 || j.ip || '',
      city:    j.city || '',
      region:  j.region || '',
      country: j.country_name || '',
      countryCode: j.country_code || '',
    };
  } catch(_) { return null; }
}

function _fmtLocation(info) {
  if (!info) return '';
  return _trCountry(info.country) || '';
}

async function _addTrustedDevice(uid, deviceId, label, ipInfo) {
  const ref = firestoreDoc(db, 'users', uid, 'data', 'trustedDevices');
  const snap = await getFirestoreDoc(ref);
  const data = (snap.exists() && snap.data()) || {};
  const devices = data.devices || {};
  const now = Date.now();
  // Purge expirés à l'écriture
  for (const [id, d] of Object.entries(devices)) {
    if (!d || !d.expiresAt || d.expiresAt <= now) delete devices[id];
  }
  devices[deviceId] = {
    label: label || _getDeviceLabel(),
    firstSeen: devices[deviceId]?.firstSeen || now,
    lastSeen: now,
    expiresAt: now + DEVICE_TRUST_MS,
    ip: ipInfo?.ip || devices[deviceId]?.ip || '',
    city: ipInfo?.city || devices[deviceId]?.city || '',
    region: ipInfo?.region || devices[deviceId]?.region || '',
    country: ipInfo?.country || devices[deviceId]?.country || '',
    countryCode: ipInfo?.countryCode || devices[deviceId]?.countryCode || '',
  };
  await setFirestoreDoc(ref, { devices });
}

async function _updateDeviceLastSeen(uid, deviceId) {
  try {
    const ref = firestoreDoc(db, 'users', uid, 'data', 'trustedDevices');
    const snap = await getFirestoreDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() || {};
    const devices = data.devices || {};
    if (!devices[deviceId]) return;
    devices[deviceId].lastSeen = Date.now();
    await setFirestoreDoc(ref, { devices });
  } catch(_) {}
}

async function _revokeTrustedDevice(uid, deviceId) {
  const ref = firestoreDoc(db, 'users', uid, 'data', 'trustedDevices');
  const snap = await getFirestoreDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() || {};
  const devices = data.devices || {};
  delete devices[deviceId];
  await setFirestoreDoc(ref, { devices });
}

async function _sendOtpEmail(_toEmail, code) {
  const idToken = await fbAuth.currentUser.getIdToken();
  const turnstileToken = _getTurnstileToken('turnstile-delete');
  const res = await fetch(`${WORKER_URL}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, type: 'delete', code, turnstileToken }),
  });
  _resetTurnstile('turnstile-delete');
  if (!res.ok) throw new Error('Erreur envoi OTP suppression');
}

async function _send2faOtpEmail(_toEmail, code, deviceLabel, location) {
  const idToken = await fbAuth.currentUser.getIdToken();
  const res = await fetch(`${WORKER_URL}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, type: '2fa', code, deviceLabel, location }),
  });
  if (!res.ok) throw new Error('Erreur envoi OTP 2FA');
}

let _delLastSent = 0;
let _delResendTimer = null;

function _startResendCooldown() {
  const btn = document.getElementById('del-resend-btn');
  if (!btn) return;
  if (_delResendTimer) clearInterval(_delResendTimer);
  const tick = () => {
    const remain = Math.max(0, 60 - Math.floor((Date.now() - _delLastSent) / 1000));
    if (remain > 0) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.textContent = `Renvoyer le code (${remain}s)`;
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.textContent = 'Renvoyer le code';
      clearInterval(_delResendTimer);
      _delResendTimer = null;
    }
  };
  tick();
  _delResendTimer = setInterval(tick, 1000);
}

// Génère + stocke + envoie OTP. Bascule sur étape 4 (saisie code).
window.delFinalize = async function() {
  const err = document.getElementById('del-error');
  err.style.display = 'none';
  const user = fbAuth.currentUser;
  if (!user || !user.email) return;
  setLoading('del-final-btn', true);
  try {
    // Force refresh token (sinon email_verified claim peut être stale → rules deny)
    try { await user.reload(); await user.getIdToken(true); } catch(_) {}
    const code = _genOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
    const otpRef = firestoreDoc(db, 'users', user.uid, 'data', 'deleteOtp');
    const payload = { code, expiresAt, attempts: 0, createdAt: Date.now() };
    try {
      await setFirestoreDoc(otpRef, payload);
    } catch(e) {
      // Retry une fois après nouveau refresh token (propagation SDK Firestore parfois lente)
      if (e.code === 'permission-denied') {
        await new Promise(r => setTimeout(r, 800));
        try { await user.getIdToken(true); } catch(_) {}
        await setFirestoreDoc(otpRef, payload);
      } else { throw e; }
    }
    await _sendOtpEmail(user.email, code);
    _delLastSent = Date.now();
    // Bascule étape 4 (saisie code)
    document.getElementById('del-step-2').style.display = 'none';
    const s4 = document.getElementById('del-step-4');
    if (s4) {
      s4.style.display = 'block';
      const disp = document.getElementById('del-email-sent-display');
      if (disp) disp.textContent = user.email;
      const oi = document.getElementById('del-otp-input');
      if (oi) { oi.value = ''; setTimeout(() => oi.focus(), 50); }
    }
    _startResendCooldown();
  } catch(e) {
    console.error('[delete] envoi OTP échoué:', e);
    err.textContent = 'Erreur envoi du code : ' + (e.message || e.text || 'inconnue') + '. Réessayez.';
    err.style.display = 'block';
  } finally {
    setLoading('del-final-btn', false);
  }
};

// Renvoyer code (throttle 60s)
window.delResendOtp = async function() {
  if (Date.now() - _delLastSent < 60 * 1000) return;
  const user = fbAuth.currentUser;
  if (!user || !user.email) return;
  const oerr = document.getElementById('del-otp-error');
  if (oerr) oerr.style.display = 'none';
  try {
    try { await user.reload(); await user.getIdToken(true); } catch(_) {}
    const code = _genOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await setFirestoreDoc(firestoreDoc(db, 'users', user.uid, 'data', 'deleteOtp'), {
      code,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    });
    await _sendOtpEmail(user.email, code);
    _delLastSent = Date.now();
    _startResendCooldown();
    if (oerr) {
      oerr.textContent = 'Nouveau code envoyé.';
      oerr.style.color = '#22d98a';
      oerr.style.background = 'rgba(34,217,138,0.08)';
      oerr.style.display = 'block';
      setTimeout(() => { oerr.style.display = 'none'; oerr.style.color = '#ff4d6a'; oerr.style.background = 'rgba(255,77,106,0.08)'; }, 3000);
    }
  } catch(e) {
    console.error('[delete] renvoi OTP échoué:', e);
    if (oerr) {
      oerr.textContent = 'Échec renvoi : ' + (e.message || e.text || 'inconnue');
      oerr.style.display = 'block';
    }
  }
};

// Vérifie code + lance suppression complète + mail confirmation
window.delVerifyOtp = async function() {
  const oerr = document.getElementById('del-otp-error');
  if (oerr) oerr.style.display = 'none';
  const oi = document.getElementById('del-otp-input');
  const input = (oi?.value || '').trim();
  if (!/^\d{6}$/.test(input)) {
    if (oerr) { oerr.textContent = 'Code invalide (6 chiffres attendus).'; oerr.style.display = 'block'; }
    return;
  }
  const user = fbAuth.currentUser;
  if (!user || !user.email) return;
  setLoading('del-verify-btn', true);
  try {
    const ref = firestoreDoc(db, 'users', user.uid, 'data', 'deleteOtp');
    const snap = await getFirestoreDoc(ref);
    if (!snap.exists()) {
      if (oerr) { oerr.textContent = 'Code expiré. Renvoyez-en un nouveau.'; oerr.style.display = 'block'; }
      return;
    }
    const data = snap.data();
    if (Date.now() > data.expiresAt) {
      if (oerr) { oerr.textContent = 'Code expiré. Renvoyez-en un nouveau.'; oerr.style.display = 'block'; }
      return;
    }
    if ((data.attempts || 0) >= 5) {
      if (oerr) { oerr.textContent = 'Trop de tentatives. Renvoyez un nouveau code.'; oerr.style.display = 'block'; }
      return;
    }
    if (data.code !== input) {
      const left = 5 - ((data.attempts || 0) + 1);
      await setFirestoreDoc(ref, { ...data, attempts: (data.attempts || 0) + 1 });
      if (oerr) { oerr.textContent = `Code incorrect. ${left} tentative(s) restante(s).`; oerr.style.display = 'block'; }
      return;
    }
    // Code OK → bascule étape progress
    document.getElementById('del-step-4').style.display = 'none';
    const s3 = document.getElementById('del-step-3');
    if (s3) s3.style.display = 'block';

    const uid = user.uid;
    // Cleanup OTP doc
    try { await deleteFirestoreDoc(ref); } catch(_) {}
    // Unsubscribe tous les listeners Firestore avant suppression (évite snapshot permission-denied)
    try { if (_supportUnsub) { _supportUnsub(); _supportUnsub = null; } } catch(_) {}
    try { if (_supportThreadsUnsub) { _supportThreadsUnsub(); _supportThreadsUnsub = null; } } catch(_) {}
    try { if (_supportPresenceUnsub) { _supportPresenceUnsub(); _supportPresenceUnsub = null; } } catch(_) {}
    try { if (_supportThreadDocUnsub) { _supportThreadDocUnsub(); _supportThreadDocUnsub = null; } } catch(_) {}
    try { if (_presenceHeartbeat) { clearInterval(_presenceHeartbeat); _presenceHeartbeat = null; } } catch(_) {}

    // 1) Suppression compte Auth EN PREMIER (test reauth récente)
    //    Si fail, données utilisateur restent intactes.
    try {
      await deleteUser(user);
    } catch(e) {
      if (e.code === 'auth/requires-recent-login') {
        if (s3) s3.style.display = 'none';
        document.getElementById('del-step-4').style.display = 'block';
        if (oerr) {
          oerr.textContent = 'Session expirée. Déconnectez-vous, reconnectez-vous puis relancez la suppression.';
          oerr.style.display = 'block';
        }
        return;
      }
      throw e;
    }
    // 2) Suppression données Firestore + Storage (compte Auth déjà supprimé)
    await deleteAllUserData(uid);
    // 3) (Mail confirmation post-suppression supprimé — template EmailJS réaffecté au 2FA,
    //    quota 2 templates max sur plan gratuit. L'OTP suppression sert déjà de preuve d'action.)
    // 4) Ferme toutes modals + force retour login
    window.closeDeleteAccountModal();
    try { window.closeProfilModal && window.closeProfilModal(); } catch(_) {}
    try { await signOut(fbAuth); } catch(_) {}
    try { stopApp(); } catch(_) {}
  } catch(e) {
    console.error('[delete] verify OTP échoué:', e);
    const s3 = document.getElementById('del-step-3'); if (s3) s3.style.display = 'none';
    document.getElementById('del-step-4').style.display = 'block';
    if (oerr) {
      oerr.textContent = 'Erreur : ' + (e.message || e.code || 'inconnue');
      oerr.style.display = 'block';
    }
  } finally {
    setLoading('del-verify-btn', false);
  }
};

// ─── ENTRÉE CLAVIER ───────────────────────────────────
document.getElementById('input-pass').addEventListener('keydown', e => { if (e.key === 'Enter') window.doLogin(); });
document.getElementById('input-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('input-pass').focus(); });
document.getElementById('reg-pass2').addEventListener('keydown', e => { if (e.key === 'Enter') window.doRegister(); });

// ─── NAVIGATION ──────────────────────────────────────

// Mobile drawer
window.openMobileDrawer = function() {
  document.getElementById('mobile-drawer-overlay').classList.add('open');
};
window.closeMobileDrawer = function() {
  document.getElementById('mobile-drawer-overlay').classList.remove('open');
};

// Sync active states across mobile nav + drawer
function syncMobileNav(id) {
  document.querySelectorAll('.mobile-nav-item[data-mob]').forEach(b => {
    b.classList.toggle('active', b.dataset.mob === id);
  });
  document.querySelectorAll('.mobile-drawer-item[data-mob]').forEach(b => {
    b.classList.toggle('active', b.dataset.mob === id);
  });
}

// Décalage de teinte déterministe par utilisateur (hash de l'uid) —
// deux comptes ont quasiment toujours une couleur de logo différente.
function _userHue(seed) {
  let h = 0;
  const s = String(seed || 'x');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

// Teinte de l'avatar : choix de l'utilisateur si défini, sinon couleur
// générée automatiquement depuis l'uid.
function _avatarHue(uid) {
  const s = getUserSettings(uid);
  return (s && typeof s.avatarHue === 'number') ? s.avatarHue : _userHue(uid);
}

// Avatar : logo Capital Board recoloré par rotation de teinte.
function defaultAvatarHtml(uid) {
  return '<img src="assets/logo.png" alt="" style="width:100%;height:100%;border-radius:inherit;'
    + 'object-fit:cover;filter:hue-rotate(' + _avatarHue(uid) + 'deg)">';
}

// Met à jour les avatars (sidebar + mobile) — toujours le logo recoloré.
function updateMobileAvatar(user) {
  if (!user) return;
  const sidebarEl = document.getElementById('user-avatar');
  if (sidebarEl) sidebarEl.innerHTML = defaultAvatarHtml(user.uid);
  const letter = document.getElementById('mobile-avatar-letter');
  if (letter) letter.innerHTML = defaultAvatarHtml(user.uid);
}

// Rend la palette de couleurs d'avatar dans le profil.
function renderAvatarSwatches() {
  const el = document.getElementById('avatar-hue-swatches');
  if (!el) return;
  const cur = _avatarHue(currentUser);
  let best = 0, bestDiff = 999;
  const hues = [];
  for (let d = 0; d < 360; d += 30) {
    hues.push(d);
    const diff = Math.min(Math.abs(d - cur), 360 - Math.abs(d - cur));
    if (diff < bestDiff) { bestDiff = diff; best = d; }
  }
  el.innerHTML = hues.map(d => {
    const sel = d === best;
    return '<div onclick="setAvatarHue(' + d + ')" title="Couleur" style="width:42px;height:42px;'
      + 'border-radius:11px;cursor:pointer;overflow:hidden;flex-shrink:0;transition:transform .12s;'
      + 'border:2px solid ' + (sel ? 'var(--accent)' : 'transparent') + '">'
      + '<img src="assets/logo.png" style="width:100%;height:100%;object-fit:cover;filter:hue-rotate(' + d + 'deg)">'
      + '</div>';
  }).join('');
}

// Change la couleur de l'avatar.
window.setAvatarHue = async function(deg) {
  await saveUserSettings(currentUser, { avatarHue: deg });
  setFirestoreDoc(firestoreDoc(db, 'roles', currentUser), { avatarHue: deg }, { merge: true }).catch(() => {});
  const letEl = document.getElementById('profil-avatar-letter');
  if (letEl) letEl.innerHTML = defaultAvatarHtml(currentUser);
  updateMobileAvatar(fbAuth.currentUser);
  renderAvatarSwatches();
  const st = document.getElementById('avatar-status');
  if (st) { st.textContent = '✓ Couleur enregistrée'; setTimeout(() => { st.textContent = ''; }, 2000); }
};

// ─── Feature flags (config/app.features) ───
const FLAGGABLE = ['watchlist','dividendes','performance','benchmark','projections','earnings','recap','alertes','actualites','favoris'];
let _featureFlags = {};
function _isFeatureOn(key) { return _featureFlags[key] !== false; }
function applyFeatureFlags(features) {
  _featureFlags = features || {};
  FLAGGABLE.forEach(key => {
    const on = _featureFlags[key] !== false;
    const needles = ["showPage('" + key + "')", "showPageMobile('" + key + "')"];
    document.querySelectorAll('[onclick]').forEach(el => {
      const oc = el.getAttribute('onclick') || '';
      if (needles.some(n => oc.includes(n))) {
        el.style.display = on ? '' : 'none';
      }
    });
  });
}

// ─── Organisation du menu (config/app.nav) ───
const SECTION_LABELS = {
  portfolio: 'Portefeuille', activite: 'Activité', dividendes: 'Dividendes', watchlist: 'Watchlist',
  performance: 'Performance', benchmark: 'Benchmark', projections: 'Projections', earnings: 'Calendrier résultats',
  recap: 'Récap du jour', actualites: 'Actualités', favoris: 'Contenus favoris', alertes: 'Alertes prix', notifications: 'Notifications', support: 'Support',
  admin: 'Admin', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', discord: 'Discord', facebook: 'Facebook',
  paypal: 'Faire un don',
};
const ALL_SECTIONS = Object.keys(SECTION_LABELS);
const ADMIN_ONLY_KEYS = ['admin']; // rendus uniquement pour l'admin
const DEFAULT_NAV = [
  { title: 'Mon PEA',        items: ['portfolio', 'activite', 'dividendes', 'watchlist'] },
  { title: 'Analyse',        items: ['performance', 'benchmark', 'projections', 'earnings'] },
  { title: 'Outils',         items: ['actualites', 'favoris', 'recap', 'alertes', 'notifications', 'support'] },
  { title: 'Administration', items: ['admin'] },
  { title: 'Réseaux',        items: ['instagram', 'tiktok', 'youtube', 'discord', 'facebook'] },
  { title: 'Nous soutenir',  items: ['paypal'] },
];
let _navNodes = null;   // cache des noeuds .nav-item par clé (sidebar desktop)
let _mobNavNodes = null; // cache des noeuds .mobile-drawer-item par clé (drawer)
let _navDraft = null;   // brouillon d'édition admin

// ─── Liens externes éditables par l'admin (config/app.social) ───
// Entrées de menu ouvrant un lien (réseaux sociaux + don), URL modifiable
// depuis l'éditeur d'organisation du menu.
const SOCIAL_KEYS = ['instagram', 'tiktok', 'youtube', 'discord', 'facebook', 'paypal'];
const DEFAULT_SOCIAL = {
  instagram: 'https://www.instagram.com/capitalboard',
  tiktok:    'https://www.tiktok.com/@capitalboard',
  youtube:   'https://www.youtube.com/@capitalboard',
  discord:   'https://discord.gg/ZN9459TCTQ',
  facebook:  'https://www.facebook.com/profile.php?id=61592307454394',
  paypal:    'https://www.paypal.com/paypalme/capitalboard',
};
let _socialLinks = { ...DEFAULT_SOCIAL };
let _socialDraft = null; // brouillon d'édition admin

// Applique la config des liens sociaux. Les entrées de menu appellent
// openSocial(key) qui lit _socialLinks au clic : aucune mutation du DOM.
function applySocialLinks(social) {
  _socialLinks = { ...DEFAULT_SOCIAL };
  if (social && typeof social === 'object') {
    SOCIAL_KEYS.forEach(k => { if (social[k]) _socialLinks[k] = String(social[k]); });
  }
}
// Ouvre le lien social configuré. `mobile` ferme le tiroir mobile après.
function openSocial(key, mobile) {
  // Le don passe par une page interstitielle capitalboard.fr (remerciement +
  // explication PayPal) plutôt que d'ouvrir PayPal directement.
  if (key === 'paypal') {
    const pp = _socialLinks.paypal || DEFAULT_SOCIAL.paypal;
    // _v = APP_VERSION : casse le cache navigateur de soutien.html à chaque déploiement.
    window.open('soutien.html?url=' + encodeURIComponent(pp) + '&_v=' + APP_VERSION, '_blank', 'noopener');
    if (mobile) { try { closeMobileDrawer(); } catch (_) {} }
    return;
  }
  const url = _socialLinks[key] || DEFAULT_SOCIAL[key];
  if (url) window.open(url, '_blank', 'noopener');
  if (mobile) { try { closeMobileDrawer(); } catch (_) {} }
}
window.openSocial = openSocial;

function _cacheNavNodes() {
  if (_navNodes) return;
  const container = document.getElementById('nav-dynamic');
  if (!container) return;
  _navNodes = {};
  container.querySelectorAll('.nav-item').forEach(el => {
    const oc = el.getAttribute('onclick') || '';
    let key = el.dataset.social || null; // entrées réseaux : data-social
    if (!key) {
      const m = oc.match(/showPage\('([^']+)'\)/);
      if (m) key = m[1];
    }
    if (key) _navNodes[key] = el;
  });
}

// Même cache pour le tiroir mobile : les entrées portent data-mob (pages)
// ou data-social (liens externes).
function _cacheMobNavNodes() {
  if (_mobNavNodes) return;
  const container = document.getElementById('mobile-nav-dynamic');
  if (!container) return;
  _mobNavNodes = {};
  container.querySelectorAll('.mobile-drawer-item').forEach(el => {
    const key = el.dataset.social || el.dataset.mob || null;
    if (key) _mobNavNodes[key] = el;
  });
}

// Rend une nav (sidebar ou drawer) selon `layout`, en réutilisant les noeuds
// déjà présents dans le DOM. `labelCls` diffère entre desktop et mobile.
function _renderNavInto(container, nodes, layout, labelCls, spaced) {
  const addSection = (title, keys) => {
    const lab = document.createElement('div');
    lab.className = labelCls;
    if (spaced && container.children.length) lab.style.marginTop = '14px';
    lab.textContent = title || '';
    container.appendChild(lab);
    keys.forEach(key => container.appendChild(nodes[key]));
  };
  const usable = key => {
    if (!nodes[key]) return false;
    if (ADMIN_ONLY_KEYS.includes(key) && !isAdmin()) return false;
    return true;
  };
  // Récupération des orphelins : entrées connues absentes de la config
  // sauvegardée (ex. « Actualités » ajoutée après la dernière personnalisation
  // admin). Réinjectées dans la catégorie DEFAULT_NAV de même titre quand elle
  // est déjà affichée — sinon on obtenait un second bloc « Outils » en bas du
  // menu, sous les réseaux sociaux.
  const placed = new Set();
  layout.forEach(cat => (cat.items || []).forEach(key => placed.add(key)));
  const merged = layout.map(cat => ({ title: cat.title, items: [...(cat.items || [])] }));
  DEFAULT_NAV.forEach(cat => {
    const missing = (cat.items || []).filter(key => !placed.has(key));
    if (!missing.length) return;
    const target = merged.find(c => (c.title || '') === (cat.title || ''));
    if (target) target.items.push(...missing);
    else merged.push({ title: cat.title, items: missing });
  });

  container.innerHTML = '';
  merged.forEach(cat => {
    const visible = (cat.items || []).filter(usable);
    if (!visible.length) return; // catégorie vide → pas de titre
    addSection(cat.title, visible);
  });
}

function applyNavLayout(nav) {
  // _mergeNavOrphans : si une config est sauvegardée en base (édition admin),
  // elle peut précéder l'ajout de nouvelles entrées (ex : Facebook). On y
  // rajoute donc les clés DEFAULT_NAV manquantes pour qu'elles apparaissent
  // live sans devoir ré-enregistrer le menu côté admin.
  const layout = (Array.isArray(nav) && nav.length) ? _mergeNavOrphans(nav) : DEFAULT_NAV;
  const container = document.getElementById('nav-dynamic');
  if (container) {
    _cacheNavNodes();
    _renderNavInto(container, _navNodes, layout, 'nav-section-label', true);
  }
  // Le tiroir mobile suit la même config : même ordre, mêmes entrées admin.
  const mob = document.getElementById('mobile-nav-dynamic');
  if (mob) {
    _cacheMobNavNodes();
    _renderNavInto(mob, _mobNavNodes, layout, 'mobile-drawer-section', false);
  }
}

function showPage(id) {
  if (FLAGGABLE.includes(id) && !_isFeatureOn(id)) return; // section désactivée
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  event.currentTarget.classList.add('active');
  // Sync mobile nav
  document.querySelectorAll('.mobile-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.mob === id);
  });
  if (window.IS_DEMO && id === 'performance') { _renderDemoBlocked('page-performance', 'Analyse de performance'); return; }
  if (id === 'activite')    renderActivite();
  if (id === 'graphiques')  initCharts();
  if (id === 'recap')       renderRecapPage();
  if (id === 'actualites')  renderActualites();
  if (id === 'favoris')     renderFavoris();
  if (id === 'alertes')     renderAlertsList();
  if (id === 'support')     renderSupportPage();
  if (id === 'earnings')    renderEarningsCalendar();
  if (id === 'admin')       renderAdminPage();
}

function _renderDemoBlocked(pageId, sectionTitle) {
  const el = document.getElementById(pageId);
  if (!el) return;
  el.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;min-height:60vh;padding:32px">'
    + '<div style="text-align:center;max-width:520px;padding:48px 32px;background:var(--s1);border:1px solid var(--border2);border-radius:20px">'
    + '<div style="width:64px;height:64px;margin:0 auto 20px;border-radius:50%;background:rgba(245,183,49,0.15);display:flex;align-items:center;justify-content:center">'
    + '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    + '</div>'
    + '<div style="font-size:20px;color:var(--text);font-weight:700;margin-bottom:10px">' + sectionTitle + ' indisponible</div>'
    + '<div style="font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:24px">Cette section nécessite vos vraies données et un import CSV de votre courtier.<br><br>Créez un compte gratuit pour y accéder.</div>'
    + '<a href="app.html?signup=1" class="btn btn-primary" style="padding:12px 28px;font-size:14px">Créer un compte gratuit →</a>'
    + '</div></div>';
}

function showPageMobile(id) {
  if (FLAGGABLE.includes(id) && !_isFeatureOn(id)) return; // section désactivée
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  syncMobileNav(id);
  // Sync sidebar nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    const onclick = n.getAttribute('onclick') || '';
    if (onclick.includes("'" + id + "'")) n.classList.add('active');
  });
  if (window.IS_DEMO && id === 'performance') { _renderDemoBlocked('page-performance', 'Analyse de performance'); return; }
  if (id === 'activite')    renderActivite();
  if (id === 'graphiques')  initCharts();
  if (id === 'recap')       renderRecapPage();
  if (id === 'actualites')  renderActualites();
  if (id === 'favoris')     renderFavoris();
  if (id === 'alertes')     renderAlertsList();
  if (id === 'support')     renderSupportPage();
  if (id === 'earnings')    renderEarningsCalendar();
  if (id === 'admin')       renderAdminPage();
}

// ─── PORTFOLIO ────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// Cartes de synthèse (valorisation totale, +/- value latente, solde espèces,
// évaluation des titres) : même défilement que le tableau, de l'ancienne valeur
// vers la nouvelle. La valeur brute est mémorisée sur l'élément — le texte
// affiché est formaté et parfois signé, donc impossible à relire tel quel.
// `value === null` remet le tiret des portefeuilles vides.
const _pxFmtSigned = (v) => (v >= 0 ? '+' : '') + fmt(v);

function _statSet(el, value, format) {
  if (!el) return;
  format = format || fmt;
  if (value === null || !isFinite(value)) {
    el.textContent = '— €';
    delete el.dataset.stat;
    return;
  }
  const prev = el.dataset.stat !== undefined ? +el.dataset.stat : NaN;
  el.dataset.stat = value;
  if (!isFinite(prev) || prev === value || _pxReduceMotion()) {
    el.textContent = format(value);
    return;
  }
  _pxCount(el, prev, value, format);
}

function renderPortfolio() {
  const data = getPortfolio(currentUser);
  const tbody = document.getElementById('portfolio-tbody');
  const empty = document.getElementById('empty-state');

  tbody.innerHTML = '';

  let totalVal = 0, totalInvested = 0;

  if (data.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    data.forEach((row, i) => {
      const val = row.qty * row.currentPrice;
      const invested = row.qty * row.buyPrice;
      const pnl = val - invested;
      const pct = invested > 0 ? (pnl / invested) * 100 : 0;
      totalVal += val;
      totalInvested += invested;

      const abbr = (row.name || row.ticker || '?').substring(0, 3).toUpperCase();
      const isPos = pnl >= 0;

      const chg = row.changePct || 0;
      const dayVal = row.qty * row.currentPrice * chg / 100;
      const dayPctTxt = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
      const dayEurTxt = `${chg >= 0 ? '+' : ''}${dayVal.toFixed(2)} €`;
      const perfJourHtml = chg !== 0
        ? `<span class="perf-jour-cell ${chg >= 0 ? 'perf-pos' : 'perf-neg'}"
              data-pct="${dayPctTxt}"
              data-eur="${dayEurTxt}"
              onclick="togglePerfJourMode()"
              style="cursor:pointer">${_perfJourMode === 'eur' ? dayEurTxt : dayPctTxt}</span>`
        : `<span style="color:var(--text3);font-size:11px">—</span>`;

      const tr = document.createElement('tr');
      // Repères pour l'animation de refresh : on compare ces valeurs d'un
      // rendu à l'autre pour n'animer que ce qui a réellement bougé.
      tr.dataset.tk  = row.ticker || '';
      tr.dataset.px  = row.currentPrice;
      tr.dataset.val = val;
      tr.dataset.pnl = pnl;
      tr.dataset.pct = pct;
      tr.dataset.chg = chg;
      tr.dataset.day = dayVal;
      tr.innerHTML = `
        <td>
          <div class="ticker-cell">
            ${logoHtml(row.ticker, 26, 'ticker-icon')}
            <div>
              <div class="ticker-name">${row.name || row.ticker}<span class="${isETF(row.ticker) ? 'badge-etf' : 'badge-action'}">${isETF(row.ticker) ? 'ETF' : 'ACTION'}</span></div>
              <div class="ticker-sym">${row.ticker || ''}</div>
            </div>
          </div>
        </td>
        <td class="mono hide-mobile">${row.qty}</td>
        <td class="mono hide-mobile">${fmt(row.buyPrice)}</td>
        <td class="mono hide-mobile c-px">${fmt(row.currentPrice)}</td>
        <td class="mono c-valcell">
          <div style="font-weight:500" class="c-val">${fmt(val)}</div>
          <div class="perf-total-sub ${isPos ? 'perf-pos' : 'perf-neg'}"
               data-pct="${isPos ? '+' : ''}${pct.toFixed(2)}%"
               data-eur="${isPos ? '+' : ''}${fmt(Math.abs(pnl))}"
               onclick="togglePerfTotalMode()"
               style="cursor:pointer">${_perfTotalMode === 'eur'
                 ? `${isPos ? '+' : ''}${fmt(Math.abs(pnl))}`
                 : `${isPos ? '+' : ''}${pct.toFixed(2)}%`}</div>
        </td>
        <td class="hide-mobile c-plus">
          <span class="${isPos ? 'badge-pos' : 'badge-neg'}">
            ${isPos ? '▲' : '▼'} <span class="bd-eur">${fmt(Math.abs(pnl))}</span> (<span class="bd-pct">${isPos ? '+' : ''}${pct.toFixed(2)}%</span>)
          </span>
        </td>
        <td class="c-day">${perfJourHtml}</td>
        <td style="text-align:right;padding-right:18px;white-space:nowrap">
          <div class="btn-portfolio-actions" style="display:inline-flex;gap:6px;align-items:center">
            <button class="btn-edit" onclick="openEditModal(${i})" title="Modifier" style="display:inline-flex;align-items:center;justify-content:center">${IC.edit}</button>
            <button class="btn-del" onclick="deleteRow(${i})" title="Supprimer">✕</button>
          </div>
          <button class="btn-voir-plus" onclick="togglePortfolioDetail(${i})" title="Voir plus">▾</button>
        </td>
      `;
      tbody.appendChild(tr);

      const detailTr = document.createElement('tr');
      detailTr.className = 'mobile-detail-row';
      detailTr.id = 'portfolio-detail-' + i;
      detailTr.innerHTML = `
        <td colspan="8">
          <div class="portfolio-detail-content">
            <div class="portfolio-detail-grid">
              <span><label>Qté</label>${row.qty}</span>
              <span><label>PRU</label>${fmt(row.buyPrice)}</span>
              <span><label>Cours</label>${fmt(row.currentPrice)}</span>
              <span><label>+/- Value</label><span class="${isPos ? 'badge-pos' : 'badge-neg'}">${isPos ? '▲' : '▼'} ${fmt(Math.abs(pnl))} (${isPos ? '+' : ''}${pct.toFixed(2)}%)</span></span>
            </div>
            <div class="portfolio-detail-actions">
              <button class="btn-edit" onclick="openEditModal(${i})" style="display:inline-flex;align-items:center;gap:5px">${IC.edit}Modifier</button>
              <button class="btn-del" onclick="deleteRow(${i})">✕ Supprimer</button>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(detailTr);
    });
  }

  const totalPnl = totalVal - totalInvested;
  const totalPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  _statSet(document.getElementById('stat-total'), data.length ? totalVal : null);
  document.getElementById('stat-invested').textContent = data.length ? fmt(totalInvested) : '— €';
  const pnlEl = document.getElementById('stat-pnl');
  _statSet(pnlEl, data.length ? totalPnl : null, _pxFmtSigned);
  pnlEl.style.color = totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)';
  const pnlPctEl = document.getElementById('stat-pnl-pct');
  pnlPctEl.textContent = data.length && totalInvested > 0 ? (totalPnl >= 0 ? '+' : '') + (totalPnl / totalInvested * 100).toFixed(2) + '%' : '—';
  pnlPctEl.style.color = totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)';

  // Calculate realized P&L from transaction history
  const txs = getTransactions(currentUser);
  let realizedTotal = 0;
  txs.forEach(tx => {
    if (tx.type === 'sell' && tx.realizedPnl != null) {
      realizedTotal += tx.realizedPnl;
    }
  });
  const realEl = document.getElementById('stat-realized');
  realEl.textContent = (realizedTotal >= 0 ? '+' : '') + fmt(realizedTotal);
  realEl.style.color = realizedTotal >= 0 ? 'var(--positive)' : 'var(--negative)';
  const realSub = document.getElementById('stat-realized-sub');
  realSub.textContent = realizedTotal >= 0 ? 'Gains clôturés' : 'Pertes clôturées';
  realSub.style.color = realizedTotal >= 0 ? 'var(--positive)' : 'var(--negative)';

  // Versements & cash
  const versements = getVersements(currentUser);
  const totalVersements = versements.reduce((s, v) => s + v.amount, 0);
  document.getElementById('stat-versements').textContent = fmt(totalVersements);

  // Cash = versements - total achats + total ventes + dividendes (from tx log)
  let totalAchats = 0, totalVentes = 0, totalDividendes = 0, totalDistributions = 0;
  txs.forEach(tx => {
    if (tx.type === 'buy') totalAchats += tx.qty * tx.price;
    if (tx.type === 'sell') totalVentes += tx.qty * tx.price;
    if (tx.type === 'dividend') totalDividendes += tx.qty * tx.price;
    if (tx.type === 'distribution') totalDistributions += tx.qty * tx.price;
  });
  const cash = totalVersements - totalAchats + totalVentes + totalDividendes + totalDistributions;
  const cashEl = document.getElementById('stat-cash');
  _statSet(cashEl, cash);
  cashEl.style.color = cash >= 0 ? 'var(--positive)' : 'var(--negative)';

  // Héro — Valorisation totale (titres + espèces)
  const networth = totalVal + cash;
  _statSet(document.getElementById('stat-networth'), data.length ? networth : null);
  const nwPct = document.getElementById('stat-networth-pct');
  if (nwPct) {
    nwPct.textContent = data.length ? (totalPnl >= 0 ? '↗ +' : '↘ ') + totalPct.toFixed(2) + ' %' : '—';
    nwPct.className = 'pf-pill' + (totalPnl >= 0 ? '' : ' neg');
  }
  const nwSub = document.getElementById('stat-networth-sub');
  if (nwSub) nwSub.textContent = data.length ? (totalPnl >= 0 ? '+' : '') + fmt(totalPnl) + ' depuis le début' : '';

  // Répartition Titres / Espèces (barre d'allocation du héro)
  const allocEl = document.getElementById('pf-alloc');
  if (allocEl) {
    const titres = Math.max(0, totalVal);
    const espece = Math.max(0, cash);
    const tot = titres + espece;
    if (!data.length || tot <= 0) { allocEl.innerHTML = ''; }
    else {
      const tPct = titres / tot * 100;
      const ePct = 100 - tPct;
      allocEl.innerHTML =
        '<div class="pf-alloc-bar">' +
          '<span style="width:' + tPct.toFixed(1) + '%;background:var(--positive)"></span>' +
          '<span style="width:' + ePct.toFixed(1) + '%;background:var(--gold)"></span>' +
        '</div>' +
        '<div class="pf-alloc-legend">' +
          '<span><span class="dot" style="background:var(--positive)"></span>Titres <b>' + tPct.toFixed(1) + '%</b></span>' +
          '<span><span class="dot" style="background:var(--gold)"></span>Espèces <b>' + ePct.toFixed(1) + '%</b></span>' +
        '</div>';
    }
  }

  // Render transaction history
  renderTxHistory();

  _perfMark('chiffres affichés');
  renderPortfolioChart();
}

function deleteRow(i) {
  const data = getPortfolio(currentUser);
  const row = data[i];
  if (!row) return;

  // Suppression définitive (pas d'annulation possible) : on confirme d'abord.
  const label     = row.name || row.ticker;
  const stillHeld = data.some((r, j) => j !== i && r.ticker === row.ticker);
  const txCount   = stillHeld ? 0 : getTransactions(currentUser).filter(tx => tx.ticker === row.ticker).length;

  let body = label + ' — ' + row.qty + ' × ' + fmt(row.buyPrice) + ' (PRU)';
  if (txCount) {
    body += '\nSes ' + txCount + ' transaction' + (txCount > 1 ? 's' : '') + ' seront également supprimée' + (txCount > 1 ? 's' : '') + '.';
  }
  body += '\nCette action est irréversible.';

  showConfirmModal({
    icon:        '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    title:       'Supprimer cette ligne ?',
    body,
    okLabel:     'Supprimer',
    cancelLabel: 'Annuler',
    danger:      true,
    onConfirm:   () => _doDeleteRow(row),
  });
}

function _doDeleteRow(row) {
  const data = getPortfolio(currentUser);
  // Ré-résolution de l'index : la liste a pu être re-rendue pendant la confirmation.
  const i = data.indexOf(row);
  if (i === -1) return;
  data.splice(i, 1);
  // If no other line with same ticker remains, purge all its transactions
  const stillHeld = data.some(r => r.ticker === row.ticker);
  if (!stillHeld) {
    const txs = getTransactions(currentUser);
    saveTransactions(currentUser, txs.filter(tx => tx.ticker !== row.ticker));
  }
  savePortfolio(currentUser, data);
  renderPortfolio();
}

let _txShowAll = false;
const TX_HISTORY_LIMIT = 10;

function toggleTxHistory() {
  _txShowAll = !_txShowAll;
  renderTxHistory();
}

function renderTxHistory() {
  const txs = getTransactions(currentUser);
  const tbody = document.getElementById('tx-history-tbody');
  const empty = document.getElementById('tx-empty');
  const count = document.getElementById('tx-count');
  const moreWrap = document.getElementById('tx-show-more-wrap');

  if (!tbody) return;   // bloc historique retiré du portefeuille → voir onglet Activité

  if (!txs.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    count.textContent = '0 opérations';
    if (moreWrap) moreWrap.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  // Sort by date descending (most recent first)
  const sorted = [...txs].sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  count.textContent = sorted.length + ' opération' + (sorted.length > 1 ? 's' : '');

  // Affiche les 10 premières, le reste derrière le bouton "Afficher plus"
  const visible = _txShowAll ? sorted : sorted.slice(0, TX_HISTORY_LIMIT);
  if (moreWrap) {
    if (sorted.length > TX_HISTORY_LIMIT) {
      moreWrap.innerHTML = '<button onclick="toggleTxHistory()" style="background:var(--s3);border:1px solid var(--border);border-radius:7px;padding:6px 16px;font-size:11px;font-weight:600;color:var(--text2);cursor:pointer;font-family:var(--sans)">' +
        (_txShowAll ? 'Afficher moins' : 'Afficher plus (' + (sorted.length - TX_HISTORY_LIMIT) + ')') + '</button>';
    } else {
      moreWrap.innerHTML = '';
    }
  }

  tbody.innerHTML = visible.map(tx => {
    const isBuy = tx.type === 'buy';
    const montant = (tx.qty * tx.price).toFixed(2);
    const _d = tx.date ? new Date(tx.date + 'T12:00:00') : null;
    const dateStr = _d ? String(_d.getDate()).padStart(2,'0') + '/' + String(_d.getMonth()+1).padStart(2,'0') + '/' + String(_d.getFullYear()).slice(-2) : '—';
    const pnlHtml = tx.type === 'sell' && tx.realizedPnl != null
      ? '<span style="color:' + (tx.realizedPnl >= 0 ? 'var(--positive)' : 'var(--negative)') + ';font-weight:600">' + (tx.realizedPnl >= 0 ? '+' : '') + tx.realizedPnl.toFixed(2) + ' €</span>'
      : '<span style="color:var(--text3)">—</span>';
    return '<tr>' +
      '<td class="mono" style="font-size:10px;white-space:nowrap">' + dateStr + '</td>' +
      '<td>' + (
        tx.type === 'buy'
          ? '<span class="badge-pos" style="font-size:11px;padding:3px 10px">▲ ACHAT</span>'
          : tx.type === 'dividend'
          ? '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(245,183,49,0.12);color:#f5b731;border:1px solid rgba(245,183,49,0.25);font-weight:600;white-space:nowrap">◆ DIVIDENDE</span>'
          : tx.type === 'distribution'
          ? '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(124,109,245,0.14);color:#a99bff;border:1px solid rgba(124,109,245,0.3);font-weight:600;white-space:nowrap">🎁 ATTRIBUTION</span>'
          : '<span class="badge-neg" style="font-size:11px;padding:3px 10px">▼ VENTE</span>'
      ) + '</td>' +
      '<td style="font-size:12px">' + (tx.name || tx.ticker || '—') + '</td>' +
      '<td class="mono" style="font-size:12px">' + tx.qty + '</td>' +
      '<td class="mono hide-mobile" style="font-size:12px">' + tx.price.toFixed(2) + ' €</td>' +
      '<td class="mono" style="font-size:12px;white-space:nowrap">' + montant + ' €</td>' +
      '<td class="mono hide-mobile" style="font-size:12px">' + pnlHtml + '</td>' +
      '</tr>';
  }).join('');
}
let editRowIndex = -1;
let _perfJourMode = 'pct';
let _perfTotalMode = 'pct';
function togglePerfTotalMode() {
  _perfTotalMode = _perfTotalMode === 'pct' ? 'eur' : 'pct';
  document.querySelectorAll('.perf-total-sub').forEach(el => {
    el.textContent = el.dataset[_perfTotalMode];
  });
}
function togglePerfJourMode() {
  _perfJourMode = _perfJourMode === 'pct' ? 'eur' : 'pct';
  document.querySelectorAll('.perf-jour-cell').forEach(el => {
    el.textContent = el.dataset[_perfJourMode];
  });
  const th = document.getElementById('th-perf-jour');
  if (th) th.textContent = _perfJourMode === 'pct' ? 'Perf. jour %' : 'Perf. jour €';
}

function togglePortfolioDetail(i) {
  const detail = document.getElementById('portfolio-detail-' + i);
  const btn = detail.previousElementSibling.querySelector('.btn-voir-plus');
  const open = detail.classList.toggle('open');
  if (btn) btn.textContent = open ? '▴' : '▾';
}

let _reorderTmp = [];
function openReorderModal() {
  _reorderTmp = getPortfolio(currentUser).map(r => ({ ticker: r.ticker, name: r.name }));
  renderReorderList();
  document.getElementById('reorder-modal-overlay').style.display = 'flex';
}
function closeReorderModal() {
  document.getElementById('reorder-modal-overlay').style.display = 'none';
}
function renderReorderList() {
  const list = document.getElementById('reorder-list');
  list.innerHTML = _reorderTmp.map((r, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--s2);border-radius:8px;border:1px solid var(--s3)">
      <span style="flex:1;font-size:13px;font-weight:500">${r.name || r.ticker}</span>
      <button onclick="moveReorderItem(${i},-1)" ${i===0?'disabled':''} style="width:28px;height:28px;border-radius:6px;border:1px solid var(--s3);background:var(--s1);color:var(--text2);cursor:pointer;font-size:14px">▲</button>
      <button onclick="moveReorderItem(${i},1)" ${i===_reorderTmp.length-1?'disabled':''} style="width:28px;height:28px;border-radius:6px;border:1px solid var(--s3);background:var(--s1);color:var(--text2);cursor:pointer;font-size:14px">▼</button>
    </div>
  `).join('');
}
function moveReorderItem(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= _reorderTmp.length) return;
  [_reorderTmp[idx], _reorderTmp[newIdx]] = [_reorderTmp[newIdx], _reorderTmp[idx]];
  renderReorderList();
}
function saveReorder() {
  const data = getPortfolio(currentUser);
  const ordered = _reorderTmp.map(r => data.find(d => d.ticker === r.ticker)).filter(Boolean);
  savePortfolio(currentUser, ordered);
  renderPortfolio();
  closeReorderModal();
}

let editTab = 'buy';

function openEditModal(i) {
  const row = getPortfolio(currentUser)[i];
  editRowIndex = i;
  document.getElementById('edit-modal-title').textContent = row.name || row.ticker;
  document.getElementById('edit-modal-sub').textContent   = row.ticker;
  document.getElementById('edit-cur-qty').textContent     = row.qty;
  document.getElementById('edit-cur-pru').textContent     = fmt(row.buyPrice);
  document.getElementById('edit-cur-price').textContent   = fmt(row.currentPrice);
  var pnl = (row.currentPrice - row.buyPrice) * row.qty;
  var el  = document.getElementById('edit-cur-pnl');
  el.textContent = (pnl >= 0 ? '+' : '') + fmt(pnl);
  el.style.color = pnl >= 0 ? 'var(--positive)' : 'var(--negative)';
  document.getElementById('edit-qty').value   = '';
  document.getElementById('edit-price').value = '';
  setEditTab('buy');
  document.getElementById('edit-modal-overlay').classList.add('open');
}
function closeEditModal() {
  document.getElementById('edit-modal-overlay').classList.remove('open');
}
function closeEditModalOutside(e) {
  if (e.target === document.getElementById('edit-modal-overlay')) closeEditModal();
}
function setEditTab(tab) {
  editTab = tab;
  var row = getPortfolio(currentUser)[editRowIndex];
  document.getElementById('tab-buy').className  = 'edit-tab' + (tab === 'buy'  ? ' active-buy'  : '');
  document.getElementById('tab-sell').className = 'edit-tab' + (tab === 'sell' ? ' active-sell' : '');
  var btn = document.getElementById('btn-edit-confirm');
  var today = new Date().toISOString().slice(0,10);
  document.getElementById('edit-date').value = today;
  if (tab === 'buy') {
    document.getElementById('edit-qty-label').textContent = 'Quantite a acheter';
    document.getElementById('edit-price-group').style.display = 'block';
    document.getElementById('edit-sell-price-group').style.display = 'none';
    document.getElementById('edit-date-group').style.display = 'block';
    btn.textContent = 'Acheter';
    btn.style.background = 'var(--positive)';
    if (row) document.getElementById('edit-price').value = row.currentPrice.toFixed(2);
  } else {
    document.getElementById('edit-qty-label').textContent = 'Quantite a vendre (max ' + (row ? row.qty : '') + ')';
    document.getElementById('edit-price-group').style.display = 'none';
    document.getElementById('edit-sell-price-group').style.display = 'block';
    document.getElementById('edit-date-group').style.display = 'block';
    btn.textContent = 'Vendre';
    btn.style.background = 'var(--negative)';
    if (row) document.getElementById('edit-sell-price').value = row.currentPrice.toFixed(2);
  }
}
function confirmEdit() {
  var data = getPortfolio(currentUser);
  var row  = data[editRowIndex];
  var qty  = parseFloat(document.getElementById('edit-qty').value);
  if (!qty || qty <= 0) { alert('Quantite invalide.'); return; }
  var txDate = document.getElementById('edit-date').value;
  if (!txDate) { alert("Veuillez renseigner la date."); return; }
  if (editTab === 'buy') {
    var price = parseFloat(document.getElementById('edit-price').value);
    if (!price || price <= 0) { alert('Prix invalide.'); return; }
    var newQty = row.qty + qty;
    row.buyPrice = Math.round(((row.qty * row.buyPrice + qty * price) / newQty) * 10000) / 10000;
    row.qty      = Math.round(newQty * 10000) / 10000;
    logTransaction(currentUser, { type:'buy', ticker: row.ticker, name: row.name, qty, price, date: txDate });
  } else {
    if (qty > row.qty) { alert('Quantite superieure a la position.'); return; }
    var sellPrice = parseFloat(document.getElementById('edit-sell-price').value);
    if (!sellPrice || sellPrice <= 0) { alert('Prix de vente invalide.'); return; }
    ensureBuyTxExists(currentUser, row);
    // Calculate realized P&L for this sell
    var realizedPnl = (sellPrice - row.buyPrice) * qty;
    logTransaction(currentUser, { type:'sell', ticker: row.ticker, name: row.name, qty, price: sellPrice, date: txDate, buyPrice: row.buyPrice, realizedPnl: Math.round(realizedPnl * 100) / 100 });
    if (qty === row.qty) {
      data.splice(editRowIndex, 1);
      savePortfolio(currentUser, data);
      closeEditModal();
      renderPortfolio();
      return;
    }
    row.qty = Math.round((row.qty - qty) * 10000) / 10000;
  }
  savePortfolio(currentUser, data);
  closeEditModal();
  renderPortfolio();
}

// ─── MODAL ────────────────────────────────────────────
let searchTimer = null;
let foundPrice = null;
let foundName = null;
let foundTicker = null;

// ─── CACHE RECHERCHES ─────────────────────────────────
const SEARCH_CACHE = new Map(); // query → {suggestions, ts}
const PRICE_CACHE  = new Map(); // ticker → {price, name, meta, ts}
const CACHE_TTL    = 5 * 60 * 1000;

function getCachedSearch(q) {
  const e = SEARCH_CACHE.get(q.toLowerCase());
  if (!e || Date.now() - e.ts > CACHE_TTL) { SEARCH_CACHE.delete(q.toLowerCase()); return null; }
  return e.suggestions;
}
function setCachedSearch(q, suggestions) {
  SEARCH_CACHE.set(q.toLowerCase(), { suggestions, ts: Date.now() });
}
function getCachedPrice(ticker) {
  const e = PRICE_CACHE.get(ticker);
  if (!e || Date.now() - e.ts > CACHE_TTL) { PRICE_CACHE.delete(ticker); return null; }
  return e;
}
function setCachedPrice(ticker, data) {
  PRICE_CACHE.set(ticker, { ...data, ts: Date.now() });
}

// ─── FX RATES (EUR conversion) ────────────────────────
let _fxRates = { USD: null, GBP: null }; // EUR per 1 unit

async function loadFxRates() {
  try {
    const [usdRes, gbpRes] = await Promise.allSettled([
      fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/EURUSD%3DX?interval=1d&range=1d'),
      fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/EURGBP%3DX?interval=1d&range=1d'),
    ]);
    if (usdRes.status === 'fulfilled') {
      const rate = JSON.parse(usdRes.value).chart?.result?.[0]?.meta?.regularMarketPrice;
      if (rate) _fxRates.USD = 1 / rate; // 1 USD = 1/EURUSD EUR
    }
    if (gbpRes.status === 'fulfilled') {
      const rate = JSON.parse(gbpRes.value).chart?.result?.[0]?.meta?.regularMarketPrice;
      if (rate) _fxRates.GBP = 1 / rate; // 1 GBP = 1/EURGBP EUR
    }
  } catch(e) {}
}

function toEur(price, currency) {
  if (!price) return price;
  const cu = (currency || 'EUR').toUpperCase();
  if (cu === 'EUR') return price;
  if (cu === 'USD') return _fxRates.USD ? price * _fxRates.USD : price;
  if (cu === 'GBP') return _fxRates.GBP ? price * _fxRates.GBP : price;
  if (cu === 'GBX' || cu === 'GBp') return _fxRates.GBP ? (price / 100) * _fxRates.GBP : price / 100;
  return price;
}

// ─── AUTOCOMPLETE SHARED ──────────────────────────────
let _ddActiveIdx = -1;

const PEA_ELIGIBLE_SUFFIXES = new Set([
  '.PA','.AS','.BR','.DE','.F','.HM','.BE','.MI','.MC','.VI','.HE','.ST','.CO','.OL','.LS','.SW','.IR','.AT','.PR','.BO','.WAR'
]);
const PEA_ELIGIBLE_EXCHANGES = ['paris','euronext','amsterdam','brussels','frankfurt','milan','madrid','lisbon','vienna','helsinki','stockholm','oslo','copenhagen'];

function getPeaEligibility(symbol, exchange) {
  const sym = (symbol || '').toUpperCase();
  const exch = (exchange || '').toLowerCase();
  const suffix = sym.match(/(\.[A-Z]+)$/)?.[1] || '';
  if (PEA_ELIGIBLE_SUFFIXES.has(suffix)) return 'yes';
  if (PEA_ELIGIBLE_EXCHANGES.some(e => exch.includes(e))) return 'yes';
  // Ticker sans suffixe ou suffixe US → non éligible
  if (!suffix || suffix === '.US') return 'no';
  return 'unknown';
}

async function fetchSuggestions(query) {
  const cached = getCachedSearch(query);
  if (cached) return cached;
  const localETF = searchETFLocal(query);
  if (localETF) {
    const suggs = [{ symbol: localETF.ticker, name: localETF.name, exchange: 'ETF', type: 'ETF' }];
    setCachedSearch(query, suggs);
    return suggs;
  }
  if (/^[A-Z0-9]{1,6}\.[A-Z]{1,3}$/i.test(query.trim())) {
    const suggs = [{ symbol: query.trim().toUpperCase(), name: query.trim().toUpperCase(), exchange: '' }];
    setCachedSearch(query, suggs);
    return suggs;
  }
  try {
    const url = 'https://query1.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(query) + '&lang=fr&region=FR&quotesCount=6&newsCount=0';
    const raw = await fetchWithFallback(url);
    const sd = JSON.parse(raw);
    const quotes = (sd.quotes || []).filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND').slice(0, 5);
    const suggs = quotes.map(q => ({ symbol: q.symbol, name: q.longname || q.shortname || q.symbol, exchange: q.exchDisp || q.exchange || '', type: q.quoteType || '' }));
    setCachedSearch(query, suggs);
    return suggs;
  } catch { return []; }
}

let _ddCallback = null; // callback courant du dropdown actif

function renderDropdown(ddId, suggestions, onSelect) {
  const dd = document.getElementById(ddId);
  if (!suggestions.length) { dd.classList.remove('open'); dd.innerHTML = ''; return; }
  _ddActiveIdx = -1;
  _ddCallback = onSelect;
  dd.innerHTML = suggestions.map((s, i) => {
    const logoStr = LOGO_CACHE[s.symbol]
      ? '<img src="' + LOGO_CACHE[s.symbol] + '" style="width:22px;height:22px;border-radius:5px;object-fit:contain;background:var(--s3)" onerror="this.style.display=\'none\'">'
      : '<div style="width:22px;height:22px;border-radius:5px;background:var(--s3);display:grid;place-items:center;font-size:8px;font-weight:700;color:var(--accent);font-family:var(--mono)">' + s.symbol.replace(/\.[A-Z]+$/, '').slice(0,3) + '</div>';
    // Prix depuis cache si disponible
    const cached = getCachedPrice(s.symbol);
    const priceStr = cached ? toEur(cached.price, cached.currency).toFixed(2) + ' €' : '';
    const pea = getPeaEligibility(s.symbol, s.exchange);
    const peaBadge = pea === 'yes'
      ? '<span class="pea-badge pea-yes">PEA ✓</span>'
      : pea === 'no'
        ? '<span class="pea-badge pea-no">PEA ✗</span>'
        : '';
    return '<div class="search-dropdown-item" data-symbol="' + s.symbol + '" data-name="' + (s.name || s.symbol).replace(/"/g, '&quot;') + '" data-idx="' + i + '">' +
      logoStr +
      '<div style="flex:1;min-width:0"><div class="sd-name">' + (s.name || s.symbol) + '</div>' +
      '<div class="sd-ticker">' + s.symbol + (s.exchange ? '  ·  ' + s.exchange : '') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
      '<div class="sd-price" id="sdp-' + ddId + '-' + i + '">' + priceStr + '</div>' +
      peaBadge +
      '</div>' +
      '</div>';
  }).join('');
  // Délégation d'événement — pas d'inline onclick
  dd.querySelectorAll('.search-dropdown-item').forEach(el => {
    el.addEventListener('click', () => {
      if (_ddCallback) _ddCallback(el.dataset.symbol, el.dataset.name);
    });
  });
  dd.classList.add('open');
  // Fetch prix en arrière-plan pour les items sans prix
  prefetchSuggestionPrices(ddId, suggestions);
}

async function prefetchSuggestionPrices(ddId, suggestions) {
  await Promise.allSettled(suggestions.map(async (s, i) => {
    const el = document.getElementById('sdp-' + ddId + '-' + i);
    if (!el || el.textContent) return; // déjà rempli depuis cache
    try {
      const raw = await fetchWithFallback(
        'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(s.symbol) + '?interval=1d&range=1d'
      );
      const meta = JSON.parse(raw).chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) return;
      const priceEur = toEur(meta.regularMarketPrice, meta.currency);
      setCachedPrice(s.symbol, {
        price: meta.regularMarketPrice,
        name: s.name || s.symbol,
        currency: meta.currency || 'EUR',
        exchange: meta.exchangeName || '',
        changePct: meta.chartPreviousClose ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100) : 0,
      });
      const el2 = document.getElementById('sdp-' + ddId + '-' + i);
      if (el2) el2.textContent = priceEur.toFixed(2) + ' €';
    } catch(e) {}
  }));
}

function closeDropdown(ddId) {
  const dd = document.getElementById(ddId);
  if (dd) { dd.classList.remove('open'); dd.innerHTML = ''; }
  _ddActiveIdx = -1;
}

function navigateDropdown(ddId, direction) {
  const dd = document.getElementById(ddId);
  const items = dd.querySelectorAll('.search-dropdown-item');
  if (!items.length) return;
  items[_ddActiveIdx]?.classList.remove('active');
  _ddActiveIdx = Math.max(0, Math.min(items.length - 1, _ddActiveIdx + direction));
  items[_ddActiveIdx]?.classList.add('active');
  items[_ddActiveIdx]?.scrollIntoView({ block: 'nearest' });
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-ticker').value = '';
  document.getElementById('modal-qty').value = '';
  document.getElementById('modal-buy-price').value = '';
  document.getElementById('search-result').classList.remove('visible');
  document.getElementById('res-logo').innerHTML = '';
  document.getElementById('search-status').innerHTML = '';
  document.getElementById('btn-confirm').disabled = true;
  closeDropdown('search-dropdown');
  document.getElementById('modal-buy-date').value = new Date().toISOString().slice(0,10);
  foundPrice = null; foundName = ''; foundTicker = '';
  foundQuoteType = 'EQUITY'; foundPE = null; foundBeta = null;
  foundDivYield = null; foundHasDividend = false;
  foundPrice = null; foundName = null; foundTicker = null;
  setTimeout(() => document.getElementById('modal-ticker').focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function onTickerInput() {
  clearTimeout(searchTimer);
  const val = document.getElementById('modal-ticker').value.trim();
  document.getElementById('search-result').classList.remove('visible');
  document.getElementById('btn-confirm').disabled = true;
  foundPrice = null;

  if (val.length < 2) {
    document.getElementById('search-status').innerHTML = '';
    closeDropdown('search-dropdown');
    return;
  }

  searchTimer = setTimeout(async () => {
    const suggs = await fetchSuggestions(val);
    if (!suggs.length) {
      document.getElementById('search-status').innerHTML = '<div class="status-error">⚠ Introuvable.</div>';
      return;
    }
    renderDropdown('search-dropdown', suggs, selectPortfolioSuggestion);
    // Prefetch logo en arrière-plan
    suggs.forEach(s => { if (!LOGO_CACHE[s.symbol]) fetchLogo(s.symbol, s.name); });
  }, 350);
}

function onTickerKeydown(e) {
  const dd = document.getElementById('search-dropdown');
  if (!dd.classList.contains('open')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); navigateDropdown('search-dropdown', 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); navigateDropdown('search-dropdown', -1); }
  else if (e.key === 'Enter' && _ddActiveIdx >= 0) {
    e.preventDefault();
    dd.querySelectorAll('.search-dropdown-item')[_ddActiveIdx]?.click();
  } else if (e.key === 'Escape') closeDropdown('search-dropdown');
}

async function selectPortfolioSuggestion(symbol, name) {
  closeDropdown('search-dropdown');
  document.getElementById('modal-ticker').value = name || symbol;
  document.getElementById('search-status').innerHTML = '<div class="status-loading"><span class="loading-spinner"></span> Récupération du cours…</div>';
  await fetchPrice(symbol);
}


// ─── YAHOO FINANCE ───────────────────────────────────
function proxyUrl(url) {
  return 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
}

const ETF_DB = [
  { ticker:'PANX.PA', isin:'FR0013412285', name:'Amundi PEA Nasdaq 100', aliases:['amundi nasdaq','pea nasdaq','nasdaq 100 pea','panx'] },
  { ticker:'PCEU.PA', isin:'FR0013412269', name:'Amundi PEA Euro Stoxx 50', aliases:['amundi euro stoxx','pea euro stoxx','pceu'] },
  { ticker:'RS2K.PA', isin:'FR0011714066', name:'Amundi PEA Russell 2000', aliases:['amundi russell','pea russell','rs2k','russell 2000'] },
  { ticker:'PAEEM.PA',isin:'FR0013412020', name:'Amundi PEA MSCI Emerging Markets', aliases:['amundi emerging','pea emerging','pea émergents','paeem'] },
  { ticker:'MWRD.PA', isin:'LU1681045370', name:'Amundi MSCI World UCITS', aliases:['amundi world','mwrd','msci world amundi'] },
  { ticker:'CW8.PA',  isin:'LU1681043599', name:'Amundi MSCI World UCITS Acc', aliases:['cw8','amundi cw8','world amundi acc'] },
  { ticker:'ESE.PA',  isin:'FR0013311273', name:'BNP Paribas Easy S&P 500 UCITS', aliases:['bnp sp500','bnp s&p','ese','bnp paribas easy'] },
  { ticker:'WPEA.PA', isin:'IE0002XZSHO1', name:'Invesco MSCI World UCITS PEA', aliases:['invesco world pea','wpea'] },
  { ticker:'EWLD.PA', isin:'IE00B4L5Y983', name:'iShares Core MSCI World UCITS PEA', aliases:['ishares world pea','ewld'] },
  { ticker:'IWDA.AS', isin:'IE00B4L5Y983', name:'iShares Core MSCI World UCITS', aliases:['ishares world','iwda','msci world ishares'] },
  { ticker:'CSPX.AS', isin:'IE00B5BMR087', name:'iShares Core S&P 500 UCITS', aliases:['ishares sp500','cspx','s&p 500 ishares'] },
  { ticker:'EMIM.AS', isin:'IE00BKM4GZ66', name:'iShares Core MSCI EM IMI UCITS', aliases:['ishares emerging','emim'] },
  { ticker:'EIMI.AS', isin:'IE00BD45KH83', name:'iShares Core MSCI EM IMI UCITS USD', aliases:['ishares em','eimi'] },
  { ticker:'VWRL.AS', isin:'IE00B3RBWM25', name:'Vanguard FTSE All-World UCITS', aliases:['vanguard all world','vwrl','ftse all world'] },
  { ticker:'VWCE.AS', isin:'IE00BK5BQT80', name:'Vanguard FTSE All-World Acc UCITS', aliases:['vanguard world acc','vwce'] },
  { ticker:'VAGF.AS', isin:'IE00BG47KB92', name:'Vanguard Global Aggregate Bond UCITS', aliases:['vanguard bond','vagf'] },
  { ticker:'IUSQ.AS', isin:'IE00B4L5YX21', name:'iShares MSCI ACWI UCITS', aliases:['ishares acwi','iusq','acwi'] },
  { ticker:'SPPW.AS', isin:'IE00B7KQ7B66', name:'SPDR S&P 500 UCITS', aliases:['spdr sp500','sppw'] },
  { ticker:'SPY',     isin:'US78462F1030', name:'SPDR S&P 500 ETF Trust', aliases:['spy','s&p 500','spdr'] },
  { ticker:'QQQ',     isin:'US46090E1038', name:'Invesco QQQ Nasdaq 100', aliases:['qqq','nasdaq 100','invesco qqq'] },
  { ticker:'VTI',     isin:'US9229087690', name:'Vanguard Total Stock Market ETF', aliases:['vti','vanguard total'] },
  { ticker:'VT',      isin:'US9220427424', name:'Vanguard Total World Stock ETF', aliases:['vt','vanguard world'] },
  { ticker:'VOO',     isin:'US9229083632', name:'Vanguard S&P 500 ETF', aliases:['voo','vanguard sp500'] },
  { ticker:'ARKK',    isin:'US00214Q1040', name:'ARK Innovation ETF', aliases:['ark','arkk','ark innovation'] },
  { ticker:'GLD',     isin:'US78463V1070', name:'SPDR Gold Shares', aliases:['gld','gold','or'] },
  { ticker:'TLT',     isin:'US4642874329', name:'iShares 20+ Year Treasury Bond ETF', aliases:['tlt','treasury','obligations'] },
  { ticker:'SOXX',    isin:'US4642887412', name:'iShares Semiconductor ETF', aliases:['soxx','semiconducteurs','semi'] },
  { ticker:'SGLD.AS', isin:'IE00B579F325', name:'Invesco Physical Gold ETC', aliases:['invesco gold','sgld','or physique'] },
  { ticker:'XDWD.AS', isin:'IE00BJ0KDQ92', name:'Xtrackers MSCI World Swap UCITS', aliases:['xtrackers world','xdwd'] },
  { ticker:'BNKE.PA', isin:'LU1829219556', name:'Lyxor Euro Stoxx Banks UCITS', aliases:['lyxor banks','bnke','banques'] },
];

function searchETFLocal(query) {
  const q = query.toLowerCase().trim();
  const byIsin = ETF_DB.find(e => e.isin.toLowerCase() === q);
  if (byIsin) return byIsin;
  const byTicker = ETF_DB.find(e => e.ticker.toLowerCase() === q || e.ticker.toLowerCase().replace(/\.[a-z]+$/, '') === q);
  if (byTicker) return byTicker;
  const byName = ETF_DB.find(e =>
    e.name.toLowerCase().includes(q) ||
    e.aliases.some(a => a.includes(q))
  );
  return byName || null;
}

async function fetchWithFallback(url) {
  function tryAllorigins(u) {
    return fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(u), {signal: AbortSignal.timeout(4000)})
      .then(r => r.json()).then(j => { if (!j.contents || j.contents === 'null') throw new Error('empty'); return j.contents; });
  }
  function tryCorsproxy(u) {
    return fetch('https://corsproxy.io/?' + encodeURIComponent(u), {signal: AbortSignal.timeout(4000)})
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.text(); });
  }
  function tryCorsEu(u) {
    return fetch('https://cors.eu.org/' + u, {signal: AbortSignal.timeout(5000)})
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.text(); });
  }
  function tryCodetabs(u) {
    return fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u), {signal: AbortSignal.timeout(5000)})
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.text(); });
  }
  // Proxy primaire : Worker Cloudflare (fetch Yahoo direct serveur, pas de CORS).
  // Fiable + rapide partout, y compris iOS où le cache localStorage est évincé.
  function tryWorker(u) {
    return fetch(WORKER_URL + '/yahoo?url=' + encodeURIComponent(u), {signal: AbortSignal.timeout(8000)})
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.text(); });
  }

  function isValidRaw(raw) {
    try {
      const p = JSON.parse(raw);
      if (p.chart && p.chart.error && p.chart.error.code) return false;
      if (p.finance && p.finance.error) return false;
      return true;
    } catch { return false; }
  }

  // Round 0 : Worker Cloudflare en primaire (rapide + fiable, pas de CORS).
  try {
    const raw = await tryWorker(url);
    if (isValidRaw(raw)) return raw;
  } catch {}

  // Round 1 : course des 2 proxies CORS gratuits en parallèle (le 1er valide gagne).
  // Filet de sécurité si le Worker est down. corsproxy.io / cors.eu.org → Round 2.
  const race = [
    tryCodetabs(url).then(r => { if (!isValidRaw(r)) throw new Error('invalide'); return r; }),
    tryAllorigins(url.replace('query1.', 'query2.')).then(r => { if (!isValidRaw(r)) throw new Error('invalide'); return r; }),
  ];
  try {
    return await Promise.any(race);
  } catch {}

  // Round 2 : longshots (souvent morts, mais on tente avant d'abandonner).
  const fallbacks = [
    () => tryCorsproxy(url),
    () => tryCorsEu(url),
  ];
  for (const fn of fallbacks) {
    try {
      const raw = await fn();
      if (isValidRaw(raw)) return raw;
    } catch {}
  }
  throw new Error('Service temporairement indisponible. Réessayez dans quelques secondes.');
}

const ISIN_MAP = {
  'IE0002XZSHO1': 'WPEA.PA',
  'FR0011871110': 'PUST.PA',
  'FR0013412285': 'MWRD.PA',
  'FR0011550185': 'PE500.PA',
  'FR0013412020': 'PAEEM.PA',
  'LU1681043599': 'CW8.PA',
  'IE00B4L5Y983': 'IWDA.AS',
  'IE00B52SFT06': 'CSPX.L',
  'IE00B3RBWM25': 'IWDA.AS',
  'FR0011871128': 'PVAL.PA',
  'LU0496786574': 'LYYA.PA',
  'FR0000131104': 'BNP.PA',
  'FR0000120271': 'AI.PA',
  'FR0000120073': 'AI.PA',
  'FR0000120628': 'ACA.PA',
  'FR0000120172': 'OR.PA',
  'FR0000121014': 'MC.PA',
  'FR0000054900': 'EN.PA',
  'FR0000120321': 'SAN.PA',
  'FR0000131708': 'SGO.PA',
  'FR0000124711': 'SU.PA',
  'FR0000125486': 'VIE.PA',
  'FR0000120693': 'TTE.PA',
  'FR0000133308': 'DG.PA',
  'FR0010242511': 'DSY.PA',
  'FR0000052292': 'RMS.PA',
  'FR0000121261': 'BN.PA',
  'FR0000130809': 'CS.PA',
  'FR0000120503': 'RNO.PA',
  'FR0000130650': 'ORA.PA',
  'FR0000121667': 'VIV.PA',
  'FR0000121485': 'ML.PA',
  'FR0010208488': 'ENGI.PA',
  'FR0000120578': 'ATO.PA',
  'FR0000131906': 'FP.PA',
  'FR0000045072': 'ACA.PA',
  'FR0010307819': 'GLE.PA',
  'FR0000035081': 'AXA.PA',
  'FR0000073272': 'EDF.PA',
  'FR0000125338': 'FTE.PA',
  'FR0000131755': 'GBT.PA',
  'FR0000060303': 'HO.PA',
};

const LOGO_CACHE = {};
const ETF_TICKERS_GLOBAL = new Set(['WPEA.PA','ESEE.PA','ESE.PA','PUST.PA','PANX.PA','PAEEM.PA','ETZ.PA','EWLD.PA','CW8.PA','MWRD.PA','RS2K.PA','PCEU.PA','PE500.PA','IUSQ.AS','IWDA.AS','VWCE.AS','VWRL.AS','CSPX.AS','EMIM.AS','XDWD.AS','SPPW.AS','SPY','QQQ','VTI','VT','VOO','ARKK','GLD','TLT','SOXX','SGLD.AS','BNKE.PA']);
function isETF(ticker) { return ETF_TICKERS_GLOBAL.has(ticker) || /\.[A-Z]{2}$/.test(ticker) && /^(CW|MWRD|RS|PC|PA|PU|ET|EW|WP|ES|IU|IW|VC|VW|CS|EM|XD|SP|BN)/.test(ticker); }
const TICKER_TO_ISIN = Object.fromEntries(Object.entries(ISIN_MAP).map(([k,v]) => [v, k]));

// Resolve an ISIN or ticker to a Yahoo Finance ticker for API calls
const TICKER_ALIASES = { 'CV9.PA': 'VAL.PA', 'TTE': 'TTE.PA' };
function resolveToYahooTicker(ticker) {
  if (!ticker) return ticker;
  if (TICKER_ALIASES[ticker]) return TICKER_ALIASES[ticker];
  if (ISIN_MAP[ticker]) return ISIN_MAP[ticker];
  return ticker;
}

// ── LOGO FETCHING ──────────────────────────────────────
// Persist logo cache to localStorage so logos survive reloads
const LOGO_CACHE_VERSION = 'v7'; // bump to purge stale hardcoded entries
function loadLogoCache() {
  try {
    if (localStorage.getItem('pea_logos_ver') !== LOGO_CACHE_VERSION) {
      localStorage.removeItem('pea_logos');
      localStorage.setItem('pea_logos_ver', LOGO_CACHE_VERSION);
      return;
    }
    const saved = JSON.parse(localStorage.getItem('pea_logos') || '{}');
    for (const [k, v] of Object.entries(saved)) {
      if (v && !v.includes('clearbit')) LOGO_CACHE[k] = v;
    }
  } catch(e) {}
}
function saveLogoCache() {
  try { localStorage.setItem('pea_logos', JSON.stringify(LOGO_CACHE)); } catch(e) {}
}
loadLogoCache();

// Domaines de secours pour tickers dont le nom ne suffit pas à deviner le domaine
const FALLBACK_DOMAINS = {
  'MC.PA':'lvmh.com','OR.PA':'loreal.com','AI.PA':'airliquide.com','AIR.PA':'airbus.com',
  'BNP.PA':'bnpparibas.com','SAN.PA':'sanofi.com','TTE.PA':'totalenergies.com','TTE':'totalenergies.com',
  'SU.PA':'se.com','DG.PA':'vinci.com','RMS.PA':'hermes.com','BN.PA':'danone.com',
  'ACA.PA':'credit-agricole.com','CS.PA':'axa.com','RNO.PA':'renault.com',
  'ORA.PA':'orange.com','SGO.PA':'saint-gobain.com','ENGI.PA':'engie.com',
  'GLE.PA':'societegenerale.com','VIE.PA':'veolia.com','DSY.PA':'3ds.com',
  'EN.PA':'bouygues.com','HO.PA':'thalesgroup.com','ML.PA':'michelin.com',
  'AAPL':'apple.com','MSFT':'microsoft.com','GOOGL':'google.com','GOOG':'google.com',
  'AMZN':'amazon.com','META':'meta.com','TSLA':'tesla.com','NVDA':'nvidia.com',
  'NFLX':'netflix.com','DIS':'disney.com','PYPL':'paypal.com','ADBE':'adobe.com',
};

// Dérive un domaine depuis le nom officiel de la société (zéro requête réseau)
function companyNameToDomain(name) {
  if (!name) return null;
  const clean = name
    .replace(/\b(S\.A\.|S\.A|SE|Inc\.|Inc|Corp\.|Corp|Ltd\.|Ltd|PLC|N\.V\.|NV|AG|GmbH|SAS|SA|LLC|Co\.|Co|Group|Holdings?|Holding|Société Anonyme|Moët Hennessy)\b/gi, '')
    .replace(/[''·\-,]/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  return clean.length > 2 ? clean + '.com' : null;
}

// Mapping ticker ETF → domaine émetteur (logo via favicon)
const ETF_ISSUER_DOMAINS = {
  // iShares (BlackRock)
  'WPEA.PA':'ishares.com','IUSQ.AS':'ishares.com','IWDA.AS':'ishares.com',
  'CSPX.AS':'ishares.com','EMIM.AS':'ishares.com','TLT':'ishares.com','SOXX':'ishares.com',
  // Amundi
  'PUST.PA':'amundietf.com','PANX.PA':'amundietf.com','PAEEM.PA':'amundietf.com',
  'PCEU.PA':'amundietf.com','PE500.PA':'amundietf.com',
  'EWLD.PA':'amundietf.com','CW8.PA':'amundietf.com','MWRD.PA':'amundietf.com',
  'RS2K.PA':'amundietf.com',
  // BNP Paribas Easy
  'ESEE.PA':'bnpparibas.com','ESE.PA':'bnpparibas.com','BNKE.PA':'bnpparibas.com',
  'ETZ.PA':'bnpparibas.com',
  // Vanguard
  'VOO':'vanguard.com','VTI':'vanguard.com','VT':'vanguard.com',
  'VWCE.AS':'vanguard.com','VWRL.AS':'vanguard.com',
  // SPDR / State Street
  'SPY':'ssga.com','GLD':'ssga.com','SPPW.AS':'ssga.com',
  // Xtrackers (DWS)
  'XDWD.AS':'xtrackers.com',
  // Invesco
  'QQQ':'invesco.com','SGLD.AS':'invesco.com',
  // ARK
  'ARKK':'ark-funds.com',
};

function guessETFIssuerDomain(ticker) {
  const t = ticker.toUpperCase();
  if (/^(IW|IU|CS|EM|IS)/.test(t) || t === 'TLT' || t === 'SOXX') return 'ishares.com';
  if (/^(CW|MWRD|RS|PC|PA|PU|PE|EW)/.test(t)) return 'amundietf.com';
  if (/^(VW|VO|VT)/.test(t)) return 'vanguard.com';
  if (/^(SP|XS|SPPW)/.test(t)) return 'ssga.com';
  if (/^XD/.test(t)) return 'xtrackers.com';
  if (/^(BN|ES)/.test(t)) return 'bnpparibas.com';
  return 'etf.com';
}

// Fetch logo : nom société → domaine, fallback map, fallback ticker (aucun appel réseau extra)
function fetchLogo(ticker, companyName) {
  if (LOGO_CACHE[ticker]) return Promise.resolve(LOGO_CACHE[ticker]);

  if (isETF(ticker)) {
    const issuerDomain = ETF_ISSUER_DOMAINS[ticker] || guessETFIssuerDomain(ticker);
    const url = 'https://www.google.com/s2/favicons?domain=' + issuerDomain + '&sz=128';
    LOGO_CACHE[ticker] = url;
    saveLogoCache();
    return Promise.resolve(url);
  }

  // 1. Domaine de secours explicite (tickers dont le nom ne donne pas le bon domaine)
  const fallbackDomain = FALLBACK_DOMAINS[ticker];
  if (fallbackDomain) {
    const url = 'https://www.google.com/s2/favicons?domain=' + fallbackDomain + '&sz=128';
    LOGO_CACHE[ticker] = url;
    saveLogoCache();
    return Promise.resolve(url);
  }

  // 2. Domaine dérivé du nom officiel de la société
  const nameDomain = companyNameToDomain(companyName);
  if (nameDomain) {
    const url = 'https://www.google.com/s2/favicons?domain=' + nameDomain + '&sz=128';
    LOGO_CACHE[ticker] = url;
    saveLogoCache();
    return Promise.resolve(url);
  }

  // 3. Dernier recours : devine depuis le ticker (non caché → retente au prochain chargement)
  const clean = ticker.replace(/\.[A-Z]+$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return Promise.resolve('https://www.google.com/s2/favicons?domain=' + clean + '.com&sz=128');
}

// Fetch logos for all portfolio + watchlist tickers in background
let _logoFetchRunning = false;
async function fetchAllLogos() {
  if (!currentUser || _logoFetchRunning) return;
  _logoFetchRunning = true;
  const portfolioItems  = getPortfolio(currentUser);
  const watchlistItems  = getWatchlist(currentUser);
  const portfolioTickers = portfolioItems.map(r => r.ticker);
  const watchlistTickers = watchlistItems.map(w => w.ticker);
  const nameMap = {};
  [...portfolioItems, ...watchlistItems].forEach(item => {
    if (item.ticker && item.name) nameMap[item.ticker] = item.name;
  });
  const tickers = [...new Set([...portfolioTickers, ...watchlistTickers].filter(Boolean))];
  let anyPortfolio = false;
  let anyWatchlist = false;
  for (const ticker of tickers) {
    if (!LOGO_CACHE[ticker]) {
      await fetchLogo(ticker, nameMap[ticker]);
      if (portfolioTickers.includes(ticker)) anyPortfolio = true;
      if (watchlistTickers.includes(ticker)) anyWatchlist = true;
    }
  }
  _logoFetchRunning = false;
  if (anyPortfolio) renderPortfolio();
  if (anyWatchlist) renderWatchlist();
}

let foundISIN = null;

function logoHtml(ticker, size, cssClass) {
  const abbr = ticker.replace(/\.[A-Z]+$/, '').slice(0, 3).toUpperCase();
  const r    = Math.round(size * 0.25);
  const st   = 'width:' + size + 'px;height:' + size + 'px;border-radius:' + r + 'px;object-fit:contain';
  const url  = LOGO_CACHE[ticker] || null;

  if (!url) return '<div class="' + cssClass + '">' + abbr + '</div>';

  const onErr = 'var p=this.parentNode;p.textContent=\x22' + abbr + '\x22;p.classList.remove(\x22logo-wrap\x22)';
  return '<div class="' + cssClass + ' logo-wrap">' +
    '<img src="' + url + '" style="' + st + '" onerror="' + onErr + '">' +
    '</div>';
}

// Version agrandie pour les modaux d'ajout (44px, sans padding parasite)
function logoHtmlModal(ticker) {
  const abbr = ticker.replace(/\.[A-Z]+$/, '').slice(0, 3).toUpperCase();
  const url  = LOGO_CACHE[ticker] || null;
  const base = 'width:44px;height:44px;border-radius:12px;flex-shrink:0;display:grid;place-items:center;';
  if (!url) {
    return '<div style="' + base + 'background:var(--s3);border:1px solid var(--border2);font-size:10px;font-weight:700;color:var(--accent);font-family:var(--mono)">' + abbr + '</div>';
  }
  const onErr = 'this.parentNode.innerHTML=\x22' + abbr + '\x22;this.parentNode.style.fontSize=\x2210px\x22';
  return '<div style="' + base + 'background:var(--s3);border:1px solid var(--border2);overflow:hidden">' +
    '<img src="' + url + '" style="width:32px;height:32px;object-fit:contain" onerror="' + onErr + '">' +
    '</div>';
}

async function isinToTicker(isin) {
  if (ISIN_MAP[isin]) return ISIN_MAP[isin];
  try {
    const r = await fetch('https://api.openfigi.com/v3/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ idType: 'ID_ISIN', idValue: isin }]),
      signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) return null;
    const data = await r.json();
    const hits = data[0] && data[0].data;
    if (!hits || !hits.length) return null;
    const pref = hits.find(h => h.exchCode && ['EPA','XETRA','AMS','LSE','NYQ','NAS','PCX'].includes(h.exchCode));
    const hit  = pref || hits[0];
    const exchMap = { EPA: '.PA', XETRA: '.DE', AMS: '.AS', LSE: '.L', NYQ: '', NAS: '', PCX: '' };
    const suffix = exchMap[hit.exchCode] !== undefined ? exchMap[hit.exchCode] : '';
    return hit.ticker + suffix;
  } catch(e) { return null; }
}

async function smartSearch(query) {
  const q = query.trim();
  if (/^[A-Z]{2}[A-Z0-9]{10}$/i.test(q)) {
    const isinUpper = q.toUpperCase();
    const ticker = await isinToTicker(isinUpper);
    if (ticker) {
      foundISIN = isinUpper;
      return [{ symbol: ticker, longname: ticker, quoteType: ISIN_MAP[isinUpper] ? 'EQUITY' : 'EQUITY' }];
    }
    throw new Error('ISIN introuvable.');
  }
  foundISIN = null;
  const searchUrl = 'https://query1.finance.yahoo.com/v1/finance/search?q='
    + encodeURIComponent(q) + '&lang=fr&region=FR&quotesCount=8&newsCount=0';
  const raw = await fetchWithFallback(searchUrl);
  const sd  = JSON.parse(raw);
  const quotes = (sd.quotes || []).filter(q =>
    q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND'
  );
  if (quotes.length) return quotes;
  throw new Error('Aucun résultat. Essayez le ticker (ex: PANX.PA) ou l\'ISIN.');
}

async function fetchPrice(query) {
  const statusEl = document.getElementById('search-status');
  const resultEl = document.getElementById('search-result');
  resultEl.classList.remove('visible');
  document.getElementById('btn-confirm').disabled = true;
  foundPrice = null;

  try {
    statusEl.innerHTML = '<div class="status-loading"><span class="loading-spinner"></span> Récupération du cours…</div>';

    // Résolution du symbole Yahoo Finance
    let best;
    const localETF = searchETFLocal(query);
    if (localETF) {
      best = { symbol: localETF.ticker, longname: localETF.name, quoteType: 'ETF' };
    } else if (/^[A-Z0-9]{1,6}\.[A-Z]{1,3}$/i.test(query.trim()) || /^[A-Z]{2,6}$/.test(query.trim())) {
      // Ticker direct (avec ou sans suffixe exchange)
      best = { symbol: query.trim().toUpperCase(), longname: null, quoteType: 'EQUITY' };
    } else {
      // Recherche par nom — vérifie le cache d'abord
      const cached = getCachedSearch(query);
      const suggs = cached || await fetchSuggestions(query);
      if (!suggs.length) throw new Error('Introuvable. Essayez le ticker (ex: MC.PA, IWDA.AS, AAPL).');
      best = { symbol: suggs[0].symbol, longname: suggs[0].name, quoteType: 'EQUITY' };
    }

    // Cache prix
    const cachedPrice = getCachedPrice(best.symbol);
    if (cachedPrice) {
      foundPrice = cachedPrice.price; foundName = cachedPrice.name; foundTicker = best.symbol;
      document.getElementById('res-name').textContent  = foundName;
      document.getElementById('res-price').textContent = toEur(foundPrice, cachedPrice.currency).toFixed(2) + ' €';
      document.getElementById('res-info').textContent  = best.symbol + '  ·  ' + cachedPrice.exchange + '  ·  ' + (cachedPrice.changePct >= 0 ? '▲' : '▼') + ' ' + Math.abs(cachedPrice.changePct).toFixed(2) + "% aujourd'hui";
      const resLogoEl = document.getElementById('res-logo');
      resLogoEl.innerHTML = logoHtmlModal(foundTicker);
      if (!LOGO_CACHE[foundTicker]) fetchLogo(foundTicker, foundName).then(() => { resLogoEl.innerHTML = logoHtmlModal(foundTicker); });
      statusEl.innerHTML = ''; resultEl.classList.add('visible');
      document.getElementById('btn-confirm').disabled = false;
      if (!document.getElementById('modal-buy-price').value) document.getElementById('modal-buy-price').value = foundPrice.toFixed(2);
      return;
    }

    const chartUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(best.symbol) + '?interval=1d&range=5d';
    const qraw = await fetchWithFallback(chartUrl);
    const qd = JSON.parse(qraw);

    const result = qd.chart && qd.chart.result && qd.chart.result[0];
    if (!result) throw new Error('Cours non disponible pour ce symbole.');
    const meta = result.meta;

    foundPrice  = meta.regularMarketPrice;
    foundName   = best.longname || best.shortname || best.symbol;
    foundTicker = best.symbol;

    const prev = meta.chartPreviousClose || meta.previousClose || foundPrice;
    const changePct = prev ? ((foundPrice - prev) / prev) * 100 : 0;
    const isPos = changePct >= 0;

    setCachedPrice(best.symbol, { price: foundPrice, name: foundName, currency: meta.currency || '', exchange: meta.exchangeName || '', changePct });

    document.getElementById('res-name').textContent  = foundName;
    document.getElementById('res-price').textContent =
      toEur(foundPrice, meta.currency).toFixed(2) + ' €';
    document.getElementById('res-info').textContent  =
      best.symbol + '  ·  ' + (meta.exchangeName || '') +
      '  ·  ' + (isPos ? '▲' : '▼') + ' ' + Math.abs(changePct).toFixed(2) + "% aujourd'hui";

    // Logo — affiche immédiatement (cache ou abbr), met à jour après fetch
    const resLogoEl = document.getElementById('res-logo');
    resLogoEl.innerHTML = logoHtmlModal(foundTicker);
    if (!LOGO_CACHE[foundTicker]) {
      fetchLogo(foundTicker, foundName).then(() => {
        resLogoEl.innerHTML = logoHtmlModal(foundTicker);
      });
    }

    statusEl.innerHTML = '';
    resultEl.classList.add('visible');
    document.getElementById('btn-confirm').disabled = false;

    if (!document.getElementById('modal-buy-price').value) {
      document.getElementById('modal-buy-price').value = foundPrice.toFixed(2);
    }

  } catch (err) {
    statusEl.innerHTML = '<div class="status-error">⚠ ' + (err.message || 'Erreur inconnue.') + '</div>';
    console.error(err);
  }
}

function confirmAdd() {
  const qty     = parseFloat(document.getElementById('modal-qty').value);
  const buyPrice= parseFloat(document.getElementById('modal-buy-price').value);
  const buyDate = document.getElementById('modal-buy-date').value;
  if (!foundPrice || !qty || qty <= 0 || !buyPrice || buyPrice <= 0) {
    alert('Veuillez remplir tous les champs correctement.');
    return;
  }
  if (!buyDate) {
    alert("Veuillez renseigner la date d'achat.");
    return;
  }

  const data = getPortfolio(currentUser);
  data.push({
    name:         foundName || document.getElementById('modal-ticker').value,
    ticker:       foundTicker || '',
    isin:         foundISIN || TICKER_TO_ISIN[foundTicker] || null,
    qty:          qty,
    buyPrice:     buyPrice,
    buyDate:      buyDate,
    currentPrice: foundPrice,
    quoteType:    foundQuoteType || 'EQUITY',
    pe:           foundPE,
    beta:         foundBeta,
    dividendYield:foundDivYield,
    hasDividend:  foundHasDividend,
    addedAt:      new Date().toISOString()
  });
  // Log transaction for portfolio history
  logTransaction(currentUser, { type:'buy', ticker: foundTicker||'', name: foundName||'', qty, price: buyPrice, date: buyDate });
  savePortfolio(currentUser, data);
  closeModal();
  renderPortfolio();
  // Fetch logo for the new ticker in background
  if (foundTicker) fetchLogo(foundTicker, foundName).then(() => renderPortfolio());
}

// ─── ANALYSE PAGE — FULL DASHBOARD ───────────────────
let analyseTimer = null;
let currentAnalyseData = null;

function renderAnalysePortfolio() {
  const list = document.getElementById('analyse-portfolio-list');
  if (!list) return;
  const data = getPortfolio(currentUser);
  const emptyEl = document.getElementById('ana-empty');

  if (!data.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  list.innerHTML = data.map((row, i) => {
    const pct = row.currentPrice && row.buyPrice ? ((row.currentPrice - row.buyPrice) / row.buyPrice * 100) : 0;
    const isPos = pct >= 0;
    return '<div class="ana-picker-item" onclick="selectAnalyseStock(' + i + ')" id="asi-' + i + '">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        logoHtml(row.ticker, 24, 'ticker-icon') +
        '<div><div style="font-size:12px;font-weight:600">' + (row.name || row.ticker) + '</div>' +
        '<div style="font-size:10px;color:var(--text2);font-family:var(--mono)">' + row.ticker + '</div></div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-size:11px;font-family:var(--mono)">' + (row.currentPrice ? row.currentPrice.toFixed(2) : '—') + '</div>' +
        '<div style="font-size:10px;font-family:var(--mono);color:' + (isPos ? 'var(--positive)' : 'var(--negative)') + '">' +
          (isPos ? '▲' : '▼') + ' ' + Math.abs(pct).toFixed(2) + '%</div>' +
      '</div></div>';
  }).join('');
}

function selectAnalyseStock(i) {
  document.querySelectorAll('.ana-picker-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('asi-' + i);
  if (el) el.classList.add('active');
  const data = getPortfolio(currentUser);
  const row = data[i];
  if (!row) return;
  // Fetch full data from Yahoo for this ticker
  fetchFullAnalyse(row.ticker, row);
}

function onAnalyseInput() {
  clearTimeout(analyseTimer);
  const val = document.getElementById('analyse-search-input').value.trim();
  document.getElementById('analyse-search-status').innerHTML = '';
  if (val.length < 2) return;
  document.getElementById('analyse-search-status').innerHTML =
    '<div class="status-loading"><span class="loading-spinner"></span> Recherche...</div>';
  analyseTimer = setTimeout(function() { fetchAnalyseStock(val); }, 700);
}

async function fetchAnalyseStock(query) {
  const statusEl = document.getElementById('analyse-search-status');
  try {
    const localETF2 = searchETFLocal(query);
    let best;
    if (localETF2) {
      best = { symbol: localETF2.ticker, longname: localETF2.name, quoteType: 'ETF' };
    } else {
      const sraw2 = await fetchWithFallback('https://query1.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(query) + '&lang=fr&region=FR&quotesCount=6&newsCount=0');
      const sd = JSON.parse(sraw2);
      const quotes = (sd.quotes || []).filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND');
      if (!quotes.length) throw new Error('Action introuvable.');
      best = quotes[0];
    }
    statusEl.innerHTML = '';
    document.querySelectorAll('.ana-picker-item').forEach(el => el.classList.remove('active'));
    fetchFullAnalyse(best.symbol, null);
  } catch(err) {
    statusEl.innerHTML = '<div class="status-error">⚠ ' + (err.message || 'Erreur') + '</div>';
  }
}

// Core: fetch all Yahoo data and populate dashboard
async function fetchFullAnalyse(ticker, portfolioRow) {
  const emptyEl = document.getElementById('ana-empty');
  if (emptyEl) emptyEl.style.display = 'none';

  // Loading state
  document.getElementById('ana-name').textContent = 'Chargement…';
  document.getElementById('ana-ticker').textContent = ticker;
  document.getElementById('ana-price').textContent = '…';

  try {
    // ── 1. Cours + meta (v8/chart) ────────────────────────────────────────
    const cRaw = await fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(resolveToYahooTicker(ticker)) + '?interval=1d&range=5d');
    const cd = JSON.parse(cRaw);
    const res = cd.chart && cd.chart.result && cd.chart.result[0];
    if (!res) throw new Error('Données indisponibles');
    const meta = res.meta;

    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    const changePct = prev ? ((price - prev) / prev * 100) : 0;
    const high52 = meta.fiftyTwoWeekHigh || 0;
    const low52 = meta.fiftyTwoWeekLow || 0;

    // ── 2. Fondamentaux (quoteSummary) ────────────────────────────────────
    // modules : financialData + defaultKeyStatistics + summaryDetail
    let fund = {};
    try {
      const modules = 'financialData,defaultKeyStatistics,summaryDetail';
      const qsBase = 'https://query1.finance.yahoo.com/v11/finance/quoteSummary/' +
        encodeURIComponent(resolveToYahooTicker(ticker)) + '?modules=' + modules;
      const qsUrl = qsBase;
      const qsRaw = await fetchWithFallback(qsUrl);
      const qs = JSON.parse(qsRaw);
      const r = qs && qs.quoteSummary && qs.quoteSummary.result && qs.quoteSummary.result[0];
      if (r) {
        const fd = r.financialData || {};
        const ks = r.defaultKeyStatistics || {};
        const sd = r.summaryDetail || {};
        fund = {
          // Valorisation
          pe:           meta.trailingPE || sd.trailingPE?.raw || null,
          forwardPe:    meta.forwardPE  || ks.forwardPE?.raw  || null,
          peg:          ks.pegRatio?.raw || null,
          pb:           ks.priceToBook?.raw || null,
          ps:           ks.priceToSalesTrailing12Months?.raw || null,
          evEbitda:     ks.enterpriseToEbitda?.raw || null,
          // Qualité
          roe:          fd.returnOnEquity?.raw || null,
          roa:          fd.returnOnAssets?.raw || null,
          profitMargin: fd.profitMargins?.raw  || null,
          grossMargin:  fd.grossMargins?.raw   || null,
          opMargin:     fd.operatingMargins?.raw || null,
          // Croissance
          revGrowth:    fd.revenueGrowth?.raw  || null,
          epsGrowth:    fd.earningsGrowth?.raw || null,
          eps:          ks.trailingEps?.raw    || null,
          fwdEps:       ks.forwardEps?.raw     || null,
          // Solidité
          totalDebt:    fd.totalDebt?.raw      || null,
          totalCash:    fd.totalCash?.raw      || null,
          ebitda:       fd.ebitda?.raw         || null,
          debtToEquity: fd.debtToEquity?.raw   || null,
          currentRatio: fd.currentRatio?.raw   || null,
          quickRatio:   fd.quickRatio?.raw     || null,
          fcf:          fd.freeCashflow?.raw   || null,
          // Dividende
          divYieldRaw:  sd.dividendYield?.raw  || null,
          divRate:      sd.dividendRate?.raw   || meta.trailingAnnualDividendRate || null,
          payoutRatio:  sd.payoutRatio?.raw    || null,
          sharesOutstanding: ks.sharesOutstanding?.raw || null,
          avg5yDivYield: sd.fiveYearAvgDividendYield?.raw || null,
          // Secteur
          sector:       portfolioRow?.sector   || null,
        };
      }
    } catch(e2) { console.warn('quoteSummary failed, scoring partiel:', e2.message); }

    // ── 3. Construction de l'objet d ─────────────────────────────────────
    const d = {
      name: portfolioRow ? (portfolioRow.name || ticker) : (meta.shortName || meta.longName || ticker),
      ticker, price,
      currency: meta.currency || 'EUR',
      exchange: meta.exchangeName || '',
      changePct, prev,
      high52, low52,
      pe:        fund.pe        || meta.trailingPE || null,
      forwardPe: fund.forwardPe || meta.forwardPE  || null,
      beta:      meta.beta      || null,
      divYield:  fund.divYieldRaw || (meta.trailingAnnualDividendRate > 0 ? meta.trailingAnnualDividendRate / price : null),
      divRate:   fund.divRate   || meta.trailingAnnualDividendRate || null,
      volume:    meta.regularMarketVolume || null,
      marketCap: meta.marketCap || null,
      buyPrice:  portfolioRow ? portfolioRow.buyPrice : null,
      qty:       portfolioRow ? portfolioRow.qty      : null,
      quoteType: portfolioRow ? portfolioRow.quoteType : (meta.instrumentType || 'EQUITY'),
      // Fondamentaux enrichis
      ...fund,
    };

    // ── 4. Score fondamental (algo Python porté en JS) ──────────────────
    d.fundamentalScore = computeFundamentalScore(d);

    currentAnalyseData = d;

    // Révéler le hero + tabs (était géré par setMistralContext)
    const heroEl   = document.getElementById('ana-hero');
    const tabsWrap = document.getElementById('ana-tabs-wrap');
    const emptyEl2 = document.getElementById('ana-empty');
    if (heroEl)   { heroEl.style.opacity = '1'; heroEl.style.pointerEvents = 'auto'; }
    if (tabsWrap) tabsWrap.style.display = 'block';
    if (emptyEl2) emptyEl2.style.display = 'none';

    populateHero(d);
    populateTabs(d);

  } catch(e) {
    document.getElementById('ana-name').textContent = 'Erreur';
    document.getElementById('ana-ticker').textContent = e.message;
    console.error('Analyse fetch error:', e);
  }
}

// ── Hero score ring ──────────────────────────────
function resetHeroScore() {
  const scoreEl   = document.getElementById('ana-score');
  const verdictEl = document.getElementById('ana-verdict');
  const progress  = document.getElementById('hero-ring-progress');
  if (scoreEl)   { scoreEl.textContent = '—'; scoreEl.style.color = 'var(--text3)'; }
  if (verdictEl) { verdictEl.textContent = '—'; verdictEl.style.color = 'var(--text3)'; }
  if (progress)  { progress.style.strokeDashoffset = '251.2'; progress.style.stroke = 'var(--border2)'; }
}

function updateHeroScore(score, verdict) {
  const scoreEl   = document.getElementById('ana-score');
  const verdictEl = document.getElementById('ana-verdict');
  const progress  = document.getElementById('hero-ring-progress');
  const isPos = verdict === 'ACHAT' || verdict === 'ACHAT PROGRESSIF';
  const isNeg = verdict === 'ÉVITER' || verdict === 'PRUDENCE';
  const color = isPos ? 'var(--positive)' : isNeg ? 'var(--negative)' : 'var(--gold)';
  const dot = isPos ? IC.dotGreen : isNeg ? IC.dotRed : IC.dotGold;
  const offset = 251.2 - (score / 100) * 251.2;
  if (progress) { progress.style.stroke = color; progress.style.strokeDashoffset = offset; }
  if (scoreEl)  { scoreEl.textContent = score; scoreEl.style.color = color; }
  if (verdictEl){ verdictEl.innerHTML = dot + ' ' + verdict; verdictEl.style.color = color; }
}

function populateHero(d) {
  document.getElementById('ana-name').textContent = d.name;
  document.getElementById('ana-ticker').textContent = d.ticker + (d.exchange ? ' · ' + d.exchange : '');
  document.getElementById('ana-price').textContent = d.price ? d.price.toFixed(2) + ' ' + d.currency : '—';

  const changeEl = document.getElementById('ana-change');
  const isPos = d.changePct >= 0;
  changeEl.textContent = (isPos ? '▲ +' : '▼ ') + Math.abs(d.changePct).toFixed(2) + '%';
  changeEl.className = 'ana-hero-change ' + (isPos ? 'pos' : 'neg');

  // 52w bar
  if (d.high52 && d.low52 && d.price) {
    const range52 = d.high52 - d.low52;
    const pctPos = range52 > 0 ? ((d.price - d.low52) / range52 * 100) : 50;
    document.getElementById('ana-52w').textContent = d.low52.toFixed(2) + ' — ' + d.price.toFixed(2) + ' — ' + d.high52.toFixed(2);
    document.getElementById('ana-52w-fill').style.width = pctPos + '%';
    document.getElementById('ana-52w-dot').style.left = pctPos + '%';
  }

  // Afficher le score fondamental immédiatement
  if (d.fundamentalScore) {
    const fs = d.fundamentalScore;
    updateHeroScore(fs.score100, fs.verdict);
    const sublabel = document.getElementById('hero-mistral-sublabel');
    if (sublabel) sublabel.textContent = IC.barchart + ' ' + fs.total.toFixed(1) + '/25 · ' + fs.conviction;
  } else {
    resetHeroScore();
  }
}

// ═══════════════════════════════════════════════════
// SCORING FONDAMENTAL — porté depuis pea_analyzer.py
// Score total /25 = 5 dimensions × /5
// ═══════════════════════════════════════════════════

// Table PE de référence par secteur (médiane historique)
// ═══════════════════════════════════════════════════
// SCORING FONDAMENTAL — fidèle à pea_analyzer.py
// 5 dimensions × /5 = 25 pts → converti /100
// ═══════════════════════════════════════════════════

// ── Table PE sectorielle (médiane historique) ────
const SECTOR_PE_REF = {
  'technology': 28, 'communication services': 22,
  'consumer cyclical': 22, 'consumer defensive': 20,
  'healthcare': 22, 'industrials': 19, 'basic materials': 15,
  'energy': 12, 'utilities': 16, 'real estate': 30,
  'financial services': 13, 'financial': 13, 'banks': 11,
};

function getSectorPeRef(sector) {
  if (!sector) return 18;
  const s = sector.toLowerCase();
  for (const [k, v] of Object.entries(SECTOR_PE_REF)) {
    if (s.includes(k)) return v;
  }
  return 18;
}

function isFinancialSector(sector) {
  if (!sector) return false;
  const s = sector.toLowerCase();
  return s.includes('financial') || s.includes('bank') || s.includes('insurance');
}

// ── 1. Valorisation /5 ──────────────────────────
function scoreValorisationF(d) {
  let score = 0;
  const details = {};
  const sectorRef = getSectorPeRef(d.sector);

  const pe  = d.pe        ? parseFloat(d.pe)        : null;
  const peg = d.peg       ? parseFloat(d.peg)       : null;
  const pb  = d.pb        ? parseFloat(d.pb)        : null;
  const fpe = d.forwardPe ? parseFloat(d.forwardPe) : null;

  details['PE (TTM)']        = pe  ? pe.toFixed(1)        : 'N/A';
  details['PEG Ratio']       = peg ? peg.toFixed(2)       : 'N/A';
  details['Price/Book']      = pb  ? pb.toFixed(2)        : 'N/A';
  details['Forward PE']      = fpe ? fpe.toFixed(1)       : 'N/A';
  details['PE Ref. Secteur'] = sectorRef + 'x';

  if (pe) {
    const ratio = pe / sectorRef;
    details['PE vs Secteur'] = ratio.toFixed(2) + 'x (' + (pe < sectorRef ? 'sous-evalué' : 'sur-evalué') + ')';
    if      (ratio < 0.60) score += 2.0;
    else if (ratio < 0.80) score += 1.8;
    else if (ratio < 1.00) score += 1.5;
    else if (ratio < 1.20) score += 1.2;
    else if (ratio < 1.50) score += 0.8;
    else if (ratio < 2.00) score += 0.4;
    else                   score += 0.1;
  } else { score += 1.0; }

  if (peg) {
    if      (peg < 0.8) score += 2.0;
    else if (peg < 1.0) score += 1.8;
    else if (peg < 1.5) score += 1.2;
    else if (peg < 2.0) score += 0.8;
    else                score += 0.3;
  } else { score += 1.0; }

  if (pb) {
    if      (pb < 1.0) score += 1.0;
    else if (pb < 2.0) score += 0.8;
    else if (pb < 3.5) score += 0.6;
    else if (pb < 5.0) score += 0.4;
    else               score += 0.1;
  } else { score += 0.5; }

  return { score: Math.min(score, 5.0), details };
}

// ── 2. Qualité /5 ───────────────────────────────
function scoreQualiteF(d) {
  let score = 0;
  const details = {};

  const roe = d.roe          ? parseFloat(d.roe)          : null;
  const roa = d.roa          ? parseFloat(d.roa)          : null;
  const pm  = d.profitMargin ? parseFloat(d.profitMargin) : null;
  const gm  = d.grossMargin  ? parseFloat(d.grossMargin)  : null;
  const om  = d.opMargin     ? parseFloat(d.opMargin)     : null;

  details['ROE']          = roe ? (roe * 100).toFixed(1) + '%' : 'N/A';
  details['ROA']          = roa ? (roa * 100).toFixed(1) + '%' : 'N/A';
  details['Marge Nette']  = pm  ? (pm  * 100).toFixed(1) + '%' : 'N/A';
  details['Marge Brute']  = gm  ? (gm  * 100).toFixed(1) + '%' : 'N/A';
  details['Marge Operat'] = om  ? (om  * 100).toFixed(1) + '%' : 'N/A';

  if (roe) {
    const rp = roe * 100;
    if      (rp > 20) score += 2.0;
    else if (rp > 15) score += 1.8;
    else if (rp > 10) score += 1.4;
    else if (rp > 5)  score += 0.8;
    else              score += 0.3;
  } else { score += 1.0; }

  if (pm) {
    const p = pm * 100;
    if      (p > 20) score += 2.0;
    else if (p > 12) score += 1.6;
    else if (p > 7)  score += 1.2;
    else if (p > 3)  score += 0.8;
    else if (p > 0)  score += 0.4;
  } else { score += 1.0; }

  if (gm) {
    const g = gm * 100;
    if      (g > 50) score += 1.0;
    else if (g > 35) score += 0.8;
    else if (g > 20) score += 0.6;
    else             score += 0.3;
  } else { score += 0.5; }

  return { score: Math.min(score, 5.0), details };
}

// ── 3. Croissance /5 ────────────────────────────
function scoreCroissanceF(d) {
  let score = 0;
  const details = {};

  const revG = d.revGrowth ? parseFloat(d.revGrowth) * 100 : null;
  const epsG = d.epsGrowth ? parseFloat(d.epsGrowth) * 100 : null;
  const eps  = d.eps    ? parseFloat(d.eps)    : null;
  const feps = d.fwdEps ? parseFloat(d.fwdEps) : null;

  details['CAGR CA']       = revG !== null ? revG.toFixed(1) + '%' : 'N/A';
  details['Croiss. EPS']   = epsG !== null ? epsG.toFixed(1) + '%' : 'N/A';
  details['EPS (TTM)']     = eps  ? eps.toFixed(2)  : 'N/A';
  details['EPS (Forward)'] = feps ? feps.toFixed(2) : 'N/A';

  if (revG !== null) {
    if      (revG > 15) score += 2.5;
    else if (revG > 10) score += 2.0;
    else if (revG > 7)  score += 1.5;
    else if (revG > 3)  score += 1.0;
    else if (revG > 0)  score += 0.5;
    // revG <= 0 → 0 pts (comme Python)
  } else { score += 1.25; }

  if (epsG !== null) {
    if      (epsG > 15) score += 2.5;
    else if (epsG > 10) score += 2.0;
    else if (epsG > 7)  score += 1.5;
    else if (epsG > 3)  score += 1.0;
    else if (epsG > 0)  score += 0.5;
  } else { score += 1.25; }

  return { score: Math.min(score, 5.0), details };
}

// ── 4. Solidité /5 — avec Piotroski 9 critères ──
function scoreSoliditeF(d) {
  let score = 0;
  const details = {};

  if (isFinancialSector(d.sector)) {
    details['Note Secteur'] = 'Secteur financier : ratio dette ignore, ROE utilise';
    const roe = d.roe ? parseFloat(d.roe) : null;
    details['ROE (solidite)'] = roe ? (roe * 100).toFixed(1) + '%' : 'N/A';
    if (roe) {
      const rp = roe * 100;
      if      (rp > 15) score += 2.5;
      else if (rp > 12) score += 2.0;
      else if (rp > 8)  score += 1.5;
      else if (rp > 4)  score += 0.8;
      else              score += 0.2;
    } else { score += 1.0; }
  } else {
    const totalDebt = d.totalDebt ? parseFloat(d.totalDebt) : null;
    const cash      = d.totalCash ? parseFloat(d.totalCash) : null;
    const ebitda    = d.ebitda    ? parseFloat(d.ebitda)    : null;
    const netDebt   = (totalDebt !== null && cash !== null) ? totalDebt - cash : null;
    const ndEbitda  = (netDebt !== null && ebitda && ebitda > 0) ? netDebt / ebitda : null;

    details['Dette Nette/EBITDA'] = ndEbitda !== null ? ndEbitda.toFixed(2) + 'x' : 'N/A';
    details['Dette Totale'] = totalDebt ? (totalDebt / 1e9).toFixed(2) + ' Md' : 'N/A';
    details['Tresorerie']   = cash   ? (cash   / 1e9).toFixed(2) + ' Md' : 'N/A';
    details['EBITDA']       = ebitda ? (ebitda / 1e9).toFixed(2) + ' Md' : 'N/A';

    if (ndEbitda !== null) {
      if      (ndEbitda < 0) score += 2.5;
      else if (ndEbitda < 1) score += 2.3;
      else if (ndEbitda < 2) score += 2.0;
      else if (ndEbitda < 3) score += 1.4;
      else if (ndEbitda < 4) score += 0.8;
      else                   score += 0.2;
    } else { score += 1.0; }
  }

  // ── Piotroski F-Score 9 critères (fidèle Python) ─
  let fscore = 0;

  const roa = d.roa ? parseFloat(d.roa) : null;
  const f1 = roa && roa > 0;
  details['F1 ROA > 0']          = f1 ? 'oui' : 'non'; if (f1) fscore++;

  // F2 OCF > 0 — on utilise le FCF comme proxy (ocf non dispo via quoteSummary)
  const ocf = d.fcf ? parseFloat(d.fcf) : null;
  const f2 = ocf && ocf > 0;
  details['F2 OCF > 0']          = f2 ? 'oui' : 'non'; if (f2) fscore++;

  // F3 ΔROA > 0 — on utilise profitMargin > 0 comme proxy
  const f3 = d.profitMargin && parseFloat(d.profitMargin) > 0;
  details['F3 dROA > 0']         = f3 ? 'oui' : 'non'; if (f3) fscore++;

  // F4 OCF > Net Income
  const pm  = d.profitMargin ? parseFloat(d.profitMargin) : null;
  const f4 = ocf && pm && d.marketCap && (ocf > pm * parseFloat(d.marketCap));
  details['F4 OCF > Net Inc']    = f4 ? 'oui' : 'non'; if (f4) fscore++;

  // F5 Current Ratio > 1
  const cr = d.currentRatio ? parseFloat(d.currentRatio) : null;
  const f5 = cr && cr > 1;
  details['F5 Current Ratio > 1'] = f5 ? 'oui' : 'non'; if (f5) fscore++;

  // F6 Marge Brute > 0
  const gm = d.grossMargin ? parseFloat(d.grossMargin) : null;
  const f6 = gm && gm > 0;
  details['F6 Marge Brute > 0']  = f6 ? 'oui' : 'non'; if (f6) fscore++;

  // F7 Croissance CA > 0
  const f7 = d.revGrowth && parseFloat(d.revGrowth) > 0;
  details['F7 Croiss. CA > 0']   = f7 ? 'oui' : 'non'; if (f7) fscore++;

  // F8 D/E < 100
  const de = d.debtToEquity ? parseFloat(d.debtToEquity) : null;
  const f8 = de && de < 100;
  details['F8 D/E < 100']        = f8 ? 'oui' : 'non'; if (f8) fscore++;

  // F9 Quick Ratio > 1
  const qr = d.quickRatio ? parseFloat(d.quickRatio) : null;
  const f9 = qr && qr > 1;
  details['F9 Quick Ratio > 1']  = f9 ? 'oui' : 'non'; if (f9) fscore++;

  details['F-Score Piotroski'] = fscore + '/9';
  score += (fscore / 9) * 2.5;

  return { score: Math.min(score, 5.0), details };
}

// ── 5. Dividende /5 ─────────────────────────────
function scoreDividendeF(d) {
  let score = 0;
  const details = {};

  // Normaliser divYield → décimal (comme _safe_div_yield Python)
  let divYield = null;
  if (d.divYieldRaw !== null && d.divYieldRaw !== undefined) {
    const raw = parseFloat(d.divYieldRaw);
    if (raw > 0) divYield = raw > 1.0 ? raw / 100 : raw;
  }

  let payoutRatio = null;
  if (d.payoutRatio) {
    const raw = parseFloat(d.payoutRatio);
    if (raw > 0) payoutRatio = raw > 1.5 ? raw / 100 : raw;
  }

  const divRate = d.divRate ? parseFloat(d.divRate) : null;
  const fcf     = d.fcf     ? parseFloat(d.fcf)     : null;
  const shares  = d.sharesOutstanding ? parseFloat(d.sharesOutstanding) : null;

  details['Rendement Div.']   = divYield    ? (divYield * 100).toFixed(2) + '%'    : 'N/A';
  details['Dividende/Action'] = divRate     ? divRate.toFixed(2)                   : 'N/A';
  details['Payout Ratio']     = payoutRatio ? (payoutRatio * 100).toFixed(1) + '%' : 'N/A';
  details['FCF']              = fcf         ? (fcf / 1e9).toFixed(2) + ' Md'       : 'N/A';

  if (!divYield) {
    details['Note'] = 'Pas de dividende verse';
    const revG = d.revGrowth ? parseFloat(d.revGrowth) : 0;
    score = revG > 0.10 ? 3.0 : 2.0;
    if (revG > 0.10) details['Bonus Croissance'] = 'Reinvestissement (CA >10%)';
    return { score: Math.min(score, 5.0), details };
  }

  // Payout sur FCF (fidèle Python)
  let fcfPayout = null;
  if (fcf && fcf > 0 && divRate && shares) {
    fcfPayout = (divRate * shares / fcf) * 100;
  }
  details['Payout/FCF'] = fcfPayout !== null ? fcfPayout.toFixed(1) + '%' : 'N/A';

  if (fcfPayout !== null) {
    if      (fcfPayout < 30) score += 2.5;
    else if (fcfPayout < 60) score += 2.0;
    else if (fcfPayout < 75) score += 1.2;
    else if (fcfPayout < 90) score += 0.5;
    else                     score += 0.1;
  } else if (payoutRatio) {
    const pr = payoutRatio * 100;
    if      (pr < 30)  score += 2.5;
    else if (pr < 60)  score += 2.0;
    else if (pr < 75)  score += 1.2;
    else if (pr < 100) score += 0.5;
  } else { score += 1.25; }

  const dy = divYield * 100;
  if      (dy >= 2 && dy <= 5) score += 2.5;  // zone optimale
  else if (dy >= 1 && dy < 2)  score += 1.5;
  else if (dy > 5  && dy <= 8) score += 1.5;
  else if (dy > 8)             score += 0.5;  // trop élevé = risque
  else                         score += 0.5;

  return { score: Math.min(score, 5.0), details };
}

// ── Score global /25 → verdict + conviction ─────
function computeFundamentalScore(d) {
  const valo = scoreValorisationF(d);
  const qual = scoreQualiteF(d);
  const croi = scoreCroissanceF(d);
  const sold = scoreSoliditeF(d);
  const divd = scoreDividendeF(d);

  const total    = valo.score + qual.score + croi.score + sold.score + divd.score;
  const score100 = Math.round(total / 25 * 100);

  // Verdicts fidèles au Python (5 niveaux)
  let verdict, conviction, color;
  if (total >= 20) {
    verdict    = 'ACHAT';       conviction = '8/10'; color = 'var(--positive)';
  } else if (total >= 17) {
    verdict    = 'ACHAT PROGRESSIF'; conviction = '7/10'; color = 'var(--positive)';
  } else if (total >= 14) {
    verdict    = 'CONSERVER';   conviction = '5/10'; color = 'var(--gold)';
  } else if (total >= 10) {
    verdict    = 'PRUDENCE';    conviction = '4/10'; color = 'var(--gold)';
  } else {
    verdict    = 'ÉVITER';      conviction = '2/10'; color = 'var(--negative)';
  }

  // Diagnostic automatique (points forts / faibles)
  const scores = { Valorisation: valo.score, Qualite: qual.score, Croissance: croi.score, Solidite: sold.score, Dividende: divd.score };
  const strengths  = [];
  const weaknesses = [];
  for (const [cat, val] of Object.entries(scores)) {
    if (val >= 3.5) {
      const msgs = { Valorisation: 'Valorisation attractive', Qualite: 'Qualite des marges elevee', Croissance: 'Croissance soutenue', Solidite: 'Bilan financier robuste', Dividende: 'Politique de dividende saine' };
      strengths.push((msgs[cat] || cat) + ' (' + val.toFixed(1) + '/5)');
    }
    if (val < 2.5) {
      const msgs = { Valorisation: 'Valorisation tendue', Qualite: 'Marges sous pression ou ROE insuffisant', Croissance: 'Croissance faible ou en ralentissement', Solidite: 'Endettement eleve ou F-Score degrade', Dividende: 'Dividende absent, eleve ou peu soutenable' };
      weaknesses.push((msgs[cat] || cat) + ' (' + val.toFixed(1) + '/5)');
    }
  }

  return {
    total, score100, verdict, conviction, color,
    valo, qual, croi, sold, divd,
    strengths, weaknesses,
  };
}


function metricCard(label, value, sub, badge) {
  const badgeHtml = badge ? '<div class="metric-badge ' + badge.cls + '">' + badge.text + '</div>' : '';
  return '<div class="metric-card">' + badgeHtml +
    '<div class="metric-label">' + label + '</div>' +
    '<div class="metric-val">' + value + '</div>' +
    (sub ? '<div class="metric-sub">' + sub + '</div>' : '') + '</div>';
}
function rateBadge(val, goodMin, goodMax, midMin, midMax) {
  if (val == null || isNaN(val)) return null;
  if (val >= goodMin && val <= goodMax) return { cls: 'good', text: 'Bon' };
  if (val >= midMin && val <= midMax) return { cls: 'mid', text: 'Moyen' };
  return { cls: 'bad', text: 'Élevé' };
}

function populateTabs(d) {
  const na = '—';
  const f2 = v => v != null && !isNaN(v) ? parseFloat(v).toFixed(2) : na;
  const f1 = v => v != null && !isNaN(v) ? parseFloat(v).toFixed(1) : na;
  const pct = v => v != null && !isNaN(v) ? (parseFloat(v) * 100).toFixed(2) + '%' : na;
  const fs = d.fundamentalScore;

  // ── Helper : afficher un score de dimension avec détails ──
  function scoreBlock(label, scoreObj, color) {
    const s = scoreObj ? scoreObj.score : null;
    const c = s === null ? 'var(--text3)' : s >= 3.5 ? 'var(--positive)' : s >= 2.5 ? 'var(--gold)' : 'var(--negative)';
    const bar = s !== null ? Math.round(s / 5 * 100) : 0;
    let detailsHtml = '';
    if (scoreObj && scoreObj.details) {
      detailsHtml = Object.entries(scoreObj.details).map(([k, v]) =>
        '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px">' +
        '<span style="color:var(--text2)">' + k + '</span>' +
        '<span style="font-family:var(--mono);color:var(--text)">' + v + '</span></div>'
      ).join('');
    }
    return '<div class="metric-card" style="grid-column:span 2">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<div class="metric-label">' + label + '</div>' +
        '<div style="font-family:var(--display);font-size:22px;font-weight:800;color:' + c + '">' + (s !== null ? s.toFixed(1) + '/5' : '—') + '</div>' +
      '</div>' +
      '<div style="height:4px;background:var(--s3);border-radius:2px;margin-bottom:12px">' +
        '<div style="width:' + bar + '%;height:100%;background:' + c + ';border-radius:2px;transition:width .6s ease"></div>' +
      '</div>' +
      detailsHtml +
    '</div>';
  }

  // ── VALORISATION ──
  document.getElementById('metrics-valuation').innerHTML =
    // Score block
    (fs ? scoreBlock('Score Valorisation', fs.valo, 'var(--accent)') : '') +
    // Métriques individuelles
    metricCard('P/E Ratio', f1(d.pe), d.pe ? (d.pe < 15 ? 'Sous-évalué' : d.pe < 25 ? 'Raisonnable' : 'Cher') : '', d.pe ? rateBadge(d.pe, 0, 15, 15, 25) : null) +
    metricCard('P/E Forward', f1(d.forwardPe), 'Estimé 12 mois', d.forwardPe ? rateBadge(d.forwardPe, 0, 18, 18, 30) : null) +
    metricCard('PEG Ratio', f2(d.peg), d.peg ? (d.peg < 1 ? 'Attractif' : d.peg < 2 ? 'Correct' : 'Élevé') : 'N/D', d.peg ? rateBadge(d.peg, 0, 1, 1, 2) : null) +
    metricCard('Price/Book', f2(d.pb), d.pb ? (d.pb < 1 ? 'Sous VNC' : d.pb < 3 ? 'Correct' : 'Premium') : 'N/D', null) +
    metricCard('Cap. boursière', d.marketCap ? (d.marketCap > 1e12 ? (d.marketCap/1e12).toFixed(1)+'T' : d.marketCap > 1e9 ? (d.marketCap/1e9).toFixed(1)+'Md' : (d.marketCap/1e6).toFixed(0)+'M') : na, d.currency, null) +
    (d.buyPrice ? metricCard('PRU portefeuille', f2(d.buyPrice) + ' ' + d.currency, '', null) : '') +
    (d.buyPrice && d.price ? metricCard('+/- Value unit.', (d.price - d.buyPrice >= 0 ? '+' : '') + f2(d.price - d.buyPrice), ((d.price - d.buyPrice) / d.buyPrice * 100).toFixed(2) + '%', d.price >= d.buyPrice ? { cls: 'good', text: 'Gain' } : { cls: 'bad', text: 'Perte' }) : '');

  // ── RENTABILITÉ ──
  document.getElementById('metrics-profit').innerHTML =
    (fs ? scoreBlock('Score Qualité', fs.qual, 'var(--accent2)') : '') +
    (fs ? scoreBlock('Score Croissance', fs.croi, 'var(--positive)') : '') +
    metricCard('ROE', d.roe ? (d.roe*100).toFixed(1)+'%' : na, 'Retour sur capitaux', d.roe ? rateBadge(d.roe*100, 15, 100, 8, 15) : null) +
    metricCard('ROA', d.roa ? (d.roa*100).toFixed(1)+'%' : na, 'Retour sur actifs', null) +
    metricCard('Marge Nette', d.profitMargin ? (d.profitMargin*100).toFixed(1)+'%' : na, '', d.profitMargin ? rateBadge(d.profitMargin*100, 12, 100, 5, 12) : null) +
    metricCard('Marge Brute',  d.grossMargin  ? (d.grossMargin*100).toFixed(1)+'%'  : na, '', null) +
    metricCard('Marge Opérat', d.opMargin     ? (d.opMargin*100).toFixed(1)+'%'     : na, '', null) +
    metricCard('Croiss. CA',   d.revGrowth    ? (d.revGrowth*100).toFixed(1)+'%'    : na, 'YoY', d.revGrowth ? rateBadge(d.revGrowth*100, 10, 100, 3, 10) : null) +
    metricCard('Croiss. EPS',  d.epsGrowth    ? (d.epsGrowth*100).toFixed(1)+'%'    : na, 'YoY', null) +
    metricCard('EPS (TTM)',    d.eps    ? f2(d.eps)    + ' ' + d.currency : na, '', null) +
    metricCard('EPS (Fwd)',    d.fwdEps ? f2(d.fwdEps) + ' ' + d.currency : na, '', null);

  // ── DIVIDENDES ──
  let dyDisplay = d.divYieldRaw ? parseFloat(d.divYieldRaw) : null;
  if (dyDisplay && dyDisplay > 1.0) dyDisplay = dyDisplay / 100;
  document.getElementById('metrics-dividends').innerHTML =
    (fs ? scoreBlock('Score Dividende', fs.divd, 'var(--gold)') : '') +
    metricCard('Rendement', dyDisplay ? (dyDisplay*100).toFixed(2)+'%' : na, 'Annuel', dyDisplay ? rateBadge(dyDisplay*100, 2, 5, 1, 2) : null) +
    metricCard('Dividende/action', d.divRate ? f2(d.divRate)+' '+d.currency : na, 'Trailing 12 mois', null) +
    metricCard('Payout Ratio', d.payoutRatio ? (parseFloat(d.payoutRatio) > 1 ? parseFloat(d.payoutRatio).toFixed(1) : (parseFloat(d.payoutRatio)*100).toFixed(1))+'%' : na, '', null) +
    (d.qty && d.divRate ? metricCard('Revenu annuel estimé', f2(d.qty * parseFloat(d.divRate))+' '+d.currency, d.qty+' actions', { cls:'good', text: IC.coin }) : metricCard('Revenu annuel', na, 'Ajoutez au portefeuille', null)) +
    metricCard('Statut', dyDisplay && dyDisplay > 0 ? 'Distributeur' : 'Pas de dividende', '', dyDisplay && dyDisplay > 0 ? { cls:'good', text:'OUI' } : { cls:'mid', text:'NON' });

  // ── RISQUE / SOLIDITÉ ──
  const beta = d.beta ? parseFloat(d.beta) : null;
  document.getElementById('metrics-risk').innerHTML =
    (fs ? scoreBlock('Score Solidité', fs.sold, 'var(--accent)') : '') +
    metricCard('Bêta', beta ? beta.toFixed(2) : na, beta ? (beta < 0.8 ? 'Défensif' : beta > 1.2 ? 'Agressif' : 'Neutre') : '', beta ? rateBadge(beta, 0, 0.8, 0.8, 1.2) : null) +
    metricCard('D/E Ratio', d.debtToEquity ? parseFloat(d.debtToEquity).toFixed(1) : na, '', d.debtToEquity ? rateBadge(d.debtToEquity, 0, 50, 50, 100) : null) +
    metricCard('Current Ratio', d.currentRatio ? parseFloat(d.currentRatio).toFixed(2) : na, d.currentRatio ? (d.currentRatio > 1.5 ? 'Liquide' : d.currentRatio > 1 ? 'Correct' : 'Tendu') : '', null) +
    metricCard('Quick Ratio', d.quickRatio ? parseFloat(d.quickRatio).toFixed(2) : na, '', null) +
    metricCard('Dette Totale', d.totalDebt ? (d.totalDebt/1e9).toFixed(2)+'Md' : na, d.currency, null) +
    metricCard('Trésorerie', d.totalCash ? (d.totalCash/1e9).toFixed(2)+'Md' : na, d.currency, null) +
    metricCard('52w range', d.high52 && d.low52 ? ((d.high52-d.low52)/d.low52*100).toFixed(1)+'%' : na, 'Amplitude annuelle', null);

  // Peers comparison
  loadPeers(d);
}

// Peers: fetch a few tickers from same sector and compare
async function loadPeers(d) {
  const wrap = document.getElementById('peers-content');
  const sector = TICKER_SECTORS[d.ticker] || 'Autre';
  // Find peers in same sector
  const peers = Object.entries(TICKER_SECTORS).filter(([t, s]) => s === sector && t !== d.ticker).map(([t]) => t).slice(0, 4);
  if (!peers.length) { wrap.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:32px 0">Aucun pair trouvé pour le secteur "' + sector + '"</div>'; return; }

  wrap.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:20px 0"><span class="loading-spinner"></span> Chargement des pairs…</div>';

  const allData = [{ ticker: d.ticker, name: d.name, price: d.price, pe: d.pe, beta: d.beta, divYield: d.divYield, changePct: d.changePct, isCurrent: true }];

  await Promise.all(peers.map(async ticker => {
    try {
      const raw = await fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(resolveToYahooTicker(ticker)) + '?interval=1d&range=5d');
      const cd = JSON.parse(raw);
      const meta = cd.chart.result[0].meta;
      const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
      allData.push({
        ticker, name: meta.shortName || meta.longName || ticker,
        price: meta.regularMarketPrice, pe: meta.trailingPE || null,
        beta: meta.beta || null,
        divYield: meta.trailingAnnualDividendRate > 0 ? (meta.trailingAnnualDividendRate / meta.regularMarketPrice) : null,
        changePct: prev ? ((meta.regularMarketPrice - prev) / prev * 100) : 0,
        isCurrent: false,
      });
    } catch(e) {}
  }));

  const f = v => v != null && !isNaN(v) ? parseFloat(v).toFixed(2) : '—';
  let html = '<table class="peers-table"><thead><tr><th>Action</th><th>Prix</th><th>P/E</th><th>Beta</th><th>Div. yield</th><th>Var. jour</th></tr></thead><tbody>';
  allData.forEach(p => {
    html += '<tr' + (p.isCurrent ? ' class="highlight"' : '') + '>';
    html += '<td style="font-weight:600">' + (p.isCurrent ? '→ ' : '') + p.ticker + '</td>';
    html += '<td>' + f(p.price) + '</td>';
    html += '<td>' + (p.pe ? parseFloat(p.pe).toFixed(1) : '—') + '</td>';
    html += '<td>' + (p.beta ? parseFloat(p.beta).toFixed(2) : '—') + '</td>';
    html += '<td>' + (p.divYield ? (p.divYield * 100).toFixed(2) + '%' : '—') + '</td>';
    html += '<td style="color:' + (p.changePct >= 0 ? 'var(--positive)' : 'var(--negative)') + '">' + (p.changePct >= 0 ? '+' : '') + p.changePct.toFixed(2) + '%</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function setAnaTab(tab) {
  document.querySelectorAll('.ana-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ana-section').forEach(s => s.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('ana-' + tab).classList.add('active');
}

// ─── GRAPHIQUES ──────────────────────────────────────────
let chartDonut = null;
let chartPerf  = null;
let chartHist  = null;

const CHART_COLORS = [
  '#7c6df5','#5b8dee','#00e09e','#f5b731','#ff4d6a',
  '#63b3ed','#68d391','#fc8181','#f6ad55','#76e4f7',
];

function initCharts() {
  const data = getPortfolio(currentUser);
  const empty = document.getElementById('charts-empty');
  const content = document.getElementById('charts-content');

  if (!data.length) {
    empty.style.display = 'block';
    content.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  content.style.display = 'block';

  renderDonutChart(data);
  renderPerfChart(data);
  populateHistSelect(data);
  renderHistChart();
}

function renderDonutChart(data) {
  const labels = data.map(r => r.ticker);
  const values = data.map(r => +(r.currentPrice * r.qty).toFixed(2));
  const ctx    = document.getElementById('chart-donut').getContext('2d');

  if (chartDonut) chartDonut.destroy();
  chartDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: CHART_COLORS.slice(0, data.length),
        borderColor: '#0a0c14',
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#8892a8',
            font: { family: 'JetBrains Mono', size: 11 },
            padding: 14,
            boxWidth: 12,
            boxHeight: 12,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + ctx.label + ' — ' + ctx.parsed.toLocaleString('fr-FR', {style:'currency',currency:'EUR'})
          },
          backgroundColor: '#10121c',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#edf0f7',
          bodyColor: '#8892a8',
          padding: 12,
          cornerRadius: 8,
        }
      }
    }
  });
}

function renderPerfChart(data) {
  const labels = data.map(r => r.ticker);
  const values = data.map(r => +((r.currentPrice - r.buyPrice) / r.buyPrice * 100).toFixed(2));
  const colors = values.map(v => v >= 0 ? 'rgba(0,224,158,0.7)' : 'rgba(255,77,106,0.7)');
  const borders = values.map(v => v >= 0 ? '#00e09e' : '#ff4d6a');
  const ctx = document.getElementById('chart-perf').getContext('2d');

  if (chartPerf) chartPerf.destroy();
  chartPerf = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Performance (%)',
        data: values,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + (ctx.parsed.x >= 0 ? '+' : '') + ctx.parsed.x + '%'
          },
          backgroundColor: '#10121c',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#edf0f7',
          bodyColor: '#8892a8',
          padding: 12,
          cornerRadius: 8,
        }
      },
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#495068', font: { family: 'JetBrains Mono', size: 10 },
                   callback: v => (v > 0 ? '+' : '') + v + '%' },
          border: { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          grid:  { display: false },
          ticks: { color: '#8892a8', font: { family: 'JetBrains Mono', size: 11 } },
          border: { color: 'rgba(255,255,255,0.04)' }
        }
      }
    }
  });
}

function populateHistSelect(data) {
  const sel = document.getElementById('chart-hist-select');
  sel.innerHTML = data.map((r,i) =>
    '<option value="' + i + '">' + r.ticker + ' — ' + (r.name || r.ticker) + '</option>'
  ).join('');
}

let currentPeriod = '1y';

const PERIOD_CONFIG = {
  '1d':  { range:'1d',   interval:'5m'  },
  '5d':  { range:'5d',   interval:'15m' },
  '1mo': { range:'1mo',  interval:'1d'  },
  '3mo': { range:'3mo',  interval:'1d'  },
  '6mo': { range:'6mo',  interval:'1wk' },
  '1y':  { range:'1y',   interval:'1wk' },
  '3y':  { range:'3y',   interval:'1wk' },
  '5y':  { range:'5y',   interval:'1mo' },
  '10y': { range:'10y',  interval:'1mo' },
  'max': { range:'max',  interval:'3mo' },
};

function setPeriod(p) {
  currentPeriod = p;
  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.p === p);
  });
  renderHistChart();
}

async function renderHistChart() {
  const sel  = document.getElementById('chart-hist-select');
  const data = getPortfolio(currentUser);
  if (!data.length || sel.selectedIndex < 0) return;
  const row = data[parseInt(sel.value)];
  const ctx = document.getElementById('chart-hist').getContext('2d');
  const cfg = PERIOD_CONFIG[currentPeriod] || PERIOD_CONFIG['1y'];

  if (chartHist) { chartHist.destroy(); chartHist = null; }
  document.getElementById('hist-sub').textContent = 'Chargement…';

  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/'
      + encodeURIComponent(resolveToYahooTicker(row.ticker))
      + '?interval=' + cfg.interval + '&range=' + cfg.range;
    const raw = await fetchWithFallback(url);
    const d   = JSON.parse(raw);
    const res = d.chart && d.chart.result && d.chart.result[0];
    if (!res) throw new Error('Pas de données');

    const timestamps = res.timestamp;
    const closes     = res.indicators.quote[0].close;

    const labels = timestamps.map(t => {
      const dt = new Date(t * 1000);
      if (['1d','5d'].includes(currentPeriod))
        return dt.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
      if (['1mo','3mo'].includes(currentPeriod))
        return dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
      return dt.toLocaleDateString('fr-FR', { month:'short', year:'2-digit' });
    });

    const values = closes.map(v => v ? +v.toFixed(2) : null);
    const first  = values.find(v => v !== null);
    const last   = [...values].reverse().find(v => v !== null);
    const isUp   = last >= first;
    const color  = isUp ? '#00e09e' : '#ff4d6a';
    const pct    = first ? ((last - first) / first * 100).toFixed(2) : 0;
    const sign   = pct >= 0 ? '+' : '';

    document.getElementById('hist-sub').textContent =
      row.name + ' · ' + sign + pct + '% sur la période';

    if (chartHist) chartHist.destroy();
    chartHist = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: row.ticker,
          data: values,
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          tension: 0.2,
          fill: true,
          backgroundColor: (ctx2) => {
            const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, isUp ? 'rgba(0,224,158,0.12)' : 'rgba(255,77,106,0.12)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            return g;
          },
        }]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 1200, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#10121c',
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            titleColor: '#8892a8',
            bodyColor: '#edf0f7',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: ctx => ' ' + (ctx.parsed.y !== null
                ? ctx.parsed.y.toLocaleString('fr-FR', {minimumFractionDigits:2})
                : '—') + ' ' + (row.currency || '')
            }
          }
        },
        scales: {
          x: {
            grid:  { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#495068', font: { family:'JetBrains Mono', size:10 }, maxTicksLimit:10 },
            border: { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            position: 'right',
            grid:  { color: 'rgba(255,255,255,0.03)' },
            ticks: { color:'#8892a8', font:{ family:'JetBrains Mono', size:10 },
                     callback: v => v.toLocaleString('fr-FR', {minimumFractionDigits:2}) },
            border: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  } catch(e) {
    document.getElementById('hist-sub').textContent = 'Données indisponibles pour cette période.';
    console.error('Hist chart error:', e);
  }
}

// ─── GRAPHIQUE ÉVOLUTION PORTEFEUILLE ────────────────────
let chartPortfolio    = null;
let portfolioPeriod   = 'max';

const PORTFOLIO_PERIOD_CONFIG = {
  '1d':  { range:'1d',   interval:'5m'  },
  '5d':  { range:'5d',   interval:'15m' },
  '1mo': { range:'1mo',  interval:'1d'  },
  '3mo': { range:'3mo',  interval:'1d'  },
  '6mo': { range:'6mo',  interval:'1wk' },
  '1y':  { range:'1y',   interval:'1wk' },
  '3y':  { range:'3y',   interval:'1wk' },
  '5y':  { range:'5y',   interval:'1mo' },
  'max': { range:'max',  interval:'1mo' },
};

function setPortfolioPeriod(p) {
  portfolioPeriod = p;
  document.querySelectorAll('[data-pp]').forEach(b => {
    b.classList.toggle('active', b.dataset.pp === p);
  });
  _pfRevealArmed = true;   // courbe entièrement différente : on la retrace
  renderPortfolioChart();
}

// ─── TRANSACTION LOG ─────────────────────────────────
// Stores all buy/sell events so history can be reconstructed
// even after positions are fully sold
// getTransactions/saveTransactions → Firestore (définis dans couche données)


// ─── VERSEMENTS (cash deposits) ─────────────────────
// getVersements/saveVersements → Firestore (définis dans couche données)
function openVersementModal() {
  document.getElementById('versement-modal-overlay').classList.add('open');
  document.getElementById('versement-amount').value = '';
  document.getElementById('versement-date').value = new Date().toISOString().slice(0,10);
}
function closeVersementModal() {
  document.getElementById('versement-modal-overlay').classList.remove('open');
}
function confirmVersement() {
  const amount = parseFloat(document.getElementById('versement-amount').value);
  const date = document.getElementById('versement-date').value;
  if (!amount || amount <= 0) { alert('Montant invalide.'); return; }
  if (!date) { alert('Date requise.'); return; }
  const v = getVersements(currentUser);
  v.push({ amount, date });
  saveVersements(currentUser, v);
  closeVersementModal();
  renderPortfolio();
}

function toggleVersementsList() {
  const el = document.getElementById('versements-list');
  if (el.style.display === 'none') {
    renderVersementsList();
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

function renderVersementsList() {
  const v = getVersements(currentUser);
  const el = document.getElementById('versements-list');
  if (!v.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:11px">Aucun versement.</div>';
    return;
  }
  const sorted = v.map((x, i) => ({ ...x, _i: i })).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  el.innerHTML = sorted.map(x =>
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid var(--border);font-size:11px">' +
      '<span style="color:var(--text2)">' + (x.date || '?') + '</span>' +
      '<span style="font-family:var(--mono);color:var(--text)">' + x.amount.toFixed(2) + ' €</span>' +
      '<button onclick="deleteVersement(' + x._i + ')" style="background:none;border:none;color:var(--negative);cursor:pointer;font-size:13px;padding:2px 6px" title="Supprimer">✕</button>' +
    '</div>'
  ).join('');
}

function deleteVersement(index) {
  if (!confirm('Supprimer ce versement ?')) return;
  const v = getVersements(currentUser);
  v.splice(index, 1);
  saveVersements(currentUser, v);
  renderVersementsList();
  renderPortfolio();
}

// ─── MODAL "Gérer les versements" ─────────────────────
let _versEditIdx = -1;

window.openVersementsListModal = function() {
  _versEditIdx = -1;
  renderVersementsModalList();
  document.getElementById('versements-list-modal').classList.add('open');
};
window.closeVersementsListModal = function() {
  document.getElementById('versements-list-modal').classList.remove('open');
};
window.addVersementFromModal = function() {
  closeVersementsListModal();
  openVersementModal();
};

function _versDateFr(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return String(dt.getDate()).padStart(2,'0') + '/' + String(dt.getMonth()+1).padStart(2,'0') + '/' + dt.getFullYear();
}

function renderVersementsModalList() {
  const v = getVersements(currentUser);
  const el = document.getElementById('versements-modal-body');
  if (!el) return;
  if (!v.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:13px;text-align:center;padding:24px">Aucun versement enregistré.</div>';
    return;
  }
  const sorted = v.map((x, i) => ({ ...x, _i: i })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const trash = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  el.innerHTML = sorted.map(x => {
    if (x._i === _versEditIdx) {
      return '<div class="vers-row vers-row-edit">' +
        '<input type="date" id="vers-edit-date" class="form-input" value="' + (x.date || '') + '" style="color-scheme:dark;flex:1;font-size:12px;padding:6px 8px">' +
        '<input type="number" id="vers-edit-amount" class="form-input" value="' + x.amount + '" step="any" min="0" style="width:100px;font-size:12px;padding:6px 8px">' +
        '<button class="btn-vers-act ok" onclick="saveVersementEdit(' + x._i + ')" title="Enregistrer">✓</button>' +
        '<button class="btn-vers-act" onclick="cancelVersementEdit()" title="Annuler">✕</button>' +
      '</div>';
    }
    return '<div class="vers-row">' +
      '<span class="vers-date">' + _versDateFr(x.date) + '</span>' +
      '<span class="vers-amount">' + x.amount.toFixed(2) + ' €</span>' +
      '<button class="btn-vers-act" onclick="startVersementEdit(' + x._i + ')" title="Modifier">' + IC.edit + '</button>' +
      '<button class="btn-vers-act del" onclick="deleteVersementFromModal(' + x._i + ')" title="Supprimer">' + trash + '</button>' +
    '</div>';
  }).join('');
  const total = v.reduce((s, x) => s + (x.amount || 0), 0);
  el.innerHTML += '<div class="vers-total">Total versé<strong>' + total.toFixed(2) + ' €</strong></div>';
}

window.startVersementEdit = function(i) { _versEditIdx = i; renderVersementsModalList(); };
window.cancelVersementEdit = function() { _versEditIdx = -1; renderVersementsModalList(); };

window.saveVersementEdit = function(i) {
  const amount = parseFloat(document.getElementById('vers-edit-amount').value);
  const date = document.getElementById('vers-edit-date').value;
  if (!amount || amount <= 0) { alert('Montant invalide.'); return; }
  if (!date) { alert('Date requise.'); return; }
  const v = getVersements(currentUser);
  if (!v[i]) return;
  v[i] = { ...v[i], amount, date };
  saveVersements(currentUser, v);
  _versEditIdx = -1;
  renderVersementsModalList();
  renderPortfolio();
};

window.deleteVersementFromModal = function(i) {
  if (!confirm('Supprimer ce versement ?')) return;
  const v = getVersements(currentUser);
  v.splice(i, 1);
  saveVersements(currentUser, v);
  if (_versEditIdx === i) _versEditIdx = -1;
  renderVersementsModalList();
  renderPortfolio();
};

// Courtier : dropdown custom. Seul Boursorama est dispo (les autres "dispo bientôt").
window.toggleBrokerDD = function(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('broker-dd');
  if (!dd) return;
  const open = dd.classList.toggle('open');
  if (open) {
    setTimeout(() => document.addEventListener('click', _closeBrokerDD), 0);
  }
};
function _closeBrokerDD() {
  const dd = document.getElementById('broker-dd');
  if (dd) dd.classList.remove('open');
  document.removeEventListener('click', _closeBrokerDD);
}
window.selectBroker = function(id, label, domain) {
  const cur = document.getElementById('broker-current');
  const logo = document.getElementById('broker-logo');
  if (cur) cur.textContent = label;
  if (logo && domain) logo.src = 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64';
  _closeBrokerDD();
};

// ═══ CALENDRIER DES RÉSULTATS (earnings — vue agenda) ═══
// Source : Yahoo calendarEvents via Worker /earnings (prochaine date par titre).
// Vue : liste par jour (jours sans publication masqués). Abonnement → push notif.
let _ecItems   = [];      // earnings (prochaines dates) des symboles affichés
let _ecSubs    = {};      // { SYM: { name } } abonnements du user (cloche)
let _ecCustom  = {};      // { SYM: { name } } liste personnalisée du user
let _ecListMode = 'popular'; // 'popular' (sélection Capital Board) | 'custom' (ma liste)
let _ecLoaded  = false;
let _ecLoading = false;

function _ecNorm(s)    { return (s || '').trim().toUpperCase(); }
// Vrai si la suggestion est un ETF / fonds (exclu de la liste perso : actions seulement).
function _ecIsEtf(s) {
  const t = (s.type || '').toUpperCase();
  if (t === 'ETF' || t === 'MUTUALFUND') return true;
  if ((s.exchange || '').toUpperCase() === 'ETF') return true;
  return isETF(_ecNorm(s.symbol));
}
function _ecDateStr(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
const _EC_MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const _EC_DOWS   = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

// Valeurs notables mondiales affichées par défaut (tickers Yahoo).
const _EC_POPULAR = [
  'AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','NFLX','AMD','INTC','AVGO','ORCL','ADBE','CRM','CSCO','QCOM','PYPL','UBER',
  'JPM','BAC','V','MA','KO','PEP','MCD','DIS','NKE','WMT','COST','XOM','CVX','PFE','JNJ','BA','GE','CAT',
  'ASML.AS','SAP.DE','SIE.DE','AIR.PA','MC.PA','OR.PA','TTE.PA','SAN.PA','BNP.PA','SU.PA','DG.PA','NESN.SW','NOVN.SW','ROG.SW','SHEL.L','AZN.L','HSBA.L',
  '005930.KS','TSM','BABA','9988.HK','TM','SONY','7203.T',
];

function _ecRelevantSymbols() {
  const set = new Set();
  (getPortfolio(currentUser) || []).forEach(r => r.ticker && set.add(_ecNorm(r.ticker)));
  (getWatchlist(currentUser) || []).forEach(w => w.ticker && set.add(_ecNorm(w.ticker)));
  Object.keys(_ecSubs).forEach(s => set.add(_ecNorm(s)));
  return [...set];
}
function _ecDisplaySymbols() {
  // Mode « ma liste » : strictement la liste perso (rien d'autre).
  if (_ecListMode === 'custom') {
    return Object.keys(_ecCustom).map(_ecNorm);
  }
  // Mode « sélection Capital Board » : grandes valeurs + détenus/suivis.
  const set = new Set(_ecRelevantSymbols());
  _EC_POPULAR.forEach(s => set.add(_ecNorm(s)));
  return [...set];
}

// Catégorie pour la couleur : détenu > suivi > watchlist > autre.
function _ecCategory(sym) {
  const s = _ecNorm(sym);
  if ((getPortfolio(currentUser) || []).some(r => _ecNorm(r.ticker) === s)) return 'owned';
  if (_ecSubs[s]) return 'sub';
  if ((getWatchlist(currentUser) || []).some(w => _ecNorm(w.ticker) === s)) return 'watch';
  return 'other';
}

async function _ecLoadSubs() {
  _ecSubs = {};
  if (window.IS_DEMO || !currentUser) return;
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'earningsSubs'));
    if (snap.exists()) _ecSubs = snap.data().subs || {};
  } catch(e) { console.warn('[earnings] load subs:', e.message); }
}

// Liste personnalisée : Firestore (connecté) ou localStorage (démo/anon).
async function _ecLoadCustom() {
  _ecCustom = {};
  if (window.IS_DEMO || !currentUser) {
    try { _ecCustom = JSON.parse(localStorage.getItem('ec_custom_' + (currentUser || 'anon')) || '{}') || {}; } catch(_) {}
    return;
  }
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'earningsList'));
    if (snap.exists()) _ecCustom = snap.data().list || {};
  } catch(e) { console.warn('[earnings] load custom:', e.message); }
}
async function _ecSaveCustom() {
  if (window.IS_DEMO || !currentUser) {
    try { localStorage.setItem('ec_custom_' + (currentUser || 'anon'), JSON.stringify(_ecCustom)); } catch(_) {}
    return;
  }
  try { await setFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'earningsList'), { list: _ecCustom }); }
  catch(e) { console.warn('[earnings] save custom:', e.message); }
}

// Mode d'affichage choisi : mémorisé par user en localStorage.
function _ecLoadMode() {
  try { return localStorage.getItem('ec_mode_' + (currentUser || 'anon')) || 'popular'; } catch(_) { return 'popular'; }
}
function _ecSaveMode(m) {
  try { localStorage.setItem('ec_mode_' + (currentUser || 'anon'), m); } catch(_) {}
}

// Le choix de liste n'est proposé qu'une seule fois. Une fois fait, on
// l'enregistre et on n'affiche plus le sélecteur à l'entrée de la section
// (rechangeable via le bouton « Changer la liste » → ecOpenChooser).
function _ecChosen() {
  try { return localStorage.getItem('ec_chosen_' + (currentUser || 'anon')) === '1'; } catch(_) { return false; }
}
function _ecSaveChosen() {
  try { localStorage.setItem('ec_chosen_' + (currentUser || 'anon'), '1'); } catch(_) {}
}

async function _ecFetchEarnings() {
  const syms = _ecDisplaySymbols();
  if (!syms.length) { _ecItems = _ecMergeSeen([]); return; }
  const today = new Date();
  const from = _ecDateStr(today);
  const to   = _ecDateStr(new Date(today.getTime() + 120 * 86400 * 1000));
  let fetched = [];
  try {
    const url = WORKER_URL + '/earnings?symbols=' + encodeURIComponent(syms.join(',')) + '&from=' + from + '&to=' + to;
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    fetched = Array.isArray(j.items) ? j.items : [];
  } catch(e) { console.warn('[earnings] fetch:', e.message); }
  _ecItems = _ecMergeSeen(fetched);
}

// Fusionne les earnings fraîchement récupérés avec un cache local (par uid).
// Permet de conserver le mois précédent : une date qui passe reste en cache
// même quand Yahoo renvoie ensuite la date du trimestre suivant.
function _ecMergeSeen(fetched) {
  const key = 'ec_seen3_' + (currentUser || 'anon');   // bump = purge ancien cache sans name/domain
  const seen = {};
  try {
    (JSON.parse(localStorage.getItem(key) || '[]') || []).forEach(it => { seen[_ecNorm(it.symbol) + '|' + it.date] = it; });
  } catch(_) {}
  fetched.forEach(it => { seen[_ecNorm(it.symbol) + '|' + it.date] = it; });
  const lo = _ecDateStr(new Date(Date.now() - 40 * 86400 * 1000));
  const hi = _ecDateStr(new Date(Date.now() + 130 * 86400 * 1000));
  const list = Object.values(seen).filter(it => it.date >= lo && it.date <= hi);
  try { localStorage.setItem(key, JSON.stringify(list)); } catch(_) {}
  return list;
}

window.renderEarningsCalendar = async function(skipChooser) {
  if (!_ecLoaded && !_ecLoading) {
    _ecLoading = true;
    _ecRenderSkeleton();
    _ecListMode = _ecLoadMode();
    await _ecLoadSubs();
    await _ecLoadCustom();
    await _ecFetchEarnings();
    _ecLoaded = true;
    _ecLoading = false;
  }
  _ecRenderAgenda();
  _ecUpdateSubsCount();
  // Proposer le choix de liste une seule fois (1re entrée). Ensuite enregistré.
  if (!skipChooser && !_ecChosen()) ecOpenChooser();
};

function _ecRenderSkeleton() {
  const el = document.getElementById('ec-agenda');
  if (el) el.innerHTML = Array.from({ length: 5 }, () => '<div class="ec-agenda-skel"></div>').join('');
}

function _ecHourLabel(hour) {
  if (hour === 'bmo') return 'Avant ouverture';
  if (hour === 'amc') return 'Après clôture';
  if (hour === 'dmh') return 'En séance';
  return '';
}
function _ecFmtDayHeader(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return _EC_DOWS[dt.getDay()] + ' ' + d + ' ' + _EC_MONTHS[m - 1];
}
function _ecFmtDateFr(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return d + ' ' + _EC_MONTHS[m - 1] + ' ' + y;
}

// Logo société haute résolution : Clearbit (logo vectoriel/HD) → favicon Google
// → pastille-lettre. Domaine : Worker → nom→domaine → fallback → ticker.
function _ecLogoHtml(it) {
  const sym = (it.symbol || '').toUpperCase();
  const nm  = (it.name || sym).trim();
  const letter = (nm ? nm[0] : '?').toUpperCase().replace(/[^A-Z0-9]/, '?');
  let domain = it.domain || FALLBACK_DOMAINS[sym] || companyNameToDomain(it.name) || '';
  if (!domain) {
    const clean = sym.replace(/\.[A-Z]+$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    domain = clean ? clean + '.com' : '';
  }
  if (!domain) return '<span class="ec-logo ec-logo-ph">' + letter + '</span>';
  // Proxy Worker (cascade Clearbit→favicon + CORS) → canvas non taché pour
  // détecter la transparence. crossorigin obligatoire pour getImageData.
  return '<img class="ec-logo" loading="lazy" crossorigin="anonymous"'
    + ' src="' + WORKER_URL + '/logo?domain=' + encodeURIComponent(domain) + '"'
    + ' data-l="' + letter + '" alt="" onload="ecLogoBg(this)" onerror="ecLogoFallback(this)">';
}

// Détecte la transparence : si pixels alpha < 240 → fond blanc (logos noirs
// transparents type Nike). Logos à fond plein restent sans cadre.
window.ecLogoBg = function(img) {
  try {
    const n = 24;
    const c = document.createElement('canvas');
    c.width = n; c.height = n;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, n, n);
    const d = ctx.getImageData(0, 0, n, n).data;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 240) { img.classList.add('ec-logo--bg'); return; }
    }
  } catch (e) { /* canvas taché → laisse transparent */ }
};

// Repli : proxy échoue → pastille-lettre (la cascade Clearbit/favicon est
// gérée côté Worker).
window.ecLogoFallback = function(img) {
  const l = img.dataset.l || '?';
  img.outerHTML = '<span class="ec-logo ec-logo-ph">' + l + '</span>';
};

// Regroupe des earnings par jour. descending=true pour le volet « mois précédent ».
function _ecGroupHtml(items, descending) {
  const todayStr = _ecDateStr(new Date());
  const byDay = {};
  items.forEach(it => (byDay[it.date] = byDay[it.date] || []).push(it));
  let days = Object.keys(byDay).sort();
  if (descending) days.reverse();
  return days.map(ds => {
    const rows = byDay[ds]
      .sort((a, b) => (a.name || a.symbol).localeCompare(b.name || b.symbol))
      .map(it => _ecRowHtml(it)).join('');
    const isToday = ds === todayStr;
    return '<div class="ec-day">'
      + '<div class="ec-day-head">' + _ecFmtDayHeader(ds)
      + (isToday ? '<span class="ec-day-today">Aujourd\'hui</span>' : '')
      + '<span class="ec-day-count">' + byDay[ds].length + '</span></div>'
      + '<div class="ec-day-rows">' + rows + '</div></div>';
  }).join('');
}

// Items à afficher selon le mode courant : le cache local (_ecMergeSeen) peut
// retenir des titres d'un autre mode, on filtre donc sur la liste affichée.
function _ecVisibleItems() {
  const allow = new Set(_ecDisplaySymbols().map(_ecNorm));
  return _ecItems.filter(it => allow.has(_ecNorm(it.symbol)));
}

function _ecRenderAgenda() {
  const el = document.getElementById('ec-agenda');
  if (!el) return;
  const todayStr = _ecDateStr(new Date());
  const up = _ecVisibleItems().filter(it => it.date >= todayStr);
  el.innerHTML = up.length ? _ecGroupHtml(up, false)
    : '<div class="ec-agenda-empty">Aucune publication de résultats à venir pour les titres affichés.</div>';
}

// Volet « mois précédent » : résultats déjà publiés conservés en cache local.
function _ecRenderPrev() {
  const panel = document.getElementById('ec-prev-panel');
  if (!panel) return;
  const todayStr = _ecDateStr(new Date());
  const lo = _ecDateStr(new Date(Date.now() - 31 * 86400 * 1000));
  const past = _ecVisibleItems().filter(it => it.date >= lo && it.date < todayStr);
  panel.innerHTML = past.length ? _ecGroupHtml(past, true)
    : '<div class="ec-agenda-empty">Aucun résultat sur le mois précédent. Cette section se remplit au fil du temps (cache local).</div>';
}

window.ecTogglePrev = function() {
  const panel = document.getElementById('ec-prev-panel');
  const btn = document.getElementById('ec-prev-toggle');
  if (panel.hasAttribute('hidden')) {
    _ecRenderPrev();
    panel.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('open');
  } else {
    panel.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('open');
  }
};

function _ecRowHtml(it) {
  const sym = it.symbol;
  const cat = _ecCategory(sym);
  const subbed = !!_ecSubs[_ecNorm(sym)];
  const hour = _ecHourLabel(it.hour);
  const eps = it.epsEst != null ? 'BPA est. ' + Number(it.epsEst).toFixed(2) : '';
  const meta = [hour, eps].filter(Boolean).join(' · ') || (it.estimated ? 'Date estimée' : '');
  const name = it.name || sym;
  return '<div class="ec-row">'
    + '<button class="ec-row-main" onclick="ecOpenSymbol(\'' + sym.replace(/'/g,'') + '\',\'' + it.date + '\')">'
    + '<span class="ec-dot ec-dot-' + cat + '"></span>'
    + _ecLogoHtml(it)
    + '<span class="ec-row-id"><span class="ec-row-name">' + name + '</span><span class="ec-row-tk">' + sym + '</span></span>'
    + (meta ? '<span class="ec-row-meta">' + meta + '</span>' : '')
    + '</button>'
    + _ecBellBtn(sym, name, subbed)
    + '</div>';
}

let _ecDetailSym = null;

function _ecFmtEps(v) { return v == null ? '—' : Number(v).toFixed(2); }
function _ecFmtRev(v) { return v == null ? '—' : (v >= 1e9 ? (v/1e9).toFixed(1) + ' Md' : (v/1e6).toFixed(0) + ' M'); }
function _ecQLabel(l) { const m = /^([1-4])Q(\d{4})$/.exec(l || ''); return m ? ('T' + m[1] + ' ' + m[2]) : (l || ''); }

window.ecOpenSymbol = function(sym, ds) {
  const it = _ecItems.find(e => _ecNorm(e.symbol) === _ecNorm(sym) && e.date === ds) || { symbol: sym, date: ds, hour: '' };
  const subbed = !!_ecSubs[_ecNorm(sym)];
  const hour = _ecHourLabel(it.hour);
  const sub = _ecFmtDateFr(it.date) + (hour ? ' · ' + hour : '') + (it.estimated ? ' · date estimée' : '');
  _ecDetailSym = _ecNorm(sym);
  const body = document.getElementById('ec-detail-body');
  body.innerHTML = '<div class="ec-modal-head"><div class="ec-modal-id">' + _ecLogoHtml(it)
    + '<div><div class="ec-modal-name" id="ec-detail-name">' + (it.name || it.symbol) + '</div>'
    + '<div class="ec-modal-sub">Prochains résultats · ' + sub + '</div></div></div>'
    + '<button class="ec-modal-close" onclick="ecCloseDetail()" aria-label="Fermer">&times;</button></div>'
    + '<div class="ec-kpis">'
    + '<div class="ec-kpi"><div class="ec-kpi-label">BPA estimé</div><div class="ec-kpi-val mono">' + _ecFmtEps(it.epsEst) + '</div></div>'
    + '<div class="ec-kpi"><div class="ec-kpi-label">CA estimé</div><div class="ec-kpi-val mono">' + _ecFmtRev(it.revEst) + '</div></div>'
    + '</div>'
    + '<div id="ec-history" class="ec-history"><div class="ec-history-load">Chargement de l\'historique…</div></div>'
    + '<div class="ec-detail-actions">' + _ecBellBtn(it.symbol, it.symbol, subbed, true) + '</div>';
  _ecShowDetail();
  _ecLoadHistory(it.symbol);
};

// Historique 4 trimestres via le Worker (BPA réel vs estimé, surprise, CA).
async function _ecLoadHistory(symbol) {
  const el = document.getElementById('ec-history');
  if (!el) return;
  try {
    const r = await fetch(WORKER_URL + '/earnings-detail?symbol=' + encodeURIComponent(symbol), { signal: AbortSignal.timeout(12000) });
    const d = await r.json();
    if (_ecDetailSym !== _ecNorm(symbol)) return;       // modale changée entre-temps
    if (!d || !Array.isArray(d.history) || !d.history.length) {
      el.innerHTML = '<div class="ec-history-empty">Historique des résultats indisponible.</div>';
      return;
    }
    el.innerHTML = _ecHistoryHtml(d.history);
  } catch(e) {
    if (_ecDetailSym === _ecNorm(symbol)) el.innerHTML = '<div class="ec-history-empty">Historique des résultats indisponible.</div>';
  }
}

function _ecHistoryHtml(history) {
  const last4 = history.slice(-4);
  const rows = last4.map(q => {
    const has = q.epsAct != null && q.epsEst != null;
    const beat = has ? q.epsAct >= q.epsEst : null;
    const cls = beat == null ? '' : (beat ? 'ec-h-beat' : 'ec-h-miss');
    const surp = (has && q.epsEst !== 0) ? ((q.epsAct - q.epsEst) / Math.abs(q.epsEst) * 100) : null;
    const surpStr = surp == null ? '—' : (surp >= 0 ? '+' : '') + surp.toFixed(0) + '%';
    return '<tr><td class="ec-h-q">' + _ecQLabel(q.label) + '</td>'
      + '<td class="ec-h-num">' + _ecFmtEps(q.epsAct) + '</td>'
      + '<td class="ec-h-num ec-h-muted">' + _ecFmtEps(q.epsEst) + '</td>'
      + '<td class="ec-h-num ' + cls + '">' + surpStr + '</td>'
      + '<td class="ec-h-num ec-h-muted">' + _ecFmtRev(q.revAct) + '</td></tr>';
  }).join('');
  return '<div class="ec-history-title">Résultats des 4 derniers trimestres</div>'
    + '<table class="ec-history-tbl"><thead><tr>'
    + '<th>Trim.</th><th>BPA</th><th>Est.</th><th>Surprise</th><th>CA</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>';
}

// Bouton cloche abonner/désabonner. big=true → version pleine largeur (détail).
function _ecBellBtn(sym, name, subbed, big) {
  const s = sym.replace(/'/g, '');
  const n = (name || sym).replace(/'/g, '');
  const cls = 'ec-bell' + (subbed ? ' ec-bell-on' : '') + (big ? ' ec-bell-big' : '');
  const fill = subbed ? 'currentColor' : 'none';
  const bell = '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + fill + '" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  return '<button class="' + cls + '" onclick="ecToggleSub(\'' + s + '\',\'' + n + '\')" aria-pressed="' + (subbed ? 'true' : 'false') + '" aria-label="' + (subbed ? 'Se désabonner de ' : 'S\'abonner à ') + s + '">' + bell + (big ? '<span>' + (subbed ? 'Abonné · ne plus suivre' : 'M\'alerter à la publication') + '</span>' : '') + '</button>';
}

function _ecShowDetail() { document.getElementById('ec-detail-overlay').classList.add('open'); }
window.ecCloseDetail = function() { document.getElementById('ec-detail-overlay').classList.remove('open'); };

window.ecToggleSub = async function(sym, name) {
  const s = _ecNorm(sym);
  if (window.IS_DEMO) {
    _showChatToast({ icon: IC.bell, title: 'Mode démo', msg: 'Créez un compte pour suivre les résultats.' });
    return;
  }
  const subbed = !!_ecSubs[s];
  try {
    if (subbed) {
      delete _ecSubs[s];
      await setFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'earningsSubs'), { subs: _ecSubs });
      await deleteFirestoreDoc(firestoreDoc(db, 'earningsSubscribers', s, 'users', currentUser)).catch(() => {});
      _showChatToast({ icon: IC.bellOff || IC.bell, title: 'Désabonné', msg: s + ' retiré de vos alertes.' });
    } else {
      _ecSubs[s] = { name: name || s };
      await setFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'earningsSubs'), { subs: _ecSubs });
      await setFirestoreDoc(firestoreDoc(db, 'earningsSubscribers', s, 'users', currentUser), { name: name || s, at: Date.now() });
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        try { await requestPushPermission(); } catch(_) {}
      } else { initPush(currentUser).catch(() => {}); }
      _showChatToast({ icon: IC.bell, title: 'Abonné', msg: 'Notification le jour des résultats de ' + s + '.' });
    }
    await _ecFetchEarnings();      // le nouveau titre peut avoir une date hors liste actuelle
    _ecRenderAgenda();
    _ecUpdateSubsCount();
    // Rafraîchit la liste des suivis si la modale est ouverte dessus.
    if (document.getElementById('ec-detail-overlay').classList.contains('open') && document.getElementById('ec-subs-modal-list')) ecOpenSubs();
  } catch(e) {
    console.warn('[earnings] toggle sub:', e.message);
    _showChatToast({ icon: IC.bell, title: 'Erreur', msg: 'Action impossible. Réessayez.' });
  }
};

function _ecUpdateSubsCount() {
  const el = document.getElementById('ec-subs-count');
  if (!el) return;
  const n = _ecDisplaySymbols().length;
  el.textContent = n ? ' (' + n + ')' : '';
}

// Zone d'un symbole (suffixe d'échange Yahoo) : us | eu | other.
function _ecRegion(sym) {
  const s = (sym || '').toUpperCase();
  if (/\.(PA|AS|DE|F|SW|L|MI|MC|BR|VI|LS|HE|ST|OL|CO|IR)$/.test(s)) return 'eu';
  if (!s.includes('.')) return 'us';            // NYSE/Nasdaq (+ ADR) = pas de suffixe
  return 'other';                               // Asie & reste du monde
}

let _ecUniverseFilter = 'all';
let _ecUniverseQuery = '';

// Map symbole → meilleur item connu (nom/logo/prochaine date).
function _ecUniverseBySym() {
  const bySym = {};
  _ecItems.forEach(it => {
    const k = _ecNorm(it.symbol);
    if (!bySym[k] || it.date < bySym[k].date) bySym[k] = it;
  });
  return bySym;
}

function _ecUniRow(sym, it, subbed) {
  const name = (it && it.name) || sym;
  const when = it ? _ecFmtDateFr(it.date) : 'Aucune date annoncée';
  return '<div class="ec-subrow">' + _ecLogoHtml(it || { symbol: sym, name })
    + '<div class="ec-subrow-info"><span class="ec-subrow-sym">' + name + '</span>'
    + '<span class="ec-subrow-when">' + sym + ' · ' + when + '</span></div>'
    + _ecBellBtn(sym, name, subbed) + '</div>';
}

function _ecRenderUniverseList() {
  const el = document.getElementById('ec-universe-list');
  if (!el) return;
  const bySym = _ecUniverseBySym();
  const q = _ecUniverseQuery;
  const syms = _ecDisplaySymbols()
    .filter(s => _ecUniverseFilter === 'all' || _ecRegion(s) === _ecUniverseFilter)
    .filter(s => !q || s.toLowerCase().includes(q) || ((bySym[s] && bySym[s].name) || '').toLowerCase().includes(q))
    .sort((a, b) => ((bySym[a] && bySym[a].name) || a).localeCompare((bySym[b] && bySym[b].name) || b));
  let html = syms.map(s => _ecUniRow(s, bySym[s], !!_ecSubs[s])).join('');
  if (!syms.length) html = '<div class="ec-subs-empty">Aucun titre dans la liste pour cette recherche.</div>';
  // Recherche en ligne pour suivre un titre hors univers par défaut.
  if (q.length >= 2) {
    html += '<button class="ec-region-btn ec-uni-online" onclick="ecUniverseOnline()">Rechercher « ' + q + ' » en ligne</button>';
  }
  el.innerHTML = html;
}

window.ecSetRegion = function(r) {
  _ecUniverseFilter = r;
  document.querySelectorAll('.ec-region-btn[data-r]').forEach(b => b.classList.toggle('active', b.dataset.r === r));
  _ecRenderUniverseList();
};

window.ecUniverseSearch = function(v) {
  _ecUniverseQuery = (v || '').trim().toLowerCase();
  _ecRenderUniverseList();
};

// Recherche web (fetchSuggestions) pour suivre un titre absent de l'univers.
window.ecUniverseOnline = async function() {
  const el = document.getElementById('ec-universe-list');
  if (!el || !_ecUniverseQuery) return;
  el.innerHTML = '<div class="ec-search-loading">Recherche en ligne…</div>';
  try {
    const sugg = await fetchSuggestions(_ecUniverseQuery);
    if (!sugg.length) { el.innerHTML = '<div class="ec-subs-empty">Aucun résultat en ligne.</div>'; return; }
    el.innerHTML = sugg.slice(0, 8).map(s => {
      const sym = _ecNorm(s.symbol);
      return _ecUniRow(s.symbol, { symbol: s.symbol, name: s.name }, !!_ecSubs[sym]);
    }).join('');
  } catch(e) { el.innerHTML = '<div class="ec-subs-empty">Erreur de recherche.</div>'; }
};

// ── Sélecteur de liste (affiché à chaque entrée dans la section) ────────────
window.ecOpenChooser = function() {
  const body = document.getElementById('ec-detail-body');
  if (!body) return;
  const popN = _EC_POPULAR.length;
  const customN = Object.keys(_ecCustom).length;
  const customCard = customN > 0
    ? '<div class="ec-choice-actions">'
        + '<button class="ec-choice-go" onclick="ecApplyMode(\'custom\')">Afficher ma liste (' + customN + ')</button>'
        + '<button class="ec-choice-edit" onclick="ecOpenCustomBuilder()">Modifier</button></div>'
    : '<button class="ec-choice-go" onclick="ecOpenCustomBuilder()">Composer ma liste</button>';
  body.innerHTML =
    '<div class="ec-modal-head"><div><div class="ec-modal-name ec-modal-name--plain">Calendrier des résultats</div>'
    + '<div class="ec-modal-sub">Choisissez les entreprises à afficher.</div></div>'
    + '<button class="ec-modal-close" onclick="ecCloseDetail()" aria-label="Fermer">&times;</button></div>'
    + '<div class="ec-choices">'
    + '<button class="ec-choice' + (_ecListMode === 'popular' ? ' ec-choice-active' : '') + '" onclick="ecApplyMode(\'popular\')">'
    +   '<div class="ec-choice-ic">🌐</div>'
    +   '<div class="ec-choice-txt"><div class="ec-choice-title">Sélection Capital Board</div>'
    +   '<div class="ec-choice-desc">' + popN + ' grandes valeurs mondiales + vos titres détenus et suivis.</div></div></button>'
    + '<div class="ec-choice ec-choice-static' + (_ecListMode === 'custom' ? ' ec-choice-active' : '') + '">'
    +   '<div class="ec-choice-ic">⭐</div>'
    +   '<div class="ec-choice-txt"><div class="ec-choice-title">Ma liste</div>'
    +   '<div class="ec-choice-desc">' + (customN ? customN + ' entreprise' + (customN > 1 ? 's' : '') + ' dans votre liste.' : 'Composez votre propre liste d\'entreprises.') + '</div>'
    +   customCard + '</div></div>'
    + '</div>';
  _ecShowDetail();
};

window.ecApplyMode = async function(mode) {
  _ecListMode = mode;
  _ecSaveMode(mode);
  _ecSaveChosen();
  ecCloseDetail();
  _ecRenderSkeleton();
  await _ecFetchEarnings();   // l'univers interrogé dépend du mode
  _ecRenderAgenda();
  _ecUpdateSubsCount();
};

// ── Constructeur de liste personnalisée ─────────────────────────────────────
let _ecBuilderQuery = '';
let _ecBuilderResults = [];

window.ecOpenCustomBuilder = function() {
  _ecBuilderQuery = '';
  _ecBuilderResults = [];
  const body = document.getElementById('ec-detail-body');
  if (!body) return;
  body.innerHTML =
    '<div class="ec-modal-head"><div><div class="ec-modal-name ec-modal-name--plain">Ma liste</div>'
    + '<div class="ec-modal-sub">Ajoutez les entreprises à suivre dans le calendrier.</div></div>'
    + '<button class="ec-modal-close" onclick="ecOpenChooser()" aria-label="Retour">&times;</button></div>'
    + '<div class="ec-searchbar" style="margin-bottom:14px">'
    +   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text3);flex-shrink:0" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    +   '<input id="ec-builder-input" type="text" autocomplete="off" placeholder="Rechercher une entreprise ou un ticker" oninput="ecBuilderSearch(this.value)" aria-label="Rechercher une entreprise"></div>'
    + '<div id="ec-builder-results"></div>'
    + '<div class="ec-builder-mine-h">Ma liste <span id="ec-builder-count"></span></div>'
    + '<div id="ec-builder-mine" class="ec-subs-list"></div>'
    + '<button class="ec-choice-go ec-builder-done" onclick="ecApplyMode(\'custom\')">Afficher le calendrier</button>';
  _ecRenderBuilderMine();
  _ecShowDetail();
};

function _ecRenderBuilderMine() {
  const el  = document.getElementById('ec-builder-mine');
  const cnt = document.getElementById('ec-builder-count');
  if (!el) return;
  const syms = Object.keys(_ecCustom).sort((a, b) => (_ecCustom[a].name || a).localeCompare(_ecCustom[b].name || b));
  if (cnt) cnt.textContent = syms.length ? '(' + syms.length + ')' : '';
  if (!syms.length) { el.innerHTML = '<div class="ec-subs-empty">Aucune entreprise. Recherchez-en une ci-dessus.</div>'; return; }
  const bySym = _ecUniverseBySym();
  el.innerHTML = syms.map(s => _ecCustomRow(s, bySym[s] || { symbol: s, name: _ecCustom[s].name }, true)).join('');
}

function _ecRenderBuilderResults() {
  const el = document.getElementById('ec-builder-results');
  if (!el) return;
  if (!_ecBuilderQuery) { el.innerHTML = ''; return; }
  if (!_ecBuilderResults.length) { el.innerHTML = '<div class="ec-subs-empty">Aucun résultat. Tapez un nom ou un ticker.</div>'; return; }
  el.innerHTML = _ecBuilderResults.map(it => _ecCustomRow(it.symbol, it, !!_ecCustom[_ecNorm(it.symbol)])).join('');
}

// Ligne avec bouton ajouter/retirer (liste perso).
function _ecCustomRow(sym, it, inList) {
  const name = (it && it.name) || sym;
  const when = (it && it.date) ? _ecFmtDateFr(it.date) : '';
  const s = sym.replace(/'/g, '');
  const n = (name || sym).replace(/'/g, '');
  const btn = '<button class="ec-add-btn' + (inList ? ' ec-add-on' : '') + '" onclick="ecToggleCustom(\'' + s + '\',\'' + n + '\')" aria-pressed="' + (inList ? 'true' : 'false') + '" aria-label="' + (inList ? 'Retirer ' : 'Ajouter ') + s + '">'
    + (inList ? '✓' : '+') + '</button>';
  return '<div class="ec-subrow">' + _ecLogoHtml(it || { symbol: sym, name })
    + '<div class="ec-subrow-info"><span class="ec-subrow-sym">' + name + '</span>'
    + '<span class="ec-subrow-when">' + sym + (when ? ' · ' + when : '') + '</span></div>' + btn + '</div>';
}

window.ecBuilderSearch = async function(v) {
  _ecBuilderQuery = (v || '').trim();
  const q = _ecBuilderQuery.toLowerCase();
  if (!q) { _ecBuilderResults = []; _ecRenderBuilderResults(); return; }
  // 1) Local : univers populaire + items déjà connus.
  const bySym = _ecUniverseBySym();
  const seen = new Set();
  const local = [];
  _EC_POPULAR.forEach(sym => {
    const k = _ecNorm(sym);
    if (seen.has(k)) return;
    const it = bySym[k] || { symbol: k, name: k };
    if (k.toLowerCase().includes(q) || (it.name || k).toLowerCase().includes(q)) { seen.add(k); local.push(it); }
  });
  _ecBuilderResults = local.slice(0, 8);
  _ecRenderBuilderResults();
  // 2) Recherche en ligne si peu de résultats locaux.
  if (q.length >= 2 && local.length < 5) {
    try {
      const sugg = await fetchSuggestions(_ecBuilderQuery);
      if (_ecBuilderQuery.toLowerCase() !== q) return; // requête changée entre-temps
      sugg.forEach(s2 => {
        const k = _ecNorm(s2.symbol);
        if (_ecIsEtf(s2)) return;                       // actions seulement, pas d'ETF
        if (!seen.has(k)) { seen.add(k); _ecBuilderResults.push({ symbol: s2.symbol, name: s2.name }); }
      });
      _ecBuilderResults = _ecBuilderResults.slice(0, 10);
      _ecRenderBuilderResults();
    } catch(_) {}
  }
};

window.ecToggleCustom = async function(sym, name) {
  const s = _ecNorm(sym);
  if (_ecCustom[s]) delete _ecCustom[s];
  else _ecCustom[s] = { name: name || s };
  await _ecSaveCustom();
  _ecRenderBuilderMine();
  _ecRenderBuilderResults();
};

// Modale "Entreprises ciblées" : univers interrogé, filtrable par zone + recherche.
window.ecOpenSubs = function() {
  _ecUniverseQuery = '';
  const total = _ecDisplaySymbols().length;
  const REGIONS = [['all','Tous'], ['us','USA'], ['eu','EU'], ['other','Autre']];
  const bar = '<div class="ec-region-bar">' + REGIONS.map(([r, lbl]) =>
    '<button class="ec-region-btn' + (r === _ecUniverseFilter ? ' active' : '') + '" data-r="' + r + '" onclick="ecSetRegion(\'' + r + '\')">' + lbl + '</button>'
  ).join('') + '</div>';
  const search = '<div class="ec-searchbar" style="margin-bottom:14px">'
    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text3);flex-shrink:0" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    + '<input type="text" autocomplete="off" placeholder="Rechercher une entreprise ou un ticker" oninput="ecUniverseSearch(this.value)" aria-label="Rechercher dans les entreprises ciblées"></div>';
  const body = document.getElementById('ec-detail-body');
  const editBtn = '<button class="ec-choice-edit" style="width:100%;margin-bottom:14px" onclick="ecOpenCustomBuilder()">'
    + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
    + 'Modifier ma liste</button>';
  body.innerHTML = '<div class="ec-modal-head"><div><div class="ec-modal-name ec-modal-name--plain">Entreprises ciblées</div>'
    + '<div class="ec-modal-sub">' + total + ' titres interrogés par l\'app. Cloche = alerte résultats.</div></div>'
    + '<button class="ec-modal-close" onclick="ecCloseDetail()" aria-label="Fermer">&times;</button></div>'
    + editBtn + search + bar + '<div id="ec-universe-list" class="ec-subs-list"></div>';
  _ecRenderUniverseList();
  _ecShowDetail();
};

window.ecSearch = async function() {
  const inp = document.getElementById('ec-search-input');
  const out = document.getElementById('ec-search-result');
  const q = (inp.value || '').trim();
  if (!q) return;
  out.innerHTML = '<div class="ec-search-loading">Recherche…</div>';
  try {
    const sugg = await fetchSuggestions(q);
    if (!sugg.length) { out.innerHTML = '<div class="ec-search-empty">Aucun titre trouvé pour « ' + q +' ».</div>'; return; }
    out.innerHTML = sugg.slice(0, 5).map(s => {
      const sym = _ecNorm(s.symbol);
      const subbed = !!_ecSubs[sym];
      return '<div class="ec-subrow"><div class="ec-subrow-info"><span class="ec-subrow-sym">' + s.symbol + '</span>'
        + '<span class="ec-subrow-when">' + (s.name || '') + (s.exchange ? ' · ' + s.exchange : '') + '</span></div>'
        + _ecBellBtn(s.symbol, s.name, subbed) + '</div>';
    }).join('');
  } catch(e) {
    out.innerHTML = '<div class="ec-search-empty">Erreur de recherche. Réessayez.</div>';
  }
};

// ─── CSV IMPORT ─────────────────────────────────────
let pendingImportRows = [];

function importCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) { alert('Fichier CSV vide ou invalide.'); return; }

    // Detect separator
    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].toLowerCase().replace(/"/g,'').split(sep).map(h => h.trim());

    // Try to map columns
    const colDate = headers.findIndex(h => h.includes('date'));
    const colType = headers.findIndex(h => h.includes('type') || h.includes('sens') || h.includes('operation') || h.includes('opération'));
    const colTicker = headers.findIndex(h => h.includes('ticker') || h.includes('symbole') || h.includes('isin') || h.includes('code'));
    const colName = headers.findIndex(h => h.includes('nom') || h.includes('name') || h.includes('libellé') || h.includes('libelle') || h.includes('valeur'));
    const colQty = headers.findIndex(h => h.includes('qté') || h.includes('quantité') || h.includes('quantite') || h.includes('qty') || h.includes('quantity'));
    const colPrice = headers.findIndex(h => h.includes('prix') || h.includes('price') || h.includes('cours') || h.includes('buying'));
    const colBuyPrice = headers.findIndex(h => h.includes('pru') || h.includes('buyingprice') || h.includes('buyingprice') || h.includes('prix achat') || h.includes('buy'));

    pendingImportRows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].replace(/"/g,'').split(sep).map(v => v.trim());
      if (vals.length < 3) continue;

      const row = {
        date: colDate >= 0 ? vals[colDate] : '',
        type: colType >= 0 ? vals[colType].toLowerCase() : 'buy',
        ticker: colTicker >= 0 ? vals[colTicker] : '',
        name: colName >= 0 ? vals[colName] : '',
        qty: parseFloat((colQty >= 0 ? vals[colQty] : '0').replace(',','.')),
        price: parseFloat((colPrice >= 0 ? vals[colPrice] : (colBuyPrice >= 0 ? vals[colBuyPrice] : '0')).replace(',','.'))
      };

      // Normalize type
      if (row.type.includes('achat') || row.type.includes('buy')) row.type = 'buy';
      else if (row.type.includes('vente') || row.type.includes('sell')) row.type = 'sell';
      else if (row.type.includes('versement') || row.type.includes('virement') || row.type.includes('deposit')) row.type = 'versement';

      // Normalize date (dd/mm/yyyy → yyyy-mm-dd)
      if (row.date && row.date.includes('/')) {
        const parts = row.date.split('/');
        if (parts.length === 3) {
          row.date = (parts[2].length === 2 ? '20' + parts[2] : parts[2]) + '-' + parts[1].padStart(2,'0') + '-' + parts[0].padStart(2,'0');
        }
      }

      if (row.qty > 0 && row.price > 0) pendingImportRows.push(row);
      else if (row.type === 'versement' && row.price > 0) { row.qty = 0; pendingImportRows.push(row); }
    }

    if (!pendingImportRows.length) { alert('Aucune transaction valide détectée dans le CSV.\n\nColonnes attendues : date, type (achat/vente), ticker, nom, quantité, prix'); return; }

    // Show preview modal
    const tbody = document.getElementById('csv-preview-tbody');
    tbody.innerHTML = pendingImportRows.map(r => {
      const cls = r.type === 'buy' ? 'badge-pos' : r.type === 'sell' ? 'badge-neg' : '';
      const label = r.type === 'buy' ? 'ACHAT' : r.type === 'sell' ? 'VENTE' : 'VERSEMENT';
      return '<tr>' +
        '<td style="font-size:11px" class="mono">' + (r.date || '—') + '</td>' +
        '<td><span class="' + cls + '" style="font-size:9px;padding:2px 6px">' + label + '</span></td>' +
        '<td style="font-size:11px" class="mono">' + r.ticker + '</td>' +
        '<td style="font-size:11px">' + r.name + '</td>' +
        '<td style="font-size:11px" class="mono">' + r.qty + '</td>' +
        '<td style="font-size:11px" class="mono">' + r.price.toFixed(2) + ' €</td>' +
        '</tr>';
    }).join('');
    document.getElementById('csv-import-status').textContent = pendingImportRows.length + ' opérations détectées';
    document.getElementById('csv-import-modal').classList.add('open');
  };
  reader.readAsText(file);
  event.target.value = ''; // reset so same file can be re-imported
}

function closeImportModal() {
  document.getElementById('csv-import-modal').classList.remove('open');
  pendingImportRows = [];
}

function confirmImport() {
  if (!pendingImportRows.length) return;

  // Sort by date to process chronologically
  const sorted = [...pendingImportRows].sort((a,b) => (a.date||'').localeCompare(b.date||''));

  const data = getPortfolio(currentUser);

  sorted.forEach(row => {
    if (row.type === 'versement') {
      const v = getVersements(currentUser);
      v.push({ amount: row.price, date: row.date });
      saveVersements(currentUser, v);
      return;
    }

    if (row.type === 'buy') {
      // Check if ticker already exists in portfolio
      const existing = data.find(r => r.ticker === row.ticker);
      if (existing) {
        const newQty = existing.qty + row.qty;
        existing.buyPrice = Math.round(((existing.qty * existing.buyPrice + row.qty * row.price) / newQty) * 10000) / 10000;
        existing.qty = Math.round(newQty * 10000) / 10000;
      } else {
        data.push({
          name: row.name || row.ticker,
          ticker: row.ticker,
          qty: row.qty,
          buyPrice: row.price,
          buyDate: row.date,
          currentPrice: row.price, // will be updated on refresh
          quoteType: 'EQUITY',
          addedAt: new Date().toISOString()
        });
      }
      logTransaction(currentUser, { type:'buy', ticker: row.ticker, name: row.name, qty: row.qty, price: row.price, date: row.date });
    }

    if (row.type === 'sell') {
      const existing = data.find(r => r.ticker === row.ticker);
      const buyPrice = existing ? existing.buyPrice : row.price;
      const realizedPnl = Math.round((row.price - buyPrice) * row.qty * 100) / 100;
      logTransaction(currentUser, { type:'sell', ticker: row.ticker, name: row.name, qty: row.qty, price: row.price, date: row.date, buyPrice, realizedPnl });

      if (existing) {
        if (row.qty >= existing.qty) {
          const idx = data.indexOf(existing);
          data.splice(idx, 1);
        } else {
          existing.qty = Math.round((existing.qty - row.qty) * 10000) / 10000;
        }
      }
    }
  });

  savePortfolio(currentUser, data);
  closeImportModal();
  renderPortfolio();
  // Trigger price refresh for new tickers
  setTimeout(refreshPrices, 500);
  alert(sorted.length + ' opérations importées avec succès !');
}

// Backfill: if a portfolio row was added before the transaction log existed,
// inject a synthetic 'buy' so the history graph can reconstruct properly
function ensureBuyTxExists(user, row) {
  const txs = getTransactions(user);
  const hasBuy = txs.some(tx => tx.type === 'buy' && tx.ticker === row.ticker);
  if (!hasBuy) {
    const date = row.buyDate || row.addedAt?.slice(0,10) || new Date().toISOString().slice(0,10);
    txs.push({ type: 'buy', ticker: row.ticker, name: row.name || row.ticker, qty: row.qty, price: row.buyPrice, date });
    saveTransactions(user, txs);
  }
}

// Rebuild inventory at any date from transaction log
// Returns { ticker: qty } at given date
function inventoryAtDate(user, dateStr) {
  const txs = getTransactions(user);
  const inv = {};
  for (const tx of txs) {
    if (tx.date <= dateStr) {
      if (tx.type === 'buy') {
        inv[tx.ticker] = (inv[tx.ticker] || 0) + tx.qty;
      } else if (tx.type === 'sell') {
        inv[tx.ticker] = (inv[tx.ticker] || 0) - tx.qty;
        if (inv[tx.ticker] <= 0.0001) delete inv[tx.ticker];
      }
    }
  }
  return inv;
}

// Also build inventory from current portfolio data + buyDates as fallback
// (for users who had positions before transaction log existed)
function inventoryAtDateFallback(data, dayTs, graphStart) {
  const inv = {};
  data.forEach(row => {
    const buyTs = row.buyDate
      ? Math.floor(new Date(row.buyDate + 'T12:00:00').getTime() / 1000)
      : graphStart;
    if (buyTs <= dayTs) {
      inv[row.ticker] = (inv[row.ticker] || 0) + row.qty;
    }
  });
  return inv;
}

async function buildPortfolioHistory(data, graphStart, graphEnd) {
  // Collect all tickers: from current portfolio + from transaction history
  const txs = getTransactions(currentUser);
  const allTickers = new Set(data.map(r => r.ticker));
  txs.forEach(tx => allTickers.add(tx.ticker));
  const tickers = [...allTickers].filter(Boolean);

  if (!tickers.length) return [];

  const daysDuration = Math.ceil((graphEnd - graphStart) / 86400);
  let interval, range;
  if      (daysDuration <= 35)   { interval = '1d';  range = '1mo'; }
  else if (daysDuration <= 100)  { interval = '1d';  range = '3mo'; }
  else if (daysDuration <= 200)  { interval = '1d';  range = '6mo'; }
  else if (daysDuration <= 400)  { interval = '1d';  range = '1y';  }
  else if (daysDuration <= 1200) { interval = '1wk'; range = '3y';  }
  else if (daysDuration <= 2000) { interval = '1mo'; range = '5y';  }
  else                           { interval = '1mo'; range = 'max'; }

  const priceMap = {};
  await Promise.all(tickers.map(async ticker => {
    try {
      const yahooTicker = resolveToYahooTicker(ticker);
      const raw = await fetchWithFallback(
        'https://query1.finance.yahoo.com/v8/finance/chart/'
        + encodeURIComponent(yahooTicker)
        + '?interval=' + interval + '&range=' + range
      );
      const d   = JSON.parse(raw);
      const res = d.chart && d.chart.result && d.chart.result[0];
      if (!res) return;
      const ts     = res.timestamp;
      const closes = res.indicators.quote[0].close;
      priceMap[ticker] = ts.map((t, i) => ({ ts: t, close: closes[i] }))
                           .filter(p => p.close != null);
    } catch(e) { priceMap[ticker] = []; }
  }));

  // Complétude : un ticker sans aucun prix (fetch échoué) fausse la courbe.
  // Le caller s'en sert pour ne PAS mettre en cache une courbe incomplète.
  buildPortfolioHistory._complete = tickers.every(t => (priceMap[t] || []).length > 0);

  // For short periods (intraday), use Yahoo timestamps directly instead of generating daily timeline
  const isIntraday = daysDuration <= 6;

  let timeline;
  if (isIntraday) {
    // Merge all timestamps from all tickers
    const allTs = new Set();
    for (const ticker of tickers) {
      (priceMap[ticker] || []).forEach(p => allTs.add(p.ts));
    }
    timeline = [...allTs].sort((a, b) => a - b).filter(t => t >= graphStart);
  } else {
    timeline = [];
    const cursor = new Date(graphStart * 1000);
    cursor.setHours(18, 0, 0, 0);
    const endDate = new Date(graphEnd * 1000);
    while (cursor <= endDate) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) {
        timeline.push(Math.floor(cursor.getTime() / 1000));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  if (!timeline.length) return [];

  function getHistoricalClose(ticker, ts) {
    const prices = priceMap[ticker] || [];
    let last = null;
    for (const p of prices) {
      if (p.ts <= ts + 86400) last = p.close;
      else break;
    }
    return last;
  }

  const hasTxLog = txs.length > 0;

  const dataset = [];
  for (const dayTs of timeline) {
    let inventory;
    if (hasTxLog) {
      // Use transaction log: accurate with buy+sell history
      const dateStr = new Date(dayTs * 1000).toISOString().slice(0, 10);
      inventory = inventoryAtDate(currentUser, dateStr);
    } else {
      // Fallback: use current portfolio buyDate (legacy, no sell history)
      inventory = inventoryAtDateFallback(data, dayTs, graphStart);
    }

    let valeurTotale = 0;
    for (const [ticker, qty] of Object.entries(inventory)) {
      if (qty <= 0) continue;
      const close = getHistoricalClose(ticker, dayTs);
      if (close != null) {
        valeurTotale += qty * close;
      }
    }

    const dt = new Date(dayTs * 1000);
    dataset.push({
      date:         dt.toISOString().slice(0, 10),
      valeurTotale: +valeurTotale.toFixed(2),
      ts:           dayTs,
    });
  }

  return dataset;
}

// Tooltip HTML externe du graphique portefeuille : permet d'afficher
// des icônes SVG (date, prix) que le tooltip canvas de Chart.js ne rend pas.
function portfolioChartTooltip(context) {
  const { chart, tooltip } = context;
  let el = document.getElementById('pf-chart-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pf-chart-tooltip';
    el.style.cssText = 'position:absolute;pointer-events:none;background:#10121c;' +
      'border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;' +
      'font-size:12px;opacity:0;transition:opacity .12s;z-index:50;' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.5);white-space:nowrap';
    const parent = chart.canvas.parentNode;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    parent.appendChild(el);
  }
  if (tooltip.opacity === 0) { el.style.opacity = 0; return; }

  const title = (tooltip.title && tooltip.title[0]) || '';
  let rows = '';
  (tooltip.dataPoints || []).forEach(dp => {
    const val = dp.parsed.y;
    if (val === null || val === undefined) return;
    const valStr = val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    if (dp.datasetIndex === 0) {
      rows += '<div style="display:flex;align-items:center;gap:6px;color:#edf0f7;margin-top:2px">' +
        IC.wallet + '<span>' + valStr + '</span></div>';
    } else {
      const isBuy = dp.datasetIndex === 1;
      rows += '<div style="display:flex;align-items:center;gap:6px;color:#edf0f7;margin-top:4px">' +
        (isBuy ? IC.dotGreen : IC.dotRed) +
        '<span>' + (isBuy ? 'Achat' : 'Vente') + ' · ' + valStr + '</span></div>';
    }
  });
  el.innerHTML = '<div style="display:flex;align-items:center;gap:6px;color:#8892a8;margin-bottom:4px">' +
    IC.calendar + '<span>' + title + '</span></div>' + rows;

  el.style.opacity = 1;
  el.style.left = (chart.canvas.offsetLeft + tooltip.caretX) + 'px';
  el.style.top  = (chart.canvas.offsetTop + tooltip.caretY) + 'px';
  el.style.transform = 'translate(-50%, calc(-100% - 10px))';
}

// TTL du cache de la courbe : court en séance (les cours bougent),
// long quand le marché est fermé (l'historique ne change plus).
function _curveCacheTTL() {
  const d = new Date();
  const day = d.getDay();   // 0 dim … 6 sam
  const h = d.getHours();   // heure locale (Europe/Paris attendu)
  const marketOpen = day >= 1 && day <= 5 && h >= 9 && h < 18;
  return marketOpen ? 5 * 60 * 1000 : 12 * 60 * 60 * 1000;
}

// ═══════════════════════════════════════════════════
//  ANIMATION D'ENTRÉE DE LA COURBE PORTEFEUILLE
//  1) la ligne (+ son dégradé) se trace de gauche à droite
//  2) une fois le tracé fini, les marqueurs achat/vente apparaissent
//     en cascade chronologique
//  Chart.js ne sait animer que point par point : on coupe donc son
//  animation (`animation: false`) et on pilote nous-mêmes le rendu
//  pour enchaîner les deux phases.
// ═══════════════════════════════════════════════════
const PF_REVEAL_LINE_MS  = 2000; // durée du tracé
const PF_REVEAL_DOT_MS   = 700;  // pop d'un marqueur
const PF_REVEAL_DOT_STEP = 150;  // décalage entre deux marqueurs
const PF_REVEAL_DOT_CAP  = 12;   // au-delà, plus de décalage (longs historiques)

// Animations d'entrée — tracé de la courbe et halo des badges +/- value.
// Elles jouent sur les affichages voulus (chargement de la page, changement de
// période) et jamais sur le rafraîchissement automatique des cours, qui
// reconstruit tableau et courbe toutes les 30 s.
//
// Le drapeau n'est baissé qu'une fois l'animation jouée EN ENTIER (fin du rAF
// dans pfRunReveal). Au chargement, renderPortfolio() est appelée plusieurs
// fois — données Firestore, taux de change, premier refresh des cours à
// t+500 ms — et renderPortfolioChart() est asynchrone : baisser le drapeau sur
// un autre critère (premier appel, ou début du refresh) le faisait tomber
// avant que la courbe soit prête, et le seul rendu visible s'affichait sans
// animation. Là, un re-rendu pendant le chargement relance le tracé au lieu de
// le supprimer, et une fois terminé plus rien ne bouge.
let _pfRevealArmed = true;

function _pfEaseInOutQuad(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; }
function _pfEaseOutBack(t)   { const c1 = 1.70158, c3 = c1 + 1;
                               return 1 + c3*Math.pow(t-1, 3) + c1*Math.pow(t-1, 2); }

// Masque la partie non encore tracée de la courbe et retient les marqueurs
// tant que la phase 1 n'est pas lancée.
const pfRevealPlugin = {
  id: 'pfReveal',
  beforeInit(chart) {
    // Posé avant le tout premier paint, sinon la courbe complète clignote.
    chart.$pfReveal = { line: 0, dotsStarted: false, clipped: false };
  },
  beforeDatasetDraw(chart, args) {
    const st = chart.$pfReveal;
    if (!st) return;
    if (args.index !== 0) return st.dotsStarted ? undefined : false;
    if (st.line >= 1) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top,
             (chartArea.right - chartArea.left) * st.line,
             chartArea.bottom - chartArea.top);
    ctx.clip();
    st.clipped = true;
  },
  afterDatasetDraw(chart, args) {
    const st = chart.$pfReveal;
    if (!st || args.index !== 0 || !st.clipped) return;
    chart.ctx.restore();
    st.clipped = false;
  },
};

// markerSets : index des datasets contenant les pastilles (achats, ventes).
function pfRunReveal(chart, markerSets) {
  const st = chart.$pfReveal;
  if (!st) return;

  // Rafraîchissement automatique : la courbe s'affiche telle quelle.
  if (!_pfRevealArmed) { chart.$pfReveal = null; chart.draw(); return; }

  // Rayon cible de chaque pastille, mélangées et triées par date.
  const dots = [];
  markerSets.forEach(di => {
    const meta = chart.getDatasetMeta(di);
    if (!meta) return;
    meta.data.forEach((pt, i) => {
      if (!pt.options.radius) return;   // pas de transaction à cet index
      dots.push({ pt, r: pt.options.radius, i });
    });
  });
  dots.sort((a, b) => a.i - b.i);

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { chart.$pfReveal = null; chart.draw(); return; }

  dots.forEach(d => { d.pt.options.radius = 0; });
  st.dotsStarted = true;

  const end = dots.length
    ? PF_REVEAL_LINE_MS + Math.min(dots.length - 1, PF_REVEAL_DOT_CAP) * PF_REVEAL_DOT_STEP + PF_REVEAL_DOT_MS
    : PF_REVEAL_LINE_MS;
  const t0 = performance.now();

  function frame(now) {
    // Chart détruit ou re-rendu entre deux frames : on abandonne.
    if (chart.$pfReveal !== st || !chart.ctx) return;
    const e = now - t0;
    st.line = _pfEaseInOutQuad(Math.min(e / PF_REVEAL_LINE_MS, 1));
    dots.forEach((d, k) => {
      const start = PF_REVEAL_LINE_MS + Math.min(k, PF_REVEAL_DOT_CAP) * PF_REVEAL_DOT_STEP;
      const t = Math.min(Math.max((e - start) / PF_REVEAL_DOT_MS, 0), 1);
      d.pt.options.radius = d.r * _pfEaseOutBack(t);
    });
    chart.draw();
    if (e < end) { requestAnimationFrame(frame); return; }
    // Jouée en entier : on désarme. Tant qu'elle ne l'a pas été, un re-rendu
    // pendant le chargement la relance plutôt que de la faire sauter.
    _pfRevealArmed = false;
    // Fin : on rend la main à Chart.js (hover, resize, tooltips).
    dots.forEach(d => { d.pt.options.radius = d.r; });
    chart.$pfReveal = null;
    chart.draw();
  }
  requestAnimationFrame(frame);
}

async function renderPortfolioChart() {
  const data = getPortfolio(currentUser);
  const card = document.getElementById('portfolio-chart-card');
  // Always show the chart
  card.style.display = 'block';

  const sub = document.getElementById('portfolio-chart-sub');
  // Spinner affiché seulement si on doit vraiment calculer (cache absent/périmé).
  const loader = document.getElementById('portfolio-chart-loader');

  try {
    const now = Math.floor(Date.now() / 1000);

    const periodOffsets = {
      '1d': 1*86400, '5d': 5*86400,
      '1mo': 30*86400, '3mo': 90*86400, '6mo': 180*86400,
      '1y': 365*86400, '3y': 3*365*86400, '5y': 5*365*86400, 'max': null
    };
    const offset = periodOffsets[portfolioPeriod];

    // Find oldest date from transactions or portfolio
    const txs = getTransactions(currentUser);
    let oldestTs = Infinity;
    txs.forEach(tx => {
      if (tx.date) {
        const ts = Math.floor(new Date(tx.date + 'T12:00:00').getTime() / 1000);
        if (ts < oldestTs) oldestTs = ts;
      }
    });
    data.forEach(row => {
      if (row.buyDate) {
        const ts = Math.floor(new Date(row.buyDate + 'T12:00:00').getTime() / 1000);
        if (ts < oldestTs) oldestTs = ts;
      }
    });
    if (oldestTs === Infinity) oldestTs = now - 30 * 86400; // default 1 month ago

    const periodStart = offset ? now - offset : oldestTs;
    const graphStart  = periodStart;

    // ── Cache courbe : affichage instantané au refresh / déverrouillage PIN ──
    // Signature : invalide le cache si le portefeuille ou les transactions changent.
    // `v` = version : bump pour invalider tous les vieux caches (ex. courbes
    // fausses buildées pendant l'ère proxies CORS morts → priceMap vides).
    const _sig = JSON.stringify({
      v: 2,
      p: data.map(r => r.ticker + ':' + r.qty).sort(),
      t: getTransactions(currentUser).length,
      per: portfolioPeriod,
    });
    const _cacheKey = 'pfcurve_' + (currentUser || 'anon');
    let dataset = null;
    let _fromCache = false;
    try {
      const c = JSON.parse(localStorage.getItem(_cacheKey) || 'null');
      if (c && c.sig === _sig && Array.isArray(c.dataset) && c.dataset.length
          && (Date.now() - c.ts) < _curveCacheTTL()) {
        dataset = c.dataset;   // cache frais → instant, aucun appel Yahoo
        _fromCache = true;
      }
    } catch(_) {}

    if (!dataset) {
      // Pas de cache exploitable → calcul Yahoo (avec spinner).
      sub.textContent = 'Chargement…';
      if (loader) loader.classList.add('show');
      const _bt = performance.now();
      dataset = await buildPortfolioHistory(data, graphStart, now);
      if (_debugOn()) console.log('%c[perf] buildPortfolioHistory (Yahoo) : '
        + Math.round(performance.now() - _bt) + ' ms', 'color:#f5b731');
      // On ne cache que si tous les tickers ont été récupérés : évite de figer
      // une courbe fausse (valeurs trop basses) quand un proxy/le Worker hoquette.
      if (buildPortfolioHistory._complete !== false) {
        try {
          localStorage.setItem(_cacheKey, JSON.stringify({ ts: Date.now(), sig: _sig, dataset }));
        } catch(_) {}
      }
    }

    // Cohérence courbe/chiffre : le dernier point colle à la valeur live du header.
    if (dataset.length) {
      let _liveVal = 0;
      data.forEach(r => { _liveVal += r.qty * r.currentPrice; });
      if (_liveVal > 0) {
        dataset = dataset.slice();
        dataset[dataset.length - 1] = Object.assign({}, dataset[dataset.length - 1],
          { valeurTotale: +_liveVal.toFixed(2) });
      }
    }

    if (!dataset.length) {
      sub.textContent = 'Aucune donnée sur cette période.';
      if (chartPortfolio) { chartPortfolio.destroy(); chartPortfolio = null; }
      // Show a flat zero line
      const ctx = document.getElementById('chart-portfolio').getContext('2d');
      chartPortfolio = new Chart(ctx, {
        type: 'line',
        data: { labels: ['Aujourd\'hui'], datasets: [{ data: [0], borderColor: '#495068', borderWidth: 1, pointRadius: 0 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { min: 0, max: 100, ticks: { callback: v => v + ' €', color: '#495068' }, grid: { color: 'rgba(255,255,255,0.03)' } } } }
      });
      return;
    }

    // Plus-value latente = valeur actuelle - coût de revient
    let totalVal = 0, totalInvested = 0;
    data.forEach(r => { totalVal += r.qty * r.currentPrice; totalInvested += r.qty * r.buyPrice; });
    const totalPnl = totalVal - totalInvested;
    const isUp  = totalPnl >= 0;
    const pct   = totalInvested > 0 ? (totalPnl / totalInvested * 100).toFixed(2) : '0.00';
    const sign  = totalPnl >= 0 ? '+' : '';
    const color = isUp ? '#00e09e' : '#ff4d6a';

    const pctEl = document.getElementById('portf-pct-display');
    if (pctEl) {
      pctEl.dataset.pct = sign + pct + '%';
      pctEl.dataset.eur = (totalPnl >= 0 ? '+' : '') + totalPnl.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
      pctEl.textContent = pctEl.dataset.pct;
      pctEl.style.color = color;
      pctEl.style.cursor = 'pointer';
      pctEl.onclick = () => { pctEl.textContent = pctEl.textContent === pctEl.dataset.pct ? pctEl.dataset.eur : pctEl.dataset.pct; };
    }

    // ── Tagline dynamique ────────────────────────────────────────────────────
    const taglineEl = document.getElementById('portf-tagline');
    if (taglineEl) {
      const nDays  = Math.round((now - oldestTs) / 86400);
      const xEur   = (totalPnl >= 0 ? '+' : '') + totalPnl.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
      const oldestDate = new Date(oldestTs * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      const positives = [
        `${xEur} générés en ${nDays} jours · patience récompensée`,
        `${nDays} jours investis · votre discipline paie`,
        `+${pct}% · vous faites mieux que la majorité des épargnants`,
        `${xEur} de plus · chaque jour investi compte`,
        `+${pct}% · votre PEA travaille pendant que vous dormez`,
        `${nDays} jours de cap maintenu · bravo`,
        `${xEur} · c'est ça, l'effet du temps en bourse`,
        `"Le risque vient de ne pas savoir ce qu'on fait" — Warren Buffett`,
        `"L'investissement est simple, mais pas facile" — Warren Buffett`,
        `"En bourse, le temps est votre meilleur ami" — Warren Buffett`,
      ];
      const negatives = [
        `Tout investisseur connaît des jours comme celui-ci`,
        `La patience est la première vertu de l'investisseur`,
        `Chaque grand portefeuille a traversé des tempêtes`,
        `Ce n'est qu'une étape · votre cap reste le bon`,
        `Le temps est le seul allié qui ne trahit jamais`,
        `Les plus belles hausses succèdent aux baisses`,
        `Même les meilleurs investisseurs ont connu ça`,
        `Rester investi, c'est déjà gagner sur le long terme`,
        `"La bourse transfère l'argent des impatients aux patients" — Warren Buffett`,
        `"Ne testez jamais la profondeur d'un fleuve avec les deux pieds" — W. Buffett`,
      ];
      const pool = isUp ? positives : negatives;
      // Phrase du jour — change chaque jour, stable dans la journée
      const dayIndex = Math.floor(Date.now() / 86400000) % pool.length;
      taglineEl.textContent = pool[dayIndex];
    }

    const daysDuration = (now - graphStart) / 86400;
    const labels = dataset.map(p => {
      const dt = new Date(p.ts * 1000);
      if (daysDuration <= 1)
        return dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      if (daysDuration <= 6)
        return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      if (daysDuration <= 400)
        return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      if (daysDuration <= 1500)
        return dt.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      return dt.getFullYear().toString();
    });

    const ctx = document.getElementById('chart-portfolio').getContext('2d');
    if (chartPortfolio) chartPortfolio.destroy();

    // Build buy/sell markers from transaction log
    const txMarkers = getTransactions(currentUser);
    const buyPoints = [];
    const sellPoints = [];
    txMarkers.forEach(tx => {
      if (!tx.date || (tx.type !== 'buy' && tx.type !== 'sell')) return;
      // Find closest index in dataset
      let bestIdx = -1, bestDist = Infinity;
      dataset.forEach((p, i) => {
        const dist = Math.abs(new Date(p.date).getTime() - new Date(tx.date).getTime());
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      if (bestIdx >= 0 && bestDist < 3 * 86400 * 1000) {
        if (tx.type === 'buy') buyPoints.push(bestIdx);
        else sellPoints.push(bestIdx);
      }
    });

    // Create point arrays: show colored dots only at buy/sell dates
    const dataValues = dataset.map(p => p.valeurTotale > 0 ? p.valeurTotale : null);
    const buyData = dataValues.map((v, i) => buyPoints.includes(i) ? v : null);
    const sellData = dataValues.map((v, i) => sellPoints.includes(i) ? v : null);

    chartPortfolio = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Portefeuille',
            data: dataValues,
            borderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: color,
            tension: 0.2,
            fill: true,
            spanGaps: true,
            backgroundColor: (ctx2) => {
              const chart = ctx2.chart;
              const { ctx: c, chartArea } = chart;
              // chartArea indéfini au tout premier paint → couleur plate de repli
              if (!chartArea) return isUp ? 'rgba(0,224,158,0.12)' : 'rgba(255,77,106,0.12)';
              // Dégradé sur toute la hauteur réelle (corrige le fondu coupé sur grands écrans)
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              const rgb = isUp ? '0,224,158' : '255,77,106';
              g.addColorStop(0,    'rgba(' + rgb + ',0.34)');
              g.addColorStop(0.45, 'rgba(' + rgb + ',0.12)');
              g.addColorStop(1,    'rgba(' + rgb + ',0)');
              return g;
            },
          },
          {
            label: 'Achats',
            data: buyData,
            borderColor: 'transparent',
            backgroundColor: '#00e09e',
            pointRadius: buyData.map(v => v !== null ? 6 : 0),
            pointHoverRadius: 8,
            pointStyle: 'circle',
            pointBorderColor: '#04060b',
            pointBorderWidth: 2,
            showLine: false,
            fill: false,
          },
          {
            label: 'Ventes',
            data: sellData,
            borderColor: 'transparent',
            backgroundColor: '#ff4d6a',
            pointRadius: sellData.map(v => v !== null ? 6 : 0),
            pointHoverRadius: 8,
            pointStyle: 'circle',
            pointBorderColor: '#04060b',
            pointBorderWidth: 2,
            showLine: false,
            fill: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // Le tracé + la cascade des pastilles sont gérés par pfRunReveal.
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: portfolioChartTooltip
          }
        },
        scales: {
          x: { display: false },
          y: { display: false, beginAtZero: false }
        }
      },
      plugins: [pfRevealPlugin]
    });

    // Datasets 1 et 2 = pastilles Achats / Ventes.
    pfRunReveal(chartPortfolio, [1, 2]);

    _perfMark('courbe affichée', _fromCache ? '(cache)' : '(Yahoo)');

    // Mini courbe « Valorisation totale » (spark-total) : même série réelle que
    // le grand graphique, au lieu du random-walk factice.
    try {
      const realTotal = dataset.map(p => p.valeurTotale).filter(v => typeof v === 'number' && v > 0);
      if (realTotal.length >= 2) {
        sparkData.total = realTotal;
        const pos = getComputedStyle(document.documentElement).getPropertyValue('--positive').trim() || '#00e09e';
        drawSparkline('spark-total', realTotal, isUp ? pos : '#ff4d6a');
      }
    } catch(_) {}

  } catch(e) {
    document.getElementById('portfolio-chart-sub').textContent = 'Données indisponibles pour cette période.';
    console.error('Portfolio chart error:', e);
  } finally {
    if (loader) loader.classList.remove('show');
  }
}

// ═══════════════════════════════════════════════════
// FEATURE: COLLAPSIBLE SIDEBAR
// ═══════════════════════════════════════════════════
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const btn = document.getElementById('sidebar-toggle');
  sb.classList.toggle('collapsed');
  document.body.classList.toggle('sb-collapsed');
  // Ferme le popover « ⋯ » quand on déplie/replie la sidebar
  const ex = document.getElementById('sidebar-extra'); if (ex) ex.classList.remove('open');
  try { localStorage.setItem('pea_sb_collapsed', sb.classList.contains('collapsed') ? '1' : '0'); } catch(e) {}
}

// Popover « ⋯ » du bas de sidebar (mode replié) : présentation, légal, masquer solde.
window.toggleSidebarMore = function(e) {
  if (e) e.stopPropagation();
  const ex = document.getElementById('sidebar-extra');
  if (ex) ex.classList.toggle('open');
};
window.closeSidebarMore = function() {
  const ex = document.getElementById('sidebar-extra');
  if (ex) ex.classList.remove('open');
};
document.addEventListener('click', (e) => {
  const ex = document.getElementById('sidebar-extra');
  if (!ex || !ex.classList.contains('open')) return;
  const btn = document.getElementById('sidebar-more-btn');
  if (ex.contains(e.target) || (btn && btn.contains(e.target))) return;
  ex.classList.remove('open');
});
(function(){
  try {
    if (localStorage.getItem('pea_sb_collapsed') === '1') {
      setTimeout(() => {
        const sb = document.getElementById('sidebar');
        if (sb) { sb.classList.add('collapsed'); document.body.classList.add('sb-collapsed'); }
      }, 0);
    }
  } catch(e) {}
})();

// ═══════════════════════════════════════════════════
// FEATURE: SECTOR ALLOCATION
// ═══════════════════════════════════════════════════
const TICKER_SECTORS = {
  // CAC 40
  'MC.PA':'Luxe','OR.PA':'Luxe','RMS.PA':'Luxe','AI.PA':'Aéronautique','AIR.PA':'Aéronautique',
  'BNP.PA':'Finance','ACA.PA':'Finance','GLE.PA':'Finance','CS.PA':'Finance',
  'SAN.PA':'Santé','TTE.PA':'Énergie','ENGI.PA':'Énergie',
  'SU.PA':'Industrie','DG.PA':'Industrie','SGO.PA':'Industrie','EN.PA':'Industrie',
  'ORA.PA':'Telecom','VIV.PA':'Médias','BN.PA':'Agroalimentaire',
  'RNO.PA':'Automobile','ML.PA':'Automobile','HO.PA':'Défense',
  'DSY.PA':'Tech','VIE.PA':'Services',
  // US Tech
  'AAPL':'Tech','MSFT':'Tech','GOOGL':'Tech','GOOG':'Tech','META':'Tech',
  'AMZN':'E-commerce','TSLA':'Automobile','NVDA':'Tech','AMD':'Tech','INTC':'Tech',
  'NFLX':'Médias','DIS':'Médias','ADBE':'Tech','CRM':'Tech','CSCO':'Tech','PYPL':'Fintech',
  // ETFs
  'PANX.PA':'ETF','CW8.PA':'ETF','MWRD.PA':'ETF','PAEEM.PA':'ETF','RS2K.PA':'ETF',
  'PCEU.PA':'ETF','PE500.PA':'ETF','ESE.PA':'ETF','WPEA.PA':'ETF','EWLD.PA':'ETF',
  'IWDA.AS':'ETF','CSPX.AS':'ETF','VWRL.AS':'ETF','VWCE.AS':'ETF',
  'SPY':'ETF','QQQ':'ETF','VOO':'ETF','VTI':'ETF','VT':'ETF',
  'ARKK':'ETF','GLD':'Matières premières','TLT':'Obligations','SOXX':'ETF',
};
const SECTOR_COLORS = {
  'Tech':'#7c6df5','Luxe':'#f5b731','Finance':'#5b8dee','Santé':'#00e09e',
  'Énergie':'#ff4d6a','Industrie':'#63b3ed','ETF':'#68d391','Aéronautique':'#f6ad55',
  'Automobile':'#fc8181','Telecom':'#76e4f7','Médias':'#b794f4','Agroalimentaire':'#9ae6b4',
  'E-commerce':'#fbb6ce','Défense':'#a0aec0','Fintech':'#4fd1c5','Services':'#d6bcfa',
  'Matières premières':'#ecc94b','Obligations':'#90cdf4','Autre':'#4a5568',
};

let chartSector = null;
function renderSectorChart(data) {
  const sectors = {};
  data.forEach(r => {
    const s = TICKER_SECTORS[r.ticker] || 'Autre';
    sectors[s] = (sectors[s] || 0) + r.qty * r.currentPrice;
  });
  const labels = Object.keys(sectors);
  const values = Object.values(sectors).map(v => +v.toFixed(2));
  const colors = labels.map(l => SECTOR_COLORS[l] || '#4a5568');
  const ctx = document.getElementById('chart-sector').getContext('2d');
  if (chartSector) chartSector.destroy();
  chartSector = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#0a0c14', borderWidth: 3, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8892a8', font: { family: 'JetBrains Mono', size: 10 }, padding: 10, boxWidth: 10, boxHeight: 10 } },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ' — ' + ctx.parsed.toLocaleString('fr-FR', {style:'currency',currency:'EUR'}) }, backgroundColor: '#10121c', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, titleColor: '#edf0f7', bodyColor: '#8892a8', padding: 10, cornerRadius: 8 }
      }
    }
  });
}

// ═══════════════════════════════════════════════════
// FEATURE: CORRELATION MATRIX
// ═══════════════════════════════════════════════════
async function renderCorrelationMatrix(data) {
  const wrap = document.getElementById('corr-matrix-wrap');
  if (data.length < 2) { wrap.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:32px 0">Ajoutez au moins 2 positions.</div>'; return; }
  const tickers = data.map(r => r.ticker).slice(0, 8); // Max 8 for readability
  wrap.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:20px 0"><span class="loading-spinner"></span> Calcul des corrélations…</div>';

  try {
    // Fetch 3mo daily returns for each ticker
    const returns = {};
    await Promise.all(tickers.map(async ticker => {
      try {
        const raw = await fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(resolveToYahooTicker(ticker)) + '?interval=1d&range=3mo');
        const d = JSON.parse(raw);
        const closes = d.chart.result[0].indicators.quote[0].close.filter(v => v != null);
        const rets = [];
        for (let i = 1; i < closes.length; i++) rets.push((closes[i] - closes[i-1]) / closes[i-1]);
        returns[ticker] = rets;
      } catch(e) { returns[ticker] = []; }
    }));

    // Pearson correlation
    function pearson(a, b) {
      const n = Math.min(a.length, b.length);
      if (n < 5) return 0;
      const ax = a.slice(0, n), bx = b.slice(0, n);
      const ma = ax.reduce((s,v)=>s+v,0)/n, mb = bx.reduce((s,v)=>s+v,0)/n;
      let num = 0, da = 0, db = 0;
      for (let i = 0; i < n; i++) { num += (ax[i]-ma)*(bx[i]-mb); da += (ax[i]-ma)**2; db += (bx[i]-mb)**2; }
      return da && db ? num / Math.sqrt(da * db) : 0;
    }

    // Build HTML table
    const shortName = t => t.replace(/\.[A-Z]+$/,'').slice(0,6);
    let html = '<table class="corr-table"><tr><th></th>';
    tickers.forEach(t => html += '<th>' + shortName(t) + '</th>');
    html += '</tr>';
    tickers.forEach((t1, i) => {
      html += '<tr><th>' + shortName(t1) + '</th>';
      tickers.forEach((t2, j) => {
        const corr = i === j ? 1 : pearson(returns[t1] || [], returns[t2] || []);
        const v = corr.toFixed(2);
        // Color: green for positive, red for negative, intensity by magnitude
        const abs = Math.abs(corr);
        const bg = corr >= 0
          ? 'rgba(0,224,158,' + (abs * 0.4) + ')'
          : 'rgba(255,77,106,' + (abs * 0.4) + ')';
        html += '<td class="corr-cell" style="background:' + bg + '">' + v + '</td>';
      });
      html += '</tr>';
    });
    html += '</table>';
    wrap.innerHTML = html;
  } catch(e) {
    wrap.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:32px 0">Erreur lors du calcul.</div>';
  }
}

// ═══════════════════════════════════════════════════
// FEATURE: BENCHMARK COMPARISON
// ═══════════════════════════════════════════════════
let chartBenchmark = null;
async function renderBenchmarkChart() {
  const data = getPortfolio(currentUser);
  if (!data.length) return;
  const benchTicker = document.getElementById('benchmark-select').value;
  const sub = document.getElementById('benchmark-sub');
  sub.textContent = 'Chargement…';
  const ctx = document.getElementById('chart-benchmark').getContext('2d');
  if (chartBenchmark) chartBenchmark.destroy();

  try {
    // Fetch benchmark 1y
    const bRaw = await fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(benchTicker) + '?interval=1wk&range=1y');
    const bd = JSON.parse(bRaw);
    const bRes = bd.chart.result[0];
    const bTs = bRes.timestamp;
    const bCloses = bRes.indicators.quote[0].close;

    // Fetch portfolio history 1y
    const now = Math.floor(Date.now() / 1000);
    const start = now - 365 * 86400;
    const portfolio = await buildPortfolioHistory(data, start, now);

    // Normalize both to % change from start
    const bStart = bCloses.find(v => v != null);
    const benchNorm = bTs.map((t, i) => ({
      ts: t,
      val: bCloses[i] != null && bStart ? ((bCloses[i] / bStart - 1) * 100) : null
    })).filter(p => p.val !== null);

    const pStart = portfolio.length ? portfolio[0].valeurTotale : 1;
    const portNorm = portfolio.map(p => ({
      ts: p.ts,
      val: pStart > 0 ? ((p.valeurTotale / pStart - 1) * 100) : 0
    }));

    // Align on benchmark timestamps
    const labels = benchNorm.map(p => {
      const dt = new Date(p.ts * 1000);
      return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    });

    // For portfolio, find closest value for each benchmark timestamp
    const portValues = benchNorm.map(bp => {
      const closest = portNorm.reduce((best, pp) => Math.abs(pp.ts - bp.ts) < Math.abs(best.ts - bp.ts) ? pp : best, portNorm[0] || {ts:0,val:0});
      return closest ? closest.val : null;
    });

    const benchLast = benchNorm[benchNorm.length-1]?.val || 0;
    const portLast = portValues[portValues.length-1] || 0;
    const benchName = {'%5EGSPC':'S&P 500','%5EFCHI':'CAC 40','%5ESTOXX50E':'Euro Stoxx 50','^GSPC':'S&P 500','^FCHI':'CAC 40','^STOXX50E':'Euro Stoxx 50'}[benchTicker] || benchTicker;
    sub.textContent = 'Portefeuille ' + (portLast >= 0 ? '+' : '') + portLast.toFixed(1) + '% vs ' + benchName + ' ' + (benchLast >= 0 ? '+' : '') + benchLast.toFixed(1) + '% sur 1 an';

    chartBenchmark = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Portefeuille', data: portValues,
            borderColor: '#7c6df5', borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false,
          },
          {
            label: benchName, data: benchNorm.map(p => p.val),
            borderColor: '#5b8dee', borderWidth: 2, pointRadius: 0, tension: 0.2, borderDash: [5,3], fill: false,
          }
        ]
      },
      options: {
        responsive: true, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#8892a8', font: { family: 'JetBrains Mono', size: 11 }, padding: 14 } },
          tooltip: { backgroundColor: '#10121c', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1, titleColor: '#8892a8', bodyColor: '#edf0f7', padding: 12, cornerRadius: 8, callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + (ctx.parsed.y >= 0 ? '+' : '') + ctx.parsed.y.toFixed(2) + '%' } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#495068', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 10 }, border: { color: 'rgba(255,255,255,0.04)' } },
          y: { position: 'right', grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8892a8', font: { family: 'JetBrains Mono', size: 10 }, callback: v => (v >= 0 ? '+' : '') + v + '%' }, border: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
  } catch(e) {
    sub.textContent = 'Données indisponibles.';
    console.error('Benchmark error:', e);
  }
}

// ═══════════════════════════════════════════════════
// FEATURE: PORTFOLIO BETA + VOLATILITY + DIVIDENDS
// ═══════════════════════════════════════════════════
async function computePortfolioIntel(data) {
  if (!data.length) return;
  const totalVal = data.reduce((s, r) => s + r.qty * r.currentPrice, 0);

  // Fetch 3mo daily data for beta + volatility calculation
  const allReturns = {};
  let benchReturns = [];
  try {
    // Benchmark = CAC40
    const bRaw = await fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/%5EFCHI?interval=1d&range=3mo');
    const bd = JSON.parse(bRaw);
    const bc = bd.chart.result[0].indicators.quote[0].close.filter(v => v != null);
    for (let i = 1; i < bc.length; i++) benchReturns.push((bc[i] - bc[i-1]) / bc[i-1]);
  } catch(e) {}

  await Promise.all(data.map(async r => {
    try {
      const raw = await fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(resolveToYahooTicker(r.ticker)) + '?interval=1d&range=3mo');
      const d = JSON.parse(raw);
      const closes = d.chart.result[0].indicators.quote[0].close.filter(v => v != null);
      const rets = [];
      for (let i = 1; i < closes.length; i++) rets.push((closes[i] - closes[i-1]) / closes[i-1]);
      allReturns[r.ticker] = rets;
    } catch(e) { allReturns[r.ticker] = []; }
  }));

  // Weighted portfolio returns
  const n = benchReturns.length;
  if (n > 5) {
    const weights = data.map(r => (r.qty * r.currentPrice) / totalVal);
    const portReturns = [];
    for (let i = 0; i < n; i++) {
      let pr = 0;
      data.forEach((r, j) => {
        const rets = allReturns[r.ticker] || [];
        pr += (rets[i] || 0) * weights[j];
      });
      portReturns.push(pr);
    }

    // Beta = Cov(port, bench) / Var(bench)
    const mb = benchReturns.slice(0,n).reduce((s,v)=>s+v,0)/n;
    const mp = portReturns.reduce((s,v)=>s+v,0)/n;
    let cov = 0, varB = 0;
    for (let i = 0; i < n; i++) {
      cov += (portReturns[i] - mp) * (benchReturns[i] - mb);
      varB += (benchReturns[i] - mb) ** 2;
    }
    const beta = varB ? (cov / varB) : 1;

    // Volatility = annualized std dev of daily portfolio returns
    const varP = portReturns.reduce((s,v) => s + (v - mp) ** 2, 0) / n;
    const vol = Math.sqrt(varP) * Math.sqrt(252) * 100;

    document.getElementById('intel-beta').textContent = beta.toFixed(2);
    document.getElementById('intel-beta-sub').textContent = beta < 0.8 ? 'Défensif' : beta > 1.2 ? 'Agressif' : 'Neutre';
    document.getElementById('intel-beta-sub').style.color = beta < 0.8 ? 'var(--positive)' : beta > 1.2 ? 'var(--negative)' : 'var(--gold)';
    document.getElementById('intel-vol').textContent = vol.toFixed(1) + '%';
  }

  // Dividends
  let totalDivYield = 0;
  let totalDivAmount = 0;
  const divCards = [];
  data.forEach(r => {
    const yld = r.dividendYield || 0;
    const val = r.qty * r.currentPrice;
    const amount = val * yld;
    totalDivYield += yld * (val / totalVal);
    totalDivAmount += amount;
    if (yld > 0) {
      divCards.push({ name: r.name || r.ticker, ticker: r.ticker, yield: yld, amount });
    }
  });

  document.getElementById('intel-div-yield').textContent = (totalDivYield * 100).toFixed(2) + '%';
  document.getElementById('intel-div-sub').textContent = 'Moy. pondérée : ' + (totalDivYield * 100).toFixed(2) + '%';
  document.getElementById('intel-div-total').textContent = totalDivAmount.toFixed(2) + ' €';

  // Dividend cards
  const divGrid = document.getElementById('div-grid');
  if (divCards.length) {
    divGrid.innerHTML = divCards.map(d =>
      '<div class="div-card"><div class="div-ticker">' + d.name + '</div>' +
      '<div class="div-yield">' + (d.yield * 100).toFixed(2) + '%</div>' +
      '<div class="div-amount">~' + d.amount.toFixed(2) + ' €/an</div></div>'
    ).join('');
  } else {
    divGrid.innerHTML = '<div style="color:var(--text3);font-size:12px;grid-column:1/-1;text-align:center;padding:24px 0">Aucun dividende détecté</div>';
  }
}

// Patch initCharts to include new charts
const _origInitCharts = initCharts;
initCharts = function() {
  _origInitCharts();
  const data = getPortfolio(currentUser);
  if (data.length) {
    renderSectorChart(data);
    renderCorrelationMatrix(data);
    renderBenchmarkChart();
    computePortfolioIntel(data);
  }
};

function downloadHTML() {
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'index.html';
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════
// ANIMATION: COUNT UP (ODOMETER)
// ═══════════════════════════════════════════════════
function countUp(el, target, duration, prefix, suffix) {
  prefix = prefix || '';
  suffix = suffix || '';
  const start = 0;
  const startTime = performance.now();
  const isNeg = target < 0;
  const absTarget = Math.abs(target);

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (absTarget - start) * eased;
    el.textContent = prefix + (isNeg ? '-' : '') + current.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let _statScrollTimer = null;
function initStatCardsScroll() {
  if (_statScrollTimer) { clearInterval(_statScrollTimer); _statScrollTimer = null; }

  const grid = document.querySelector('.stats-scroll-wrap .stats-grid');
  if (!grid) return;

  let paused = false;

  grid.addEventListener('touchstart', () => { paused = true; }, { passive: true });
  grid.addEventListener('touchend',   () => { setTimeout(() => { paused = false; }, 2500); }, { passive: true });
  grid.addEventListener('mouseenter', () => { paused = true; });
  grid.addEventListener('mouseleave', () => { paused = false; });

  _statScrollTimer = setInterval(() => {
    if (paused) return;
    grid.scrollLeft += 1;
    if (grid.scrollLeft >= grid.scrollWidth - grid.clientWidth - 1) {
      grid.scrollLeft = 0;
    }
  }, 30);
}

// Apply countUp to stat cards after render
function animateStatCards() {
  const totalEl = document.getElementById('stat-total');
  const invEl = document.getElementById('stat-invested');
  const pnlEl = document.getElementById('stat-pnl');

  const data = getPortfolio(currentUser);
  if (!data.length) return;

  let totalVal = 0, totalInv = 0;
  data.forEach(r => { totalVal += r.qty * r.currentPrice; totalInv += r.qty * r.buyPrice; });
  const pnl = totalVal - totalInv;

  countUp(totalEl, totalVal, 800, '', ' €');
  countUp(invEl, totalInv, 800, '', ' €');
  countUp(pnlEl, Math.abs(pnl), 800, pnl >= 0 ? '+' : '-', ' €');
}

// ═══════════════════════════════════════════════════
// ANIMATION: PROGRESSIVE RADAR CHART
// ═══════════════════════════════════════════════════
function drawRadarAnimated(axes, duration) {
  duration = duration || 800;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    // Create animated axes with scaled scores
    const animAxes = axes.map(a => ({ ...a, score: a.score * eased }));
    drawRadarChart(animAxes);

    if (progress < 1) requestAnimationFrame(tick);
    else drawRadarChart(axes); // Final exact render
  }
  requestAnimationFrame(tick);
}

// ═══════════════════════════════════════════════════
// ANIMATION: BADGE PULSE ON REFRESH
// ═══════════════════════════════════════════════════
function pulseBadges() {
  document.querySelectorAll('.badge-pos, .badge-neg').forEach(el => {
    el.classList.remove('badge-pulse');
    void el.offsetWidth; // Force reflow
    el.classList.add('badge-pulse');
  });
}

// ═══════════════════════════════════════════════════
// ANIMATION: 3D TILT ON MOUSE MOVE (stat cards)
// ═══════════════════════════════════════════════════
function initTiltCards() {
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = 'translateY(-3px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// FEATURE 1: LIGHT/DARK TOGGLE (désactivé — dark forcé)
// ═══════════════════════════════════════════════════
function toggleTheme() {
  // Fonction conservée pour compat, mais désactivée : on reste en dark.
}
// Force le mode sombre au chargement et nettoie toute pref
(function(){
  try {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('pea_theme');
  } catch(e){}
})();

// ═══════════════════════════════════════════════════
// FEATURE 2: COLOR THEME (désactivé — violet forcé)
// ═══════════════════════════════════════════════════
function setColorTheme(color) {
  // Fonction conservée pour compat, mais désactivée : on reste en violet.
}
(function(){
  try {
    document.documentElement.removeAttribute('data-color');
    localStorage.removeItem('pea_color');
  } catch(e){}
})();

// ═══════════════════════════════════════════════════
// FEATURE 3: SPARKLINES
// ═══════════════════════════════════════════════════
// Convertit une couleur (#hex ou rgb()) en rgba avec l'alpha donné.
function _toRgba(col, a) {
  col = (col || '').trim();
  if (col[0] === '#') {
    let h = col.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = col.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? `rgba(${m[1]},${m[2]},${m[3]},${a})` : `rgba(0,224,158,${a})`;
}

function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data || data.length < 2) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.offsetWidth || 300;
  const h = 40; // hauteur fixe (ne pas lire le parent : padding + align-end → emballement)
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const xAt = i => (i / (data.length - 1)) * w;
  const yAt = v => h - ((v - min) / range) * (h - pad * 2) - pad;

  // Tracé (lignes droites = marches fidèles à la grande courbe)
  ctx.beginPath();
  data.forEach((v, i) => { const x = xAt(i), y = yAt(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Remplissage dégradé sous la courbe
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, _toRgba(color, 0.24));
  grad.addColorStop(0.5, _toRgba(color, 0.08));
  grad.addColorStop(1, _toRgba(color, 0));
  ctx.fillStyle = grad;
  ctx.fill();
}

// Sparkline data is generated from portfolio history
let sparkData = { total: [], invested: [], pnl: [] };
function updateSparklines() {
  const pos = getComputedStyle(document.documentElement).getPropertyValue('--positive').trim();
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim();
  drawSparkline('spark-total', sparkData.total, pos || '#00e09e');
  drawSparkline('spark-invested', sparkData.invested, acc || '#5b8dee');
  const pnlColor = sparkData.pnl.length && sparkData.pnl[sparkData.pnl.length-1] >= 0 ? (pos || '#00e09e') : '#ff4d6a';
  drawSparkline('spark-pnl', sparkData.pnl, pnlColor);
}
// Generate fake sparkline data from random walk (until real history is available)
function generateSparkData(finalVal, points) {
  if (!finalVal || finalVal <= 0) return [];
  const data = [finalVal * (0.85 + Math.random() * 0.1)];
  for (let i = 1; i < points; i++) {
    data.push(data[i-1] * (0.98 + Math.random() * 0.04));
  }
  data[points - 1] = finalVal;
  return data;
}

// ═══════════════════════════════════════════════════
// FEATURE 4: SEARCH / FILTER TABLE
// ═══════════════════════════════════════════════════
function filterTable() {
  const q = (document.getElementById('table-search').value || '').toLowerCase();
  const rows = document.querySelectorAll('#portfolio-tbody tr');
  rows.forEach(tr => {
    const text = tr.textContent.toLowerCase();
    tr.style.display = text.includes(q) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════
// FEATURE 5: SORT TABLE
// ═══════════════════════════════════════════════════
function sortTable() {
  const key = document.getElementById('table-sort').value;
  if (!key) { renderPortfolio(); return; }
  const data = getPortfolio(currentUser);
  const sorted = [...data];
  sorted.sort((a, b) => {
    switch(key) {
      case 'name-asc':  return (a.name || a.ticker).localeCompare(b.name || b.ticker);
      case 'name-desc': return (b.name || b.ticker).localeCompare(a.name || a.ticker);
      case 'val-desc':  return (b.qty * b.currentPrice) - (a.qty * a.currentPrice);
      case 'val-asc':   return (a.qty * a.currentPrice) - (b.qty * b.currentPrice);
      case 'perf-desc': return ((b.currentPrice-b.buyPrice)/b.buyPrice) - ((a.currentPrice-a.buyPrice)/a.buyPrice);
      case 'perf-asc':  return ((a.currentPrice-a.buyPrice)/a.buyPrice) - ((b.currentPrice-b.buyPrice)/b.buyPrice);
      default: return 0;
    }
  });
  // Temporarily replace, render, restore
  savePortfolio(currentUser, sorted);
  renderPortfolio();
}

// ═══════════════════════════════════════════════════
// FEATURE 6: EXPORT CSV
// ═══════════════════════════════════════════════════
function exportCSV() {
  const data = getPortfolio(currentUser);
  if (!data.length) { alert('Portefeuille vide.'); return; }
  const header = 'Action,Ticker,Quantité,Prix Achat,Prix Actuel,Valeur,+/- Value,% Perf\n';
  const rows = data.map(r => {
    const val = r.qty * r.currentPrice;
    const inv = r.qty * r.buyPrice;
    const pnl = val - inv;
    const pct = inv > 0 ? (pnl / inv * 100).toFixed(2) : '0';
    return [r.name, r.ticker, r.qty, r.buyPrice.toFixed(2), r.currentPrice.toFixed(2), val.toFixed(2), pnl.toFixed(2), pct].join(',');
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'portefeuille_' + currentUser + '.csv';
  a.click(); URL.revokeObjectURL(url);
}

function exportDebugData() {
  const portfolio = getPortfolio(currentUser);
  const txs = getTransactions(currentUser);
  const versements = getVersements(currentUser);
  const data = { portfolio, transactions: txs, versements };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'debug_pea_' + currentUser + '.json';
  a.click(); URL.revokeObjectURL(url);
}

function exportVersementsCSV() {
  const versements = getVersements(currentUser);
  if (!versements.length) { alert('Aucun versement.'); return; }
  const header = 'Date,Montant\n';
  const rows = versements.sort((a,b) => (a.date||'').localeCompare(b.date||'')).map(v => v.date + ',' + v.amount.toFixed(2)).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'versements_' + currentUser + '.csv'; a.click(); URL.revokeObjectURL(url);
}

function exportTransactionsCSV() {
  const txs = getTransactions(currentUser);
  if (!txs.length) { alert('Aucune transaction.'); return; }
  const header = 'Date,Type,Ticker,Nom,Quantité,Prix,Montant,PnL Réalisé\n';
  const rows = txs.sort((a,b) => (a.date||'').localeCompare(b.date||'')).map(t => {
    const montant = (t.qty * t.price).toFixed(2);
    const pnl = t.realizedPnl != null ? t.realizedPnl.toFixed(2) : '';
    return [t.date, t.type, t.ticker, (t.name||'').replace(/,/g,' '), t.qty, t.price.toFixed(2), montant, pnl].join(',');
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'transactions_' + currentUser + '.csv'; a.click(); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════
// FEATURE 7: AUTO-REFRESH (60s)
// ═══════════════════════════════════════════════════
let autoRefreshInterval = null;
function toggleAutoRefresh() {
  const btn = document.getElementById('btn-auto-refresh');
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    if (btn) btn.classList.remove('active');
  } else {
    autoRefreshInterval = setInterval(refreshPrices, 30000);
    if (btn) btn.classList.add('active');
    refreshPrices(); // immediate first refresh
  }
}

let _refreshingPrices = false;
async function refreshPrices() {
  // Garde anti-ré-entrée : si un refresh précédent traîne (réseau lent),
  // on ne lance pas un 2e par-dessus → pas d'empilement de requêtes.
  if (!currentUser || _refreshingPrices) return;
  const data = getPortfolio(currentUser);
  if (!data.length) return;
  _refreshingPrices = true;
  try {
    // Regroupe les lignes par ticker Yahoo (plusieurs lignes peuvent partager
    // un même ticker) → 1 seul prix à récupérer par ticker unique.
    const tickerRows = {};
    data.forEach((row) => {
      const yt = resolveToYahooTicker(row.ticker);
      (tickerRows[yt] = tickerRows[yt] || []).push(row);
    });
    const symbols = Object.keys(tickerRows);
    let changed = false;

    // Lever 2 : UNE requête batch au Worker pour tout le portefeuille
    // (au lieu d'une requête par ligne). Le Worker mutualise via le cache edge.
    let quotes = null;
    try {
      // no-store : le Worker répond avec Cache-Control max-age=30, donc sans ça
      // le navigateur ressert sa copie et un refresh manuel peut ne déclencher
      // aucun aller-retour. Le cache edge du Worker (30 s) protège Yahoo.
      const res = await fetch(WORKER_URL + '/quotes?symbols=' + encodeURIComponent(symbols.join(',')),
        { signal: AbortSignal.timeout(9000), cache: 'no-store' });
      if (res.ok) { const j = await res.json(); quotes = j && j.quotes; }
    } catch (_) {}

    if (quotes && Object.keys(quotes).length) {
      symbols.forEach((yt) => {
        const q = quotes[yt];
        if (!q || q.price == null) return;
        tickerRows[yt].forEach((row) => {
          row.currentPrice = q.price;
          row.changePct = q.prevClose ? ((q.price - q.prevClose) / q.prevClose * 100) : 0;
        });
        changed = true;
      });
    } else {
      // Repli : ancienne méthode ligne par ligne (proxies) si le batch échoue.
      await Promise.all(symbols.map(async (yt) => {
        try {
          const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(yt) + '?interval=1d&range=1d';
          const raw = await fetchWithFallback(url);
          const d = JSON.parse(raw);
          const res = d.chart && d.chart.result && d.chart.result[0];
          if (res && res.meta && res.meta.regularMarketPrice) {
            const price = res.meta.regularMarketPrice;
            const prev = res.meta.chartPreviousClose || res.meta.previousClose || price;
            tickerRows[yt].forEach((row) => {
              row.currentPrice = price;
              row.changePct = prev ? ((price - prev) / prev * 100) : 0;
            });
            changed = true;
          }
        } catch (_) {}
      }));
    }

    if (changed) {
      savePortfolio(currentUser, data);
      renderPortfolio();
  }
    // Scan attributions gratuites / OST (rompus) — 1×/session, prix maintenant à jour.
    try { scanCorporateActions(); } catch(_) {}
  } finally {
    _refreshingPrices = false;
  }
}

// ═══════════════════════════════════════════════════
// FEATURE 8: DRAG & DROP REORDER
// ═══════════════════════════════════════════════════
let dragSrcIdx = null;

function onDragStart(e, idx) {
  dragSrcIdx = idx;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', idx);
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('#portfolio-tbody tr').forEach(tr => tr.classList.remove('drag-over'));
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const tr = e.currentTarget;
  document.querySelectorAll('#portfolio-tbody tr').forEach(r => r.classList.remove('drag-over'));
  tr.classList.add('drag-over');
}
function onDrop(e, targetIdx) {
  e.preventDefault();
  document.querySelectorAll('#portfolio-tbody tr').forEach(tr => tr.classList.remove('drag-over'));
  if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
  const data = getPortfolio(currentUser);
  const [moved] = data.splice(dragSrcIdx, 1);
  data.splice(targetIdx, 0, moved);
  savePortfolio(currentUser, data);
  dragSrcIdx = null;
  renderPortfolio();
}

// ═══════════════════════════════════════════════════
// FEATURE 9: WATCHLIST
// ═══════════════════════════════════════════════════
// getWatchlist/saveWatchlist → Firestore (définis dans couche données)

let wlTimer = null, wlFoundTicker = null, wlFoundName = null, wlFoundPrice = null;

function openWatchlistModal() {
  document.getElementById('watchlist-modal-overlay').classList.add('open');
  document.getElementById('wl-ticker').value = '';
  document.getElementById('wl-result').classList.remove('visible');
  document.getElementById('wl-logo').innerHTML = '';
  document.getElementById('wl-status').innerHTML = '';
  document.getElementById('btn-wl-confirm').disabled = true;
  closeDropdown('wl-dropdown');
  wlFoundTicker = null; wlFoundName = null; wlFoundPrice = null;
  setTimeout(() => document.getElementById('wl-ticker').focus(), 100);
}
function closeWatchlistModal() {
  document.getElementById('watchlist-modal-overlay').classList.remove('open');
  closeDropdown('wl-dropdown');
}
function onWlInput() {
  clearTimeout(wlTimer);
  const val = document.getElementById('wl-ticker').value.trim();
  document.getElementById('wl-result').classList.remove('visible');
  document.getElementById('btn-wl-confirm').disabled = true;
  wlFoundPrice = null;
  if (val.length < 2) { document.getElementById('wl-status').innerHTML = ''; closeDropdown('wl-dropdown'); return; }
  wlTimer = setTimeout(async () => {
    const suggs = await fetchSuggestions(val);
    if (!suggs.length) { document.getElementById('wl-status').innerHTML = '<div class="status-error">⚠ Introuvable.</div>'; return; }
    renderDropdown('wl-dropdown', suggs, selectWatchlistSuggestion);
    suggs.forEach(s => { if (!LOGO_CACHE[s.symbol]) fetchLogo(s.symbol, s.name); });
  }, 350);
}
function onWlKeydown(e) {
  const dd = document.getElementById('wl-dropdown');
  if (!dd.classList.contains('open')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); navigateDropdown('wl-dropdown', 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); navigateDropdown('wl-dropdown', -1); }
  else if (e.key === 'Enter' && _ddActiveIdx >= 0) {
    e.preventDefault();
    dd.querySelectorAll('.search-dropdown-item')[_ddActiveIdx]?.click();
  } else if (e.key === 'Escape') closeDropdown('wl-dropdown');
}
async function selectWatchlistSuggestion(symbol, name) {
  closeDropdown('wl-dropdown');
  document.getElementById('wl-ticker').value = name || symbol;
  document.getElementById('wl-status').innerHTML = '<div class="status-loading"><span class="loading-spinner"></span> Récupération du cours…</div>';
  try {
    const cached = getCachedPrice(symbol);
    let price, currency, pct;
    if (cached) {
      price = cached.price; currency = cached.currency; pct = cached.changePct;
      wlFoundName = cached.name;
    } else {
      const cRaw = await fetchWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) + '?interval=1d&range=5d');
      const meta = JSON.parse(cRaw).chart.result[0].meta;
      price = meta.regularMarketPrice;
      currency = meta.currency || '';
      const prev = meta.chartPreviousClose || meta.previousClose || price;
      pct = prev ? ((price - prev) / prev * 100) : 0;
      wlFoundName = name || symbol;
      setCachedPrice(symbol, { price, name: wlFoundName, currency, exchange: meta.exchangeName || '', changePct: pct });
    }
    wlFoundPrice = price; wlFoundTicker = symbol;
    document.getElementById('wl-res-name').textContent  = wlFoundName;
    document.getElementById('wl-res-price').textContent = toEur(price, currency).toFixed(2) + ' €';
    document.getElementById('wl-res-info').textContent  = symbol + ' · ' + (pct >= 0 ? '▲' : '▼') + ' ' + Math.abs(pct).toFixed(2) + '%';
    const wlLogoEl = document.getElementById('wl-logo');
    wlLogoEl.innerHTML = logoHtmlModal(symbol);
    if (!LOGO_CACHE[symbol]) fetchLogo(symbol, wlFoundName).then(() => { wlLogoEl.innerHTML = logoHtmlModal(symbol); });
    document.getElementById('wl-status').innerHTML = '';
    document.getElementById('wl-result').classList.add('visible');
    document.getElementById('btn-wl-confirm').disabled = false;
  } catch(err) {
    document.getElementById('wl-status').innerHTML = '<div class="status-error">⚠ ' + (err.message || 'Erreur') + '</div>';
  }
}
function confirmWatchlistAdd() {
  if (!wlFoundTicker || !wlFoundPrice) return;
  const wl = getWatchlist(currentUser);
  if (wl.find(w => w.ticker === wlFoundTicker)) { alert('Déjà dans la watchlist.'); return; }
  wl.push({ name: wlFoundName, ticker: wlFoundTicker, price: wlFoundPrice, addedPrice: wlFoundPrice, addedAt: new Date().toISOString() });
  saveWatchlist(currentUser, wl);
  closeWatchlistModal();
  fetchLogo(wlFoundTicker, wlFoundName).then(() => renderWatchlist());
}
function removeFromWatchlist(i) {
  const wl = getWatchlist(currentUser);
  wl.splice(i, 1);
  saveWatchlist(currentUser, wl);
  renderWatchlist();
}
// ─────────────────────────────────────────────────────────────────
//  WATCHLIST enrichie : prix live, variation jour, sparkline 30j,
//  perf depuis ajout, dividend yield.
//
//  Stratégie : render immédiat avec placeholders, puis fetch Yahoo
//  en parallèle pour chaque ticker et maj progressive des cellules.
// ─────────────────────────────────────────────────────────────────
async function renderWatchlist() {
  const wl = getWatchlist(currentUser);
  const tbody = document.getElementById('watchlist-tbody');
  const empty = document.getElementById('watchlist-empty');
  if (!wl.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const fmtPct = v => (v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + ' %');
  const col = v => v == null ? 'var(--text2)' : (v >= 0 ? 'var(--positive)' : 'var(--negative)');

  // Rendu initial avec placeholders "…"
  tbody.innerHTML = wl.map((w, i) => {
    const rowId = 'wl-row-' + i;
    const addedPrice = w.addedPrice || w.price; // compat données existantes
    return (
      '<tr id="' + rowId + '" class="wl-row-clickable" onclick="toggleWatchlistChart(' + i + ',\'' + w.ticker + '\')">' +
        '<td data-label="Action"><div class="ticker-cell">' + logoHtml(w.ticker, 26, 'ticker-icon') +
          '<div><div class="ticker-name">' + (w.name || w.ticker) + '</div>' +
          '<div class="ticker-sym">' + w.ticker + '</div></div></div></td>' +
        '<td data-label="Prix actuel" class="mono wl-price" style="text-align:right">…</td>' +
        '<td data-label="Variation jour" class="mono wl-daychg" style="text-align:right;color:var(--text2)">…</td>' +
        '<td data-label="30 jours" class="wl-spark" style="min-width:120px;width:120px;padding:0 8px"><div style="height:30px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:10px">…</div></td>' +
        '<td data-label="Depuis ajout" class="mono wl-since" style="text-align:right;color:var(--text2)" title="Depuis le ' + (w.addedAt ? w.addedAt.slice(0,10) : '?') + ' @ ' + (addedPrice ? addedPrice.toFixed(2) + ' €' : '?') + '">…</td>' +
        '<td data-label="" style="text-align:right"><button class="btn-del" onclick="event.stopPropagation();removeFromWatchlist(' + i + ')" title="Retirer">✕</button></td>' +
      '</tr>' +
      '<tr id="wl-chart-row-' + i + '" class="wl-chart-row" style="display:none">' +
        '<td colspan="6">' +
          '<div class="wl-chart-wrap">' +
            '<div class="wl-chart-header">' +
              '<div class="wl-chart-info">' +
                '<div class="wl-chart-price" id="wl-cprice-' + i + '">—</div>' +
                '<div class="wl-chart-change" id="wl-cchange-' + i + '"></div>' +
              '</div>' +
              '<div class="wl-period-bar" id="wl-pbar-' + i + '">' +
                ['1J','5J','1M','6M','AAJ','1A','5A','ALL'].map((p, pi) =>
                  '<button class="wl-period-btn' + (pi === 2 ? ' active' : '') + '" onclick="event.stopPropagation();wlSetPeriod(' + i + ',\'' + w.ticker + '\',\'' + p + '\',this)">' + p + '</button>'
                ).join('') +
              '</div>' +
            '</div>' +
            '<div class="wl-chart-canvas-wrap">' +
              '<div class="wl-chart-loading" id="wl-cloading-' + i + '">Chargement…</div>' +
              '<canvas id="wl-canvas-' + i + '" style="display:none"></canvas>' +
            '</div>' +
          '</div>' +
        '</td>' +
      '</tr>'
    );
  }).join('');

  // Fetch en parallèle pour chaque ticker
  wl.forEach((w, i) => enrichWatchlistRow(w, i));
}

// Cache 5 minutes pour les charts watchlist (prix live bougent)
const _wlChartCache = {};
const _WL_CACHE_TTL_MS = 5 * 60 * 1000;
async function fetchWatchlistChart(ticker) {
  const now = Date.now();
  const cached = _wlChartCache[ticker];
  if (cached && (now - cached.ts) < _WL_CACHE_TTL_MS) return cached.raw;
  const yt = resolveToYahooTicker(ticker);
  const raw = await fetchWithFallback(
    'https://query1.finance.yahoo.com/v8/finance/chart/'
    + encodeURIComponent(yt) + '?interval=1d&range=2mo'
  );
  _wlChartCache[ticker] = { ts: now, raw };
  return raw;
}

// ─── WATCHLIST INLINE CHART ───────────────────────
const _wlChartInstances = {};
const _wlChartPeriodCache = {};
const _WL_PERIOD_CACHE_TTL = 5 * 60 * 1000;

const WL_PERIODS = {
  '1J':  { range: '1d',  interval: '5m'  },
  '5J':  { range: '5d',  interval: '15m' },
  '1M':  { range: '1mo', interval: '1d'  },
  '6M':  { range: '6mo', interval: '1d'  },
  'AAJ': { range: 'ytd', interval: '1d'  },
  '1A':  { range: '1y',  interval: '1d'  },
  '5A':  { range: '5y',  interval: '1wk' },
  'ALL': { period1: 946886400,            interval: '1mo' },
};

function toggleWatchlistChart(i, ticker) {
  const chartRow = document.getElementById('wl-chart-row-' + i);
  const dataRow  = document.getElementById('wl-row-' + i);
  if (!chartRow) return;
  const isOpen = chartRow.style.display !== 'none';
  if (isOpen) {
    chartRow.style.display = 'none';
    dataRow.classList.remove('expanded');
  } else {
    chartRow.style.display = '';
    dataRow.classList.add('expanded');
    if (!_wlChartInstances[i]) {
      loadWlChart(i, ticker, '1M');
    }
  }
}

function wlSetPeriod(i, ticker, period, btn) {
  const bar = document.getElementById('wl-pbar-' + i);
  if (bar) bar.querySelectorAll('.wl-period-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadWlChart(i, ticker, period);
}

async function loadWlChart(i, ticker, period) {
  const canvas   = document.getElementById('wl-canvas-' + i);
  const loading  = document.getElementById('wl-cloading-' + i);
  const elPrice  = document.getElementById('wl-cprice-' + i);
  const elChange = document.getElementById('wl-cchange-' + i);
  if (!canvas) return;

  if (loading) { loading.style.display = 'flex'; canvas.style.display = 'none'; }

  const periodDef = WL_PERIODS[period] || WL_PERIODS['1M'];
  const { interval } = periodDef;
  const cacheKey = ticker + '_' + period;

  try {
    const now = Date.now();
    const cached = _wlChartPeriodCache[cacheKey];
    let raw = (cached && (now - cached.ts) < _WL_PERIOD_CACHE_TTL) ? cached.raw : null;
    if (!raw) {
      const yt = resolveToYahooTicker(ticker);
      let url;
      if (periodDef.period1) {
        const p2 = Math.floor(Date.now() / 1000);
        url = 'https://query1.finance.yahoo.com/v8/finance/chart/'
          + encodeURIComponent(yt) + '?period1=' + periodDef.period1 + '&period2=' + p2
          + '&interval=' + interval + '&includePrePost=true&events=div%7Csplit%7Cearn&lang=fr-FR&region=FR';
      } else {
        const cb = Math.floor(Date.now() / 300000); // change toutes les 5 min → bypass proxy cache
        url = 'https://query1.finance.yahoo.com/v8/finance/chart/'
          + encodeURIComponent(yt) + '?interval=' + interval + '&range=' + periodDef.range + '&_=' + cb;
      }
      raw = await fetchWithFallback(url);
      _wlChartPeriodCache[cacheKey] = { raw, ts: now };
    }

    const d = JSON.parse(raw);
    const res = d.chart && d.chart.result && d.chart.result[0];
    if (!res) throw new Error('no data');

    const meta   = res.meta || {};
    const ts     = res.timestamp || [];
    const quote  = res.indicators && res.indicators.quote && res.indicators.quote[0];
    const closes = (quote && quote.close) || [];
    const opens  = (quote && quote.open)  || [];

    const pts = [], labels = [];
    const isIntraday = interval === '5m'; // 5J (15m) n'est pas intraday : affiche perf 5 jours
    for (let k = 0; k < ts.length; k++) {
      if (closes[k] == null) continue;
      pts.push(closes[k]);
      const dt = new Date(ts[k] * 1000);
      labels.push((interval === '5m' || interval === '15m')
        ? dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      );
    }

    const livePrice  = meta.regularMarketPrice;
    const prevClose  = meta.chartPreviousClose || meta.previousClose;
    const livePriceEur = livePrice != null ? toEur(livePrice, meta.currency) : null;

    // Pour 5J : référence = close d'exactement 5 jours de trading en arrière (pas dans range=5d)
    let ref5j = null;
    if (interval === '15m') {
      const yt5j = resolveToYahooTicker(ticker);
      const refKey = ticker + '_5J_ref';
      const refCached = _wlChartPeriodCache[refKey];
      let refRaw = (refCached && (Date.now() - refCached.ts) < _WL_PERIOD_CACHE_TTL) ? refCached.raw : null;
      if (!refRaw) {
        const cb5j = Math.floor(Date.now() / 300000);
        const refUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/'
          + encodeURIComponent(yt5j) + '?interval=1d&range=1mo&_=' + cb5j;
        refRaw = await fetchWithFallback(refUrl);
        _wlChartPeriodCache[refKey] = { raw: refRaw, ts: Date.now() };
      }
      const refD = JSON.parse(refRaw);
      const refRes = refD.chart?.result?.[0];
      if (refRes) {
        const refCloses = (refRes.indicators.quote[0].close || []).filter(Boolean);
        const idx = refCloses.length - 1 - 5;
        if (idx >= 0) ref5j = refCloses[idx];
      }
    }

    let displayPct = null;
    if (isIntraday) {
      displayPct = (livePrice != null && prevClose) ? ((livePrice / prevClose - 1) * 100) : null;
    } else if (pts.length >= 2) {
      const endPrice  = (interval === '5m' ? livePrice : null) || pts[pts.length - 1];
      const startPrice = interval === '15m'
        ? (ref5j || pts[0])                                 // 5J → close 5 jours de trading en arrière
        : periodDef.period1
          ? (opens[0] != null ? opens[0] : pts[0])         // ALL → open[0]
          : (meta.chartPreviousClose || opens[0] || pts[0]); // autres → chartPreviousClose
      displayPct = ((endPrice / startPrice) - 1) * 100;
    }

    const isUp      = pts.length >= 2 ? pts[pts.length - 1] >= pts[0] : true;
    const lineColor = isUp ? '#00e09e' : '#ff4d6a';

    if (elPrice) elPrice.textContent = livePriceEur != null ? livePriceEur.toFixed(2) + ' €' : '—';
    if (elChange && displayPct != null) {
      elChange.textContent = (displayPct >= 0 ? '+' : '') + displayPct.toFixed(2) + ' % sur la période';
      elChange.style.color = displayPct >= 0 ? 'var(--positive)' : 'var(--negative)';
    }

    if (_wlChartInstances[i]) { _wlChartInstances[i].destroy(); delete _wlChartInstances[i]; }

    if (loading) loading.style.display = 'none';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    _wlChartInstances[i] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: pts,
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: lineColor,
          tension: 0.2,
          fill: true,
          spanGaps: true,
          backgroundColor: (ctx2) => {
            const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 180);
            g.addColorStop(0, isUp ? 'rgba(0,224,158,0.15)' : 'rgba(255,77,106,0.15)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            return g;
          },
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#10121c',
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            titleColor: '#8892a8',
            bodyColor: '#edf0f7',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: ctx2 => ' ' + toEur(ctx2.parsed.y, meta.currency).toFixed(2) + ' €',
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#495068',
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              maxTicksLimit: 6,
              maxRotation: 0,
            }
          },
          y: {
            position: 'right',
            grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
            border: { display: false },
            ticks: {
              color: '#495068',
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              maxTicksLimit: 5,
              callback: v => v.toFixed(2),
            }
          }
        }
      }
    });

  } catch(e) {
    if (loading) { loading.textContent = 'Données indisponibles'; loading.style.display = 'flex'; }
    canvas.style.display = 'none';
  }
}

async function enrichWatchlistRow(w, i) {
  const row = document.getElementById('wl-row-' + i);
  if (!row) return;
  const elPrice  = row.querySelector('.wl-price');
  const elDay    = row.querySelector('.wl-daychg');
  const elSpark  = row.querySelector('.wl-spark');
  const elSince  = row.querySelector('.wl-since');
  const setErr = el => { if (el) { el.textContent = '—'; el.style.color = 'var(--text3)'; } };

  try {
    const raw = await fetchWatchlistChart(w.ticker);
    const d = JSON.parse(raw);
    const res = d.chart && d.chart.result && d.chart.result[0];
    if (!res) throw new Error('no data');
    const meta = res.meta || {};
    const ts = res.timestamp || [];
    const closes = (res.indicators && res.indicators.quote && res.indicators.quote[0].close) || [];

    const livePrice = meta.regularMarketPrice;
    // closes[n-2] = close d'hier (chartPreviousClose = début du range 2mo, pas hier)
    const dailyCloses = closes.filter(Boolean);
    const prevClose = dailyCloses.length >= 2 ? dailyCloses[dailyCloses.length - 2]
                    : (meta.previousClose ?? meta.chartPreviousClose ?? null);
    const dayChgPct = (livePrice != null && prevClose) ? ((livePrice / prevClose - 1) * 100) : null;

    // Prix live converti en €
    if (elPrice) {
      const priceEur = livePrice != null ? toEur(livePrice, meta.currency) : null;
      elPrice.textContent = priceEur != null ? priceEur.toFixed(2) + ' €' : '—';
    }

    // Variation jour
    if (elDay) {
      if (dayChgPct == null) { setErr(elDay); }
      else {
        elDay.textContent = (dayChgPct >= 0 ? '+' : '') + dayChgPct.toFixed(2) + ' %';
        elDay.style.color = dayChgPct >= 0 ? 'var(--positive)' : 'var(--negative)';
      }
    }

    // Sparkline 30 derniers points
    if (elSpark) {
      const sparkPts = [];
      for (let k = 0; k < ts.length; k++) if (closes[k] != null) sparkPts.push(closes[k]);
      const points30 = sparkPts.slice(-30);
      if (points30.length >= 2) {
        elSpark.innerHTML = sparklineSVG(points30);
      } else {
        elSpark.innerHTML = '<div style="height:30px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:10px">—</div>';
      }
    }

    // Perf depuis ajout
    if (elSince) {
      const addedPrice = w.addedPrice || w.price;
      if (addedPrice && livePrice != null) {
        const pct = (livePrice / addedPrice - 1) * 100;
        elSince.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + ' %';
        elSince.style.color = pct >= 0 ? 'var(--positive)' : 'var(--negative)';
      } else setErr(elSince);
    }

  } catch (e) {
    setErr(elPrice); setErr(elDay); setErr(elSince);
    if (elSpark) elSpark.innerHTML = '<div style="height:30px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:10px">—</div>';
  }
}

// Mini sparkline SVG 120×30
function sparklineSVG(points) {
  if (!points || points.length < 2) return '';
  const w = 120, h = 30, pad = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = (max - min) || 1;
  const xStep = (w - 2*pad) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * xStep;
    const y = pad + (h - 2*pad) * (1 - (p - min) / range);
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const last = points[points.length - 1], first = points[0];
  const isUp = last >= first;
  const color = isUp ? '#00e09e' : '#ff4d6a';
  const areaFill = isUp ? 'rgba(0,224,158,0.12)' : 'rgba(255,77,106,0.12)';
  // zone remplie sous la courbe
  const areaCoords = coords + ' ' + (w - pad).toFixed(1) + ',' + (h - pad).toFixed(1) + ' ' + pad.toFixed(1) + ',' + (h - pad).toFixed(1);
  return (
    '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="display:block">' +
      '<polygon points="' + areaCoords + '" fill="' + areaFill + '"/>' +
      '<polyline points="' + coords + '" fill="none" stroke="' + color + '" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>'
  );
}

// Cache pour dividendYield (évite de re-spammer Yahoo)
const _wlDivYieldCache = {};
async function fetchDividendYield(ticker) {
  if (ticker in _wlDivYieldCache) return _wlDivYieldCache[ticker];
  try {
    const yt = resolveToYahooTicker(ticker);
    const raw = await fetchWithFallback(
      'https://query1.finance.yahoo.com/v8/finance/chart/'
      + encodeURIComponent(yt)
      + '?interval=1d&range=1d'
    );
    const meta = JSON.parse(raw)?.chart?.result?.[0]?.meta;
    let dy = null;
    if (meta) {
      if (meta.trailingAnnualDividendYield != null) dy = meta.trailingAnnualDividendYield;
      else if (meta.trailingAnnualDividendRate && meta.regularMarketPrice)
        dy = meta.trailingAnnualDividendRate / meta.regularMarketPrice;
    }
    _wlDivYieldCache[ticker] = dy;
    return dy;
  } catch (e) {
    _wlDivYieldCache[ticker] = null;
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  ANIMATION DES PRIX AU REFRESH (tableau « Mes titres »)
//  renderPortfolio() reconstruit tout le <tbody> : on relève donc les
//  valeurs AVANT le re-render, et on n'anime après coup que les lignes
//  dont un chiffre a réellement bougé : le prix actuel et la valeur
//  défilent de l'ancien vers le nouveau.
// ═══════════════════════════════════════════════════
const PX_COUNT_MS = 1500;   // durée du comptage

function _pxReduceMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// Photo des chiffres affichés, indexée par ticker.
function _pxSnapshot() {
  const m = new Map();
  document.querySelectorAll('#portfolio-tbody tr[data-tk]').forEach(tr => {
    if (!tr.dataset.tk) return;
    m.set(tr.dataset.tk, {
      px:  +tr.dataset.px,
      val: +tr.dataset.val,
      pnl: +tr.dataset.pnl,
      pct: +tr.dataset.pct,
      chg: +tr.dataset.chg,
      day: +tr.dataset.day,
    });
  });
  return m;
}

// Mêmes tickers, même ordre qu'avant le rendu ? Alors seuls les chiffres
// ont pu bouger, et il ne faut pas rejouer l'animation d'entrée des lignes.
function _pxSameComposition(before) {
  if (!before || !before.size) return false;
  const now = Array.prototype.map.call(
    document.querySelectorAll('#portfolio-tbody tr[data-tk]'), tr => tr.dataset.tk);
  const was = Array.from(before.keys());
  return now.length === was.length && now.every((tk, i) => tk === was[i]);
}

// Formats des colonnes animées, calqués sur ceux du rendu.
const _pxFmtPct    = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
const _pxFmtEurSgn = (v) => (v >= 0 ? '+' : '') + fmt(Math.abs(v));
const _pxFmtDayEur = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + ' €';

// Fait défiler le nombre de `from` à `to` (easeOutCubic).
function _pxCount(el, from, to, format) {
  if (!el || !isFinite(from) || !isFinite(to) || from === to) return;
  format = format || fmt;
  const t0 = performance.now();
  (function step(now) {
    const t = Math.min((now - t0) / PX_COUNT_MS, 1);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = format(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = format(to);   // valeur exacte en fin de course
  })(t0);
}

function _pxAnimate(before) {
  if (!before || !before.size || _pxReduceMotion()) return;

  document.querySelectorAll('#portfolio-tbody tr[data-tk]').forEach(tr => {
    const old = before.get(tr.dataset.tk);
    if (!old) return;   // ligne ajoutée depuis : rien à comparer

    const now = {
      px:  +tr.dataset.px,
      val: +tr.dataset.val,
      pnl: +tr.dataset.pnl,
      pct: +tr.dataset.pct,
      chg: +tr.dataset.chg,
      day: +tr.dataset.day,
    };
    // Sous le centime affiché, rien ne se voit : on laisse la ligne tranquille
    // plutôt que de la faire clignoter pour un arrondi.
    const dPx = Math.abs(now.px - old.px);
    const dVal = Math.abs(now.val - old.val);
    if (dPx < 0.005 && dVal < 0.005) return;

    // Prix actuel et valeur.
    if (dPx >= 0.005)  _pxCount(tr.querySelector('.c-px'),  old.px,  now.px);
    if (dVal >= 0.005) _pxCount(tr.querySelector('.c-val'), old.val, now.val);

    // +/- value : deux nombres dans le badge, le montant et le pourcentage.
    // La flèche et la couleur, elles, basculent d'un coup.
    _pxCount(tr.querySelector('.bd-eur'), Math.abs(old.pnl), Math.abs(now.pnl));
    _pxCount(tr.querySelector('.bd-pct'), old.pct, now.pct, _pxFmtPct);

    // Perf. totale sous la valeur et perf. jour : chacune s'affiche en % ou en
    // €, on anime donc la grandeur réellement à l'écran.
    _pxCount(tr.querySelector('.perf-total-sub'),
             _perfTotalMode === 'eur' ? old.pnl : old.pct,
             _perfTotalMode === 'eur' ? now.pnl : now.pct,
             _perfTotalMode === 'eur' ? _pxFmtEurSgn : _pxFmtPct);

    _pxCount(tr.querySelector('.perf-jour-cell'),
             _perfJourMode === 'eur' ? old.day : old.chg,
             _perfJourMode === 'eur' ? now.day : now.chg,
             _perfJourMode === 'eur' ? _pxFmtDayEur : _pxFmtPct);
  });
}

// Rejoue les deux animations sans refetch ni écriture : le graphique est
// reconstruit depuis le cache, et les compteurs partent d'une valeur fictive
// pour converger vers la valeur réelle déjà affichée — rien de faux ne reste
// à l'écran. Bouton « Aperçu anim », visible avec ?anim=1 dans l'URL.
window.previewRefreshAnim = function() {
  _pfRevealArmed = true;   // sinon la courbe se contenterait de réapparaître
  try { renderPortfolioChart(); } catch (e) { console.warn('[previewRefreshAnim]', e); }

  document.querySelectorAll('#portfolio-tbody tr[data-tk]').forEach(tr => {
    const px  = +tr.dataset.px,  val = +tr.dataset.val;
    const pnl = +tr.dataset.pnl, pct = +tr.dataset.pct;
    const chg = +tr.dataset.chg, day = +tr.dataset.day;
    const drift = (Math.random() - 0.5) * 0.03;   // ±1,5 %
    const back = (v) => v * (1 - drift);          // point de départ fictif

    _pxCount(tr.querySelector('.c-px'),  back(px),  px);
    _pxCount(tr.querySelector('.c-val'), back(val), val);
    _pxCount(tr.querySelector('.bd-eur'), Math.abs(back(pnl)), Math.abs(pnl));
    _pxCount(tr.querySelector('.bd-pct'), back(pct), pct, _pxFmtPct);
    _pxCount(tr.querySelector('.perf-total-sub'),
             _perfTotalMode === 'eur' ? back(pnl) : back(pct),
             _perfTotalMode === 'eur' ? pnl : pct,
             _perfTotalMode === 'eur' ? _pxFmtEurSgn : _pxFmtPct);
    _pxCount(tr.querySelector('.perf-jour-cell'),
             _perfJourMode === 'eur' ? back(day) : back(chg),
             _perfJourMode === 'eur' ? day : chg,
             _perfJourMode === 'eur' ? _pxFmtDayEur : _pxFmtPct);
  });
};

// Diagnostic App Check, à lancer depuis la console : await checkAppCheck()
// Demande un jeton et dit si Google l'a délivré. N'affiche jamais le jeton
// entier — c'est un identifiant valable une heure.
window.checkAppCheck = async function() {
  if (!window._appCheckMod) return { ok: false, raison: "module App Check non chargé (bloqué par le réseau ou une extension ?)" };
  if (!window._appCheck)    return { ok: false, raison: "App Check non initialisé — voir l'erreur [appcheck] au chargement" };
  try {
    const r = await window._appCheckMod.getToken(window._appCheck, /* forceRefresh */ true);
    return { ok: true, jeton: (r.token || '').slice(0, 12) + '…', longueur: (r.token || '').length };
  } catch (e) {
    return { ok: false, code: e.code || null, raison: e.message };
  }
};

function _initAnimPreviewBtn() {
  if (!/[?&]anim=1(&|$)/.test(location.search)) return;
  const b = document.getElementById('btn-anim-preview');
  if (b) b.style.display = 'inline-flex';
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _initAnimPreviewBtn);
else _initAnimPreviewBtn();

// ═══════════════════════════════════════════════════
// PATCH: renderPortfolio with stagger + drag handles
// ═══════════════════════════════════════════════════
const _origRenderPortfolio = renderPortfolio;
renderPortfolio = function() {
  const _pxBefore = _pxSnapshot();   // avant que le <tbody> soit vidé
  _origRenderPortfolio();
  _pxAnimate(_pxBefore);
  // Halo autour des badges +/- value : même règle que le tracé de la courbe.
  if (_pfRevealArmed) setTimeout(pulseBadges, 200);
  // Le stagger n'a de sens que si le tableau change de composition (ajout,
  // suppression, réordonnancement). Sur un simple refresh de prix, faire
  // reglisser les lignes brouille le comptage des chiffres.
  const _pxStagger = !_pxSameComposition(_pxBefore);
  // Add stagger animations
  const rows = document.querySelectorAll('#portfolio-tbody tr');
  rows.forEach((tr, i) => {
    if (tr.classList.contains('mobile-detail-row')) return;
    if (_pxStagger) {
      tr.classList.add('stagger-row');
      tr.style.animationDelay = (i * 0.04) + 's';
    }
    // Add drag handle
    tr.setAttribute('draggable', 'true');
    tr.addEventListener('dragstart', e => onDragStart(e, i));
    tr.addEventListener('dragend', onDragEnd);
    tr.addEventListener('dragover', onDragOver);
    tr.addEventListener('drop', e => onDrop(e, i));
    // Prepend drag handle to first cell
    const firstTd = tr.querySelector('td');
    const tickerCell = firstTd && firstTd.querySelector('.ticker-cell');
    if (tickerCell && !firstTd.querySelector('.drag-handle')) {
      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.textContent = '⠿';
      tickerCell.prepend(handle);
    }
  });
  // Mini courbe « Valorisation totale » : dessinée avec la VRAIE série
  // d'historique par renderPortfolioChart (plus de random-walk factice, qui
  // écrasait auparavant la vraie courbe). On redessine juste au cas où
  // sparkData.total est déjà rempli.
  setTimeout(updateSparklines, 50);
  // Keep filter
  filterTable();
  // Trigger animations
  setTimeout(() => {
    // animateStatCards() compte depuis zéro : c'est une animation d'entrée.
    // Sur un rafraîchissement, _statSet() a déjà lancé le défilement de
    // l'ancienne vers la nouvelle valeur — la relancer repartirait de zéro.
    if (_pfRevealArmed) animateStatCards();
    initTiltCards();
  }, 60);
  setTimeout(initStatCardsScroll, 300);
};

// Initialize watchlist on page show
const _origShowPage = showPage;
showPage = function(id) {
  _origShowPage(id);
  if (id === 'watchlist')     renderWatchlist();
  if (id === 'notifications') renderNotificationsPage();
};
const _origShowPageMobile = showPageMobile;
showPageMobile = function(id) {
  _origShowPageMobile(id);
  if (id === 'watchlist')     renderWatchlist();
  if (id === 'notifications') renderNotificationsPage();
};
// ═══════════════════════════════════════════════════
//  BASE 100
// ═══════════════════════════════════════════════════
const B100_COLORS = ['#7c6df5','#f5b731','#00e09e','#ff4d6a','#5b8dee'];

// ── Prix mensuels historiques (clôture fin de mois) ──────────────────────────
// ESEE  = BNP Easy S&P 500 (ESE.PA)           FR0013311273
// PUST  = Amundi PEA Nasdaq 100 (PANX.PA)     FR0013412285  (ex-PUST, ticker utilisateur)
// WPEA  = Invesco MSCI World PEA (WPEA.PA)    IE0002XZSHO1
// PAEEM = Amundi PEA MSCI Emerging ESG (PAEEM.PA) FR0013412020
// ESE50 = BNP Easy Euro Stoxx 50 Cap (ESE.PA) FR0012739431  — ticker Euronext : EESE.PA / ESG50
const B100_PRICES = {
  ESEE:  {'2025-02':29.93,'2025-03':29.10,'2025-04':28.50,'2025-05':29.00,'2025-06':29.20,'2025-07':29.40,'2025-08':29.10,'2025-09':28.90,'2025-10':29.30,'2025-11':29.50,'2025-12':29.20,'2026-01':29.40,'2026-02':29.10,'2026-03':29.30},
  PUST:  {'2025-02':72.40,'2025-03':69.80,'2025-04':67.50,'2025-05':70.20,'2025-06':72.10,'2025-07':74.50,'2025-08':73.20,'2025-09':71.80,'2025-10':75.30,'2025-11':78.60,'2025-12':76.90,'2026-01':79.40,'2026-02':87.28,'2026-03':85.14},
  WPEA:  {'2025-02':5.33,'2025-03':5.86,'2025-04':5.394,'2025-05':5.22,'2025-06':5.421,'2025-07':5.508,'2025-08':5.648,'2025-09':5.744,'2025-10':5.95,'2025-11':6.168,'2025-12':6.10,'2026-01':6.145,'2026-02':6.18,'2026-03':6.202},
  PAEEM: {'2025-02':24.60,'2025-03':25.10,'2025-04':24.80,'2025-05':25.40,'2025-06':25.90,'2025-07':26.30,'2025-08':25.70,'2025-09':26.10,'2025-10':26.80,'2025-11':27.20,'2025-12':26.90,'2026-01':27.60,'2026-02':28.10,'2026-03':27.80},
  ESE50: {'2025-02':51.20,'2025-03':52.40,'2025-04':50.80,'2025-05':52.10,'2025-06':53.40,'2025-07':54.20,'2025-08':53.10,'2025-09':52.60,'2025-10':53.80,'2025-11':54.90,'2025-12':54.10,'2026-01':55.60,'2026-02':56.20,'2026-03':55.40},
};

// Cours actuels (mars 2026)
const B100_CURRENT = { ESEE:29.52, PUST:85.73, WPEA:6.14, PAEEM:27.95, ESE50:55.80 };
const B100_NAMES   = {
  ESEE:  'S&P 500 (ESEE)',
  PUST:  'Nasdaq 100 (PUST)',
  WPEA:  'MSCI World (WPEA)',
  PAEEM: 'MSCI Emerging ESG (PAEEM)',
  ESE50: 'Euro Stoxx 50 Cap (ESE50)',
};

let chartBase100 = null;

function getMonths(from, to) {
  const months = [];
  let d = new Date(from + '-01');
  const end = new Date(to + '-01');
  while (d <= end) {
    months.push(d.toISOString().slice(0,7));
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return months;
}

// ─────────────────────────────────────────────────────────────────
//  BENCHMARK PAGE
//  Compare le portefeuille réel (dailyValues broker) à un DCA fictif
//  sur un indice, en utilisant les mêmes dates et montants de versement.
//
//  Corrections appliquées pour une comparaison ÉQUITABLE :
//   - Utilisation des indices Total Return (dividendes réinvestis) quand dispo.
//     CAC 40 et Euro Stoxx 50 n'ont pas de TR sur Yahoo → approximation
//     via un rendement dividende annuel ajouté au prorata temporis.
//   - Conversion EUR/USD pour les indices libellés en USD, pour matcher
//     la base euro du PEA.
// ─────────────────────────────────────────────────────────────────
let benchmarkChart = null;
let _benchCache = {}; // { ticker: { prices, liveQuote, currency } }
let _fxCache = null;  // { dateStr: EUR->USD rate, live: latest }

// Config par indice :
//   - ticker    : symbole Yahoo à utiliser
//   - name      : libellé affiché
//   - divYield  : dividende annuel à ajouter si l'indice n'est PAS Total Return
//                 (0 = l'indice est déjà TR, pas d'ajustement)
const BENCH_CONFIG = {
  '^GSPC':    { ticker: '^SP500TR',   name: 'S&P 500 (TR)',        divYield: 0,      isUSD: true  },
  '^FCHI':    { ticker: '^FCHI',      name: 'CAC 40',              divYield: 0.032,  isUSD: false }, // ~3.2%/an dividendes CAC 40
  'URTH':     { ticker: 'URTH',       name: 'MSCI World',          divYield: 0,      isUSD: true  }, // ETF capitalisant
  '^STOXX50E':{ ticker: '^STOXX50E',  name: 'Euro Stoxx 50',       divYield: 0.030,  isUSD: false }, // ~3%/an dividendes
  '^NDX':     { ticker: '^NDX',      name: 'Nasdaq 100',          divYield: 0.011,  isUSD: true  }, // ~1.1%/an dividendes (^XNDX Yahoo n'a pas l'historique)
};

async function fetchIndexDaily(cfgKey, period1) {
  const cfg = BENCH_CONFIG[cfgKey] || BENCH_CONFIG['^GSPC'];
  const cacheKey = cfg.ticker;
  if (_benchCache[cacheKey]) return { ..._benchCache[cacheKey], cfg };

  const p1 = Math.floor(new Date(period1 + 'T00:00:00').getTime() / 1000);
  const p2 = Math.floor(Date.now() / 1000) + 86400;
  const raw = await fetchWithFallback(
    'https://query1.finance.yahoo.com/v8/finance/chart/'
    + encodeURIComponent(cfg.ticker)
    + '?interval=1d&period1=' + p1 + '&period2=' + p2
  );
  const d = JSON.parse(raw);
  const res = d.chart && d.chart.result && d.chart.result[0];
  if (!res || !res.timestamp) throw new Error('Pas de données Yahoo pour ' + cfg.ticker);
  const ts = res.timestamp;
  const closes = res.indicators.quote[0].close;
  const adjcloses = (res.indicators.adjclose && res.indicators.adjclose[0].adjclose) || closes;
  const prices = {};
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue;
    const key = new Date(ts[i] * 1000).toISOString().slice(0, 10);
    prices[key] = adjcloses[i] != null ? adjcloses[i] : closes[i];
  }
  const liveQuote = res.meta && res.meta.regularMarketPrice;
  const currency = res.meta && res.meta.currency;
  const data = { prices, liveQuote, currency };
  _benchCache[cacheKey] = data;
  return { ...data, cfg };
}

// Récupère les taux EUR/USD historiques (et live) pour convertir les indices USD
async function fetchEURUSD(period1) {
  if (_fxCache) return _fxCache;
  const p1 = Math.floor(new Date(period1 + 'T00:00:00').getTime() / 1000);
  const p2 = Math.floor(Date.now() / 1000) + 86400;
  const raw = await fetchWithFallback(
    'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD%3DX'
    + '?interval=1d&period1=' + p1 + '&period2=' + p2
  );
  const d = JSON.parse(raw);
  const res = d.chart && d.chart.result && d.chart.result[0];
  if (!res || !res.timestamp) throw new Error('Pas de données EUR/USD');
  const ts = res.timestamp;
  const closes = res.indicators.quote[0].close;
  const rates = {};
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue;
    const key = new Date(ts[i] * 1000).toISOString().slice(0, 10);
    rates[key] = closes[i];
  }
  const live = res.meta && res.meta.regularMarketPrice;
  _fxCache = { rates, live };
  return _fxCache;
}

function getIndexPriceAt(prices, dateStr) {
  if (prices[dateStr] != null) return prices[dateStr];
  const keys = Object.keys(prices).sort();
  let last = null;
  for (const k of keys) {
    if (k > dateStr) break;
    last = prices[k];
  }
  return last;
}

function getFxAt(fx, dateStr) {
  if (fx.rates[dateStr] != null) return fx.rates[dateStr];
  const keys = Object.keys(fx.rates).sort();
  let last = null;
  for (const k of keys) {
    if (k > dateStr) break;
    last = fx.rates[k];
  }
  return last;
}

// Convertit un prix USD → EUR à une date donnée
// prixUSD / tauxEURUSD(date) = prixEUR
function toEUR(priceUSD, fx, dateStr, isLive) {
  const rate = isLive ? fx.live : getFxAt(fx, dateStr);
  if (!rate) return priceUSD; // fallback sans conversion
  return priceUSD / rate;
}

// Applique l'ajustement dividendes : pour un indice "price return" qui verse
// un dividende yield annuel, on fait pousser la valeur comme si on avait
// réinvesti les dividendes au prorata du temps écoulé.
// adjustedValue = rawValue × (1 + divYield × années_écoulées)
// C'est une approximation linéaire, largement suffisante pour une comparaison.
function applyDivYield(value, divYield, daysHeld) {
  if (!divYield || daysHeld <= 0) return value;
  const yearsHeld = daysHeld / 365.25;
  return value * (1 + divYield * yearsHeld);
}

// ─────────────────────────────────────────────────────────────────
//  REFRESH — vide tous les caches et relance le preload
//  Appelé par le bouton ↻ dans la sidebar.
// ─────────────────────────────────────────────────────────────────
let _refreshBusy = false;

async function refreshAll() {
  if (_refreshBusy) return;   // déjà en cours
  _refreshBusy = true;

  // Deux points d'entrée : le popover ⋯ et le bouton de l'entête « Mes titres ».
  const btns = document.querySelectorAll('#btn-refresh-data, #btn-refresh-titres');
  btns.forEach(b => { b.classList.add('spinning'); b.disabled = true; });
  // Le bouton vit dans le popover ⋯, que le clic referme aussitôt : sans le
  // toast, l'utilisateur n'aurait aucun retour pendant les quelques secondes
  // de fetch.
  _showChatToast({ icon: IC.clock, title: 'Actualisation…',
                   msg: 'Récupération des cours en cours.', duration: 60000 });

  try {
    // Vider tous les caches connus
    try { for (const k in _benchCache) delete _benchCache[k]; } catch(e){}
    try { _fxCache = null; } catch(e){}
    try { _perfCache = null; } catch(e){}
    try { for (const k in _wlChartCache) delete _wlChartCache[k]; } catch(e){}
    try { for (const k in _wlDivYieldCache) delete _wlDivYieldCache[k]; } catch(e){}

    // Relancer le preload
    await preloadAll();

    // Rafraîchir la page actuellement affichée
    const activePage = document.querySelector('.page.active');
    if (activePage) {
      const id = activePage.id.replace('page-', '');
      // Ces catch étaient muets : une donnée corrompue cassait le rendu sans
      // qu'aucune trace n'apparaisse. On avale toujours (le refresh doit finir),
      // mais on laisse une trace exploitable.
      const _warn = (what, e) => console.warn('[refreshAll] ' + what, e);
      if (id === 'benchmark')    { try { initBenchmark(); }    catch(e){ _warn('benchmark', e); } }
      if (id === 'performance')  { try { initPerformance(); }  catch(e){ _warn('performance', e); } }
      if (id === 'watchlist')    { try { renderWatchlist(); }  catch(e){ _warn('watchlist', e); } }
      if (id === 'portfolio')    { try { renderPortfolio(); }  catch(e){ _warn('portfolio', e); } }
    }

    // Les cours du portefeuille ne passent pas par preloadAll() : c'est
    // refreshPrices() qui met à jour currentPrice/changePct, et qui rappelle
    // renderPortfolio() lui-même quand quelque chose a bougé. On le lance en
    // dernier pour qu'aucun rendu ultérieur n'écrase l'animation des prix.
    try { await refreshPrices(); } catch (e) { console.warn('[refreshAll] prix', e); }

    checkPriceAlerts();
    _showChatToast({ icon: IC.checkCirc, title: 'Données à jour',
                     msg: 'Cours et graphiques actualisés.', duration: 3000 });
  } catch (e) {
    console.warn('[refreshAll]', e);
    _showChatToast({ icon: IC.warning, title: 'Actualisation impossible',
                     msg: 'Réessayez dans un instant.', duration: 5000 });
  } finally {
    _refreshBusy = false;
    btns.forEach(b => { b.classList.remove('spinning'); b.disabled = false; });
  }
}

// ─────────────────────────────────────────────────────────────────
//  PRELOAD — lance tous les fetch lourds au login en arrière-plan
//  pour que les pages Benchmark, Performance et Watchlist s'affichent
//  instantanément quand l'utilisateur clique dessus.
// ─────────────────────────────────────────────────────────────────
async function preloadAll() {
  const tasks = [];

  // ── Benchmark : fetch EUR/USD + les 5 indices sur 10 ans ──
  // Remplit _benchCache et _fxCache. Quand l'utilisateur ouvre Benchmark,
  // plus aucun fetch n'est nécessaire pour les périodes ≤ 10 ans.
  const tenYearsAgo = new Date(Date.now() - 3650 * 86400000).toISOString().slice(0,10);
  tasks.push(fetchEURUSD(tenYearsAgo).catch(() => null));
  for (const t of ['^GSPC', '^FCHI', 'URTH', '^STOXX50E', '^NDX']) {
    tasks.push(fetchIndexDaily(t, tenYearsAgo).catch(() => null));
  }

  // ── Performance : précalcule le résultat si on peut ──
  // Si le CSV broker est importé (dailyValues non vide), c'est quasi-instantané
  // côté CPU. Sinon, on lance le gros fetch multi-tickers Yahoo.
  const portfolio = getPortfolio(currentUser);
  const txs = getTransactions(currentUser);
  if (portfolio.length || txs.length) {
    tasks.push(
      computeAnnualPerformance(portfolio, txs)
        .then(r => { _perfCache = r; })
        .catch(() => null)
    );
  }

  // ── Watchlist : enrichir chaque ligne (prix live + div yield) ──
  // Les fetch individuels remplissent leurs propres caches (chart + quoteSummary).
  // On ne rend pas le DOM ici (il n'existe peut-être pas encore), on fait juste
  // chauffer les caches Yahoo pour que renderWatchlist soit instantané au clic.
  const wl = getWatchlist(currentUser);
  for (const w of wl) {
    if (!w.ticker) continue;
    tasks.push(fetchWatchlistChart(w.ticker).catch(() => null));
    tasks.push(fetchDividendYield(w.ticker).catch(() => null));
  }

  // On attend tout en parallèle. Tout est non-bloquant pour l'UI principale.
  await Promise.allSettled(tasks);
}


//  Affiche une courbe par indice + PEA, normalisées en base 100.
//  Sélecteur de période : 1J, 1S, 1M, 3M, 6M, YTD, 1A, 3A, 5A, 10A, Max.
// ─────────────────────────────────────────────────────────────────

// État global
let _benchCurrentPeriod = '6M';

// Périodes : durée en jours depuis aujourd'hui, ou label spécial
const BENCH_PERIODS = {
  '1D':  { days: 1,    label: '1 jour' },
  '1W':  { days: 7,    label: '1 semaine' },
  '1M':  { days: 30,   label: '1 mois' },
  '3M':  { days: 90,   label: '3 mois' },
  '6M':  { days: 180,  label: '6 mois' },
  'YTD': { days: null, label: 'YTD' },
  '1Y':  { days: 365,  label: '1 an' },
  '3Y':  { days: 1095, label: '3 ans' },
  '5Y':  { days: 1825, label: '5 ans' },
  '10Y': { days: 3650, label: '10 ans' },
  'MAX': { days: null, label: 'Depuis 1er versement' },
};

// Couleurs assignées à chaque série (stable)
const BENCH_COLORS = {
  PEA:         '#00e09e',
  '^GSPC':     '#378ADD',
  '^FCHI':     '#F0997B',
  'URTH':      '#AFA9EC',
  '^STOXX50E': '#EF9F27',
  '^NDX':      '#ED93B1',
};

const BENCH_NAMES = {
  PEA:         'Mon PEA',
  '^GSPC':     'S&P 500',
  '^FCHI':     'CAC 40',
  'URTH':      'MSCI World',
  '^STOXX50E': 'Euro Stoxx 50',
  '^NDX':      'Nasdaq 100',
};

// Indices désactivés par l'utilisateur (clés masquées sur le graphe Benchmark).
const _benchHidden = new Set();

// Bascule l'affichage d'un indice sur le graphe Benchmark.
function toggleBenchIndex(key) {
  if (_benchHidden.has(key)) _benchHidden.delete(key);
  else _benchHidden.add(key);
  if (benchmarkChart) {
    benchmarkChart.data.datasets.forEach((ds, i) => {
      if (ds._key === key) benchmarkChart.setDatasetVisibility(i, !_benchHidden.has(key));
    });
    benchmarkChart.update();
  }
  const chip = document.querySelector('.bench-toggle[data-key="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
  if (chip) chip.classList.toggle('off', _benchHidden.has(key));
}

// Rend les puces de sélection d'indices au-dessus du graphe.
function renderBenchToggles(datasets) {
  const el = document.getElementById('bench-index-toggles');
  if (!el) return;
  el.innerHTML = datasets.map(ds => {
    const off = _benchHidden.has(ds._key);
    return '<button class="bench-toggle' + (off ? ' off' : '') + '" data-key="' + ds._key + '"'
      + ' style="--chip:' + ds.borderColor + '"'
      + ' onclick="toggleBenchIndex(\'' + ds._key + '\')">'
      + '<span class="bench-toggle-dot"></span>' + ds.label + '</button>';
  }).join('');
}

// Calcule la date de début pour une période donnée
function benchStartDateFor(period) {
  const today = new Date();
  today.setHours(0,0,0,0);
  if (period === 'YTD') return new Date(today.getFullYear(), 0, 1).toISOString().slice(0,10);
  if (period === 'MAX') {
    const vers = getVersements(currentUser);
    if (!vers.length) return today.toISOString().slice(0,10);
    return vers.reduce((min, v) => (v.date && v.date < min ? v.date : min), '9999-12-31');
  }
  const cfg = BENCH_PERIODS[period];
  if (!cfg || !cfg.days) return today.toISOString().slice(0,10);
  const d = new Date(today.getTime() - cfg.days * 86400000);
  return d.toISOString().slice(0,10);
}

// Bind des boutons de période (appelé une fois)
function bindBenchPeriodButtons() {
  const btns = document.querySelectorAll('.bench-period-btn');
  btns.forEach(btn => {
    btn.onclick = () => {
      const p = btn.dataset.p;
      _benchCurrentPeriod = p;
      btns.forEach(b => b.classList.toggle('active', b.dataset.p === p));
      initBenchmark();
    };
  });
  // Activer le bouton de la période courante
  btns.forEach(b => b.classList.toggle('active', b.dataset.p === _benchCurrentPeriod));
}

async function initBenchmark() {
  const kpiEl    = document.getElementById('bench-kpis');
  const statusEl = document.getElementById('bench-status');
  if (!kpiEl) return;

  // S'assurer que les boutons sont bindés
  if (!document.querySelector('.bench-period-btn.active')) bindBenchPeriodButtons();
  else bindBenchPeriodButtons(); // idempotent

  const dailyValues = getDailyValues(currentUser);
  const versements  = getVersements(currentUser);

  const period = _benchCurrentPeriod;
  const periodCfg = BENCH_PERIODS[period];
  const startDate = benchStartDateFor(period);
  const today = new Date().toISOString().slice(0,10);

  kpiEl.innerHTML = '<div class="stat-card"><div class="stat-label">Chargement…</div></div>';
  if (statusEl) statusEl.textContent = 'Période : ' + periodCfg.label;

  // Fetch les 5 indices + FX en parallèle
  const tickers = ['^GSPC', '^FCHI', 'URTH', '^STOXX50E', '^NDX'];
  // fetch la plus longue période nécessaire : on prend 11 ans pour couvrir "10A"
  const fetchFrom = period === 'MAX'
    ? (versements.length ? versements[0].date : today)
    : new Date(Date.now() - 3650 * 86400000).toISOString().slice(0,10);

  let fx = null;
  let indices = {};
  try {
    const results = await Promise.all([
      fetchEURUSD(fetchFrom),
      ...tickers.map(t => fetchIndexDaily(t, fetchFrom).catch(() => null)),
    ]);
    fx = results[0];
    for (let i = 0; i < tickers.length; i++) {
      if (results[i+1]) indices[tickers[i]] = results[i+1];
    }
  } catch (e) {
    kpiEl.innerHTML = '<div class="stat-card"><div class="stat-label" style="color:var(--negative)">Erreur Yahoo</div><div class="stat-sub">' + (e.message || 'Indisponible') + '</div></div>';
    return;
  }

  // ── Construire les séries base 100 pour chaque indice + le PEA ──
  const series = {};

  // Prix en EUR du jour J, après conversion FX et ajustement dividendes
  // Retourne { date -> valeur EUR ajustée }
  function buildEurSerie(ticker) {
    const data = indices[ticker];
    if (!data || !data.cfg) return null;
    const cfg = data.cfg;
    const prices = data.prices;
    const keys = Object.keys(prices).sort();
    const serie = {};
    // Pour l'ajustement dividendes, on prend la date de début de la série
    // comme référence : les valeurs plus tard sont ajustées par le prorata.
    const firstDate = keys[0];
    for (const k of keys) {
      let px = prices[k];
      if (cfg.isUSD && fx) {
        const r = getFxAt(fx, k);
        if (r) px = px / r;
      }
      if (cfg.divYield > 0) {
        const days = (new Date(k) - new Date(firstDate)) / 86400000;
        const years = days / 365.25;
        px = px * (1 + cfg.divYield * years);
      }
      serie[k] = px;
    }
    return serie;
  }

  for (const t of tickers) {
    const s = buildEurSerie(t);
    if (s) series[t] = s;
  }

  // Série PEA : à partir des dailyValues broker
  // Pour obtenir une "perf pure" (sans effet DCA), on chaîne les rendements
  // quotidiens en neutralisant les versements.
  // Résultat : une courbe "PEA base 100" qui ne grossit pas à chaque versement
  // mais reflète seulement la performance des actifs.
  if (dailyValues && dailyValues.length >= 2) {
    const peaSerie = {};
    const dvMap = {};
    for (const dv of dailyValues) dvMap[dv.date] = dv.value;
    const dvDates = Object.keys(dvMap).sort();

    const versByDate = {};
    for (const v of versements) {
      if (!v.date) continue;
      versByDate[v.date] = (versByDate[v.date] || 0) + v.amount;
    }

    // Chaînage TWR quotidien :
    //   twr(J) = twr(J-1) × V_J / (V_J-1 + vers_J)
    // On démarre à 100 au premier jour
    let twr = 100;
    let prevValue = null;
    for (let i = 0; i < dvDates.length; i++) {
      const d = dvDates[i];
      const val = dvMap[d];
      if (i === 0) {
        peaSerie[d] = twr;
        prevValue = val;
        continue;
      }
      const versJ = versByDate[d] || 0;
      const denom = prevValue + versJ;
      if (denom > 0.01) {
        twr *= val / denom;
      }
      peaSerie[d] = +twr.toFixed(4);
      prevValue = val;
    }
    series.PEA = peaSerie;
  }

  // ── Normaliser toutes les séries en base 100 sur la période sélectionnée ──
  // Pour chaque série, on prend la première valeur disponible dans [startDate, today]
  // comme "valeur de référence" → base 100.
  const datasets = [];
  const kpis = []; // { key, name, perfPct, color }

  const orderedKeys = ['PEA', '^GSPC', '^FCHI', 'URTH', '^STOXX50E', '^NDX'];

  for (const key of orderedKeys) {
    const serie = series[key];
    if (!serie) continue;
    const keys = Object.keys(serie).sort().filter(d => d >= startDate && d <= today);
    if (keys.length < 2) continue;
    const base = serie[keys[0]];
    if (!base || base <= 0) continue;

    const points = keys.map(d => ({ x: d, y: +((serie[d] / base) * 100 - 100).toFixed(3) }));
    const perfPct = points[points.length - 1].y;

    datasets.push({
      _key: key,
      label: BENCH_NAMES[key],
      data: points,
      borderColor: BENCH_COLORS[key],
      backgroundColor: key === 'PEA' ? 'rgba(0,224,158,0.08)' : 'transparent',
      borderWidth: key === 'PEA' ? 2.5 : 1.5,
      fill: key === 'PEA',
      tension: 0.2,
      pointRadius: 0,
      pointHoverRadius: 3,
      hidden: _benchHidden.has(key),
    });

    kpis.push({ key, name: BENCH_NAMES[key], perfPct, color: BENCH_COLORS[key] });
  }

  // ── KPI par indice (perf sur la période) ──
  // Tri du meilleur au pire, PEA toujours en premier
  const peaKpi = kpis.find(k => k.key === 'PEA');
  const otherKpis = kpis.filter(k => k.key !== 'PEA').sort((a, b) => b.perfPct - a.perfPct);
  const orderedKpis = peaKpi ? [peaKpi, ...otherKpis] : otherKpis;

  const col = v => v >= 0 ? 'var(--positive)' : 'var(--negative)';
  const sgn = v => v >= 0 ? '+' : '';

  if (!orderedKpis.length) {
    kpiEl.innerHTML = '<div class="stat-card"><div class="stat-label">Aucune donnée</div><div class="stat-sub">Pour la période ' + periodCfg.label + '</div></div>';
  } else {
    kpiEl.innerHTML = orderedKpis.map(k => {
      const isPEA = k.key === 'PEA';
      return '<div class="stat-card" style="border-left:3px solid ' + k.color + (isPEA ? ';background:rgba(0,224,158,0.04)' : '') + '">' +
        '<div class="stat-label">' + k.name.toUpperCase() + '</div>' +
        '<div class="stat-value" style="color:' + col(k.perfPct) + '">' + sgn(k.perfPct) + k.perfPct.toFixed(2) + ' %</div>' +
        '<div class="stat-sub">' + periodCfg.label + '</div>' +
      '</div>';
    }).join('');
  }
  startKpisAutoScroll('bench-kpis');

  if (statusEl) {
    const missing = [];
    if (!series.PEA) missing.push('PEA (importez le CSV broker)');
    statusEl.textContent = 'Période : ' + periodCfg.label + ' · ' + startDate + ' → ' + today
      + (missing.length ? ' · ' + missing.join(', ') : '');
  }

  // ── Render du graphique ──
  renderBenchmarkMultiChart(datasets);
}

function renderBenchmarkMultiChart(datasets) {
  const ctx = document.getElementById('chart-benchmark');
  if (!ctx) return;
  if (benchmarkChart) { benchmarkChart.destroy(); benchmarkChart = null; }

  // Chart.js type: 'time' nécessite un adapter de dates (pas chargé ici).
  // On convertit en axe catégoriel : on construit une liste unifiée de labels
  // (union de toutes les dates), et chaque dataset mappe ses valeurs dessus.
  const allDatesSet = new Set();
  for (const ds of datasets) {
    for (const pt of ds.data) allDatesSet.add(pt.x);
  }
  const labels = [...allDatesSet].sort();

  // Formatter d'affichage pour l'axe X : DD/MM
  const shortLabels = labels.map(d => {
    const [y, m, day] = d.split('-');
    return day + '/' + m;
  });

  // Densité des ticks : on ne met pas plus de ~10 labels visibles
  const maxTicks = 10;
  const step = Math.max(1, Math.ceil(labels.length / maxTicks));

  // Convertir chaque dataset : data = array aligné sur labels (null si absent)
  const normalizedDatasets = datasets.map(ds => {
    const byDate = {};
    for (const pt of ds.data) byDate[pt.x] = pt.y;
    return {
      ...ds,
      data: labels.map(d => byDate[d] != null ? byDate[d] : null),
      spanGaps: true,
    };
  });

  benchmarkChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: { labels: shortLabels, datasets: normalizedDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function(items) {
              if (!items.length) return '';
              return labels[items[0].dataIndex] || '';
            },
            label: function(ctx) {
              if (ctx.parsed.y == null) return null;
              const v = ctx.parsed.y;
              const sign = v >= 0 ? '+' : '';
              return ctx.dataset.label + ' : ' + sign + v.toFixed(2) + ' %';
            }
          }
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#8892a8',
            font: { size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: maxTicks,
            callback: function(val, idx) {
              return idx % step === 0 ? shortLabels[idx] : '';
            },
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: {
            color: '#8892a8',
            font: { size: 10 },
            callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) + ' %',
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  });

  renderBenchToggles(datasets);
}

function initBase100() {
  const months = getMonths('2025-02', '2026-03');
  const livretMonthly = 0.025 / 12;
  const livretData = months.map((_, i) => parseFloat((100 * Math.pow(1 + livretMonthly, i)).toFixed(3)));

  const tickers = Object.keys(B100_PRICES);
  const datasets = [];

  tickers.forEach((t, i) => {
    const ph = B100_PRICES[t];
    const keys = Object.keys(ph).sort();
    if (!keys.length) return;
    const firstKey = keys[0];
    const firstPrice = ph[firstKey];

    const data = months.map(m => {
      if (m < firstKey) return null;
      const known = keys.filter(k => k <= m);
      if (!known.length) return null;
      const lastKey = known[known.length - 1];
      const price = (lastKey === keys[keys.length - 1] && B100_CURRENT[t]) ? B100_CURRENT[t] : ph[lastKey];
      return parseFloat(((price / firstPrice) * 100).toFixed(2));
    });

    datasets.push({
      label: t,
      data,
      borderColor: B100_COLORS[i % B100_COLORS.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      spanGaps: false,
    });
  });

  // Livret A dataset
  datasets.unshift({
    label: 'Livret A',
    data: livretData,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderDash: [4, 3],
    pointRadius: 0,
    tension: 0.2,
  });

  const ctx = document.getElementById('chart-base100');
  if (!ctx) return;
  if (chartBase100) { chartBase100.destroy(); chartBase100 = null; }

  chartBase100 = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#12141f',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#8892a8',
          bodyColor: '#edf0f7',
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) : '—'}`,
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#495068', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#495068', font: { size: 10 } },
          afterDataLimits: axis => { axis.min = Math.min(axis.min, 95); }
        }
      },
      annotation: {},
    }
  });

  // Custom legend
  const legend = document.getElementById('b100-legend');
  if (legend) {
    legend.innerHTML = tickers.map((t, i) =>
      `<div style="display:flex;align-items:center;gap:5px">
        <span style="width:14px;height:3px;background:${B100_COLORS[i % B100_COLORS.length]};display:inline-block;border-radius:2px"></span>
        <span style="color:var(--text2)">${t}</span>
      </div>`
    ).join('');
  }

  // Table
  const tbody = document.getElementById('b100-tbody');
  if (!tbody) return;
  const livretNow = parseFloat((100 * Math.pow(1 + 0.025 / 12, months.length - 1)).toFixed(2));

  tbody.innerHTML = tickers.map((t, i) => {
    const ph = B100_PRICES[t];
    const keys = Object.keys(ph).sort();
    if (!keys.length) return '';
    const firstPrice = ph[keys[0]];
    const currentPrice = B100_CURRENT[t] || ph[keys[keys.length - 1]];
    const base100Now = parseFloat(((currentPrice / firstPrice) * 100).toFixed(2));
    const perf = ((currentPrice / firstPrice - 1) * 100);
    const vsLA = (base100Now - livretNow);
    const isPos = perf >= 0;
    const vPos = vsLA >= 0;
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <span style="width:10px;height:10px;border-radius:50%;background:${B100_COLORS[i % B100_COLORS.length]};display:inline-block"></span>
        <span style="font-size:12px">${B100_NAMES[t]}</span>
      </div></td>
      <td class="mono" style="font-size:12px">${firstPrice.toFixed(3)} €</td>
      <td class="mono" style="font-size:12px">${currentPrice.toFixed(2)} €</td>
      <td class="mono" style="font-size:13px;font-weight:600">${base100Now.toFixed(1)}</td>
      <td><span class="${isPos ? 'badge-pos' : 'badge-neg'}">${isPos ? '▲' : '▼'} ${Math.abs(perf).toFixed(2)}%</span></td>
      <td class="mono" style="font-size:12px;color:${vPos ? 'var(--positive)' : 'var(--negative)'}">${vPos ? '+' : ''}${vsLA.toFixed(1)} pts</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
//  PROJECTIONS
// ═══════════════════════════════════════════════════
let chartProj = null;

function calcProjections(base, monthly, cagrPct) {
  const mr = cagrPct / 100 / 12;
  const livretMr = 0.025 / 12;
  return [1, 5, 10, 15, 20, 25, 30, 35, 40].map(y => {
    const n = y * 12;
    const grown = base * Math.pow(1 + cagrPct / 100, y);
    const contrib = mr > 0 ? monthly * (Math.pow(1 + mr, n) - 1) / mr : monthly * n;
    const total = parseFloat((grown + contrib).toFixed(2));
    const apports = parseFloat((base + monthly * n).toFixed(2));
    const plusValues = parseFloat((total - apports).toFixed(2));
    const livretGrown = base * Math.pow(1 + 0.025, y);
    const livretContrib = livretMr > 0 ? monthly * (Math.pow(1 + livretMr, n) - 1) / livretMr : monthly * n;
    const livretA = parseFloat((livretGrown + livretContrib).toFixed(2));
    return { years: y, total, apports, plusValues, livretA };
  });
}

function fmtCompact(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2) + ' M€';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + ' k€';
  return n.toFixed(0) + ' €';
}

function projNumStep(id, dir) {
  const el = document.getElementById(id);
  if (!el) return;
  const step = parseFloat(el.step) || 1;
  const cur  = parseFloat(el.value) || 0;
  const next = +(cur + dir * step).toFixed(4);
  el.value = next < 0 ? 0 : next;
  renderProjections();
}

function renderProjections() {
  const base    = parseFloat(document.getElementById('proj-base')?.value) || 0;
  const monthly = parseFloat(document.getElementById('proj-monthly')?.value) || 0;
  const cagr    = parseFloat(document.getElementById('proj-cagr')?.value)    || 0;
  const data    = calcProjections(base, monthly, cagr);

  // Chart
  const ctx = document.getElementById('chart-projections');
  if (ctx) {
    if (chartProj) { chartProj.destroy(); chartProj = null; }
    chartProj = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.years + ' ans'),
        datasets: [
          { label: 'Patrimoine total', data: data.map(d => d.total),      borderColor: '#7c6df5', backgroundColor: 'rgba(124,109,245,0.08)', fill: true,  borderWidth: 2.5, pointRadius: 3, tension: 0.4 },
          { label: 'Apports cumulés', data: data.map(d => d.apports),    borderColor: '#f5b731', backgroundColor: 'transparent',               fill: false, borderWidth: 2,   pointRadius: 2, tension: 0.4, borderDash: [5,3] },
          { label: 'Plus-values',      data: data.map(d => d.plusValues), borderColor: '#00e09e', backgroundColor: 'transparent',               fill: false, borderWidth: 2,   pointRadius: 2, tension: 0.4 },
          { label: 'Livret A',         data: data.map(d => d.livretA),    borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent', fill: false, borderWidth: 1.5, pointRadius: 0, tension: 0.4, borderDash: [3,2] },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#8892a8', font: { size: 11 } } },
          tooltip: {
            backgroundColor: '#12141f', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
            titleColor: '#8892a8', bodyColor: '#edf0f7',
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtCompact(ctx.parsed.y)}` }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#495068', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#495068', font: { size: 10 }, callback: v => fmtCompact(v) } }
        }
      }
    });
  }

  // Table
  const tbody = document.getElementById('proj-tbody');
  if (!tbody) return;
  tbody.innerHTML = data.map((d, i) => {
    const avLA = (d.total - d.livretA);
    const ratioPct = d.apports > 0 ? Math.round(d.plusValues / d.apports * 100) : 0;
    return `<tr style="${i % 2 === 0 ? '' : 'background:var(--s2)'}">
      <td style="font-weight:700;color:var(--accent)">${d.years} ans</td>
      <td class="mono" style="font-weight:600">${fmtCompact(d.total)}</td>
      <td class="mono" style="color:var(--gold)">${fmtCompact(d.apports)}</td>
      <td class="mono" style="color:var(--positive);font-weight:600">${fmtCompact(d.plusValues)}</td>
      <td class="mono" style="color:var(--text2)">${ratioPct}%</td>
      <td class="mono" style="color:var(--text2)">${fmtCompact(d.livretA)}</td>
      <td class="mono" style="color:${avLA >= 0 ? 'var(--positive)' : 'var(--negative)'};font-weight:600">${avLA >= 0 ? '+' : ''}${fmtCompact(avLA)}</td>
    </tr>`;
  }).join('');
}

function initProjections() {
  // Pre-fill base with current portfolio value
  const pf = getPortfolio(currentUser);
  const totalVal = pf.reduce((s, r) => s + r.qty * r.currentPrice, 0);
  const el = document.getElementById('proj-base');
  if (el) el.value = totalVal.toFixed(2);
  renderProjections();
}

// ═══════════════════════════════════════════════════
//  BILAN ANNUEL — 100% dynamique depuis localStorage
// ═══════════════════════════════════════════════════
let chartBilan = null;

function computeBilanAnnuel() {
  const txs        = getTransactions(currentUser);
  const versements = getVersements(currentUser);
  const portfolio  = getPortfolio(currentUser);

  // Valeur actuelle totale des titres (cours live)
  const valeurActuelle = portfolio.reduce((s, r) => s + r.qty * r.currentPrice, 0);

  const years = {};

  // Versements par année
  versements.forEach(v => {
    if (!v.date) return;
    const y = new Date(v.date + 'T12:00:00').getFullYear();
    if (!years[y]) years[y] = { apport: 0, dividendes: 0, realizedPnl: 0, achats: 0, ventes: 0 };
    years[y].apport += v.amount;
  });

  // Si pas de versements, reconstruire depuis les achats
  if (!versements.length) {
    txs.filter(t => t.type === 'buy').forEach(t => {
      if (!t.date) return;
      const y = new Date(t.date + 'T12:00:00').getFullYear();
      if (!years[y]) years[y] = { apport: 0, dividendes: 0, realizedPnl: 0, achats: 0, ventes: 0 };
      years[y].apport += t.qty * t.price;
    });
  }

  // Achats, ventes, PnL réalisé, dividendes — par année
  txs.forEach(t => {
    if (!t.date) return;
    const y = new Date(t.date + 'T12:00:00').getFullYear();
    if (!years[y]) years[y] = { apport: 0, dividendes: 0, realizedPnl: 0, achats: 0, ventes: 0 };
    if (t.type === 'buy')  years[y].achats += t.qty * t.price;
    if (t.type === 'sell') {
      years[y].ventes += t.qty * t.price;
      if (t.realizedPnl != null) years[y].realizedPnl += t.realizedPnl;
    }
    // Les rompus d'attribution gratuite sont du cash encaissé au même titre.
    if (t.type === 'dividend' || t.type === 'distribution') years[y].dividendes += t.qty * t.price;
  });

  const sortedYears = Object.keys(years).map(Number).sort();
  const currentYear = new Date().getFullYear();

  let apportCumul       = 0;
  let achatsCumul       = 0;
  let ventesCumul       = 0;
  const LIVRET_A_RATE   = 0.025;

  return sortedYears.map(y => {
    const d      = years[y];
    const apport = d.apport;
    apportCumul += apport;
    achatsCumul += d.achats;
    ventesCumul += d.ventes;

    // Montant investi en titres à fin de cette année (cumulatif)
    const montantInvesti = Math.max(0, achatsCumul - ventesCumul);

    const apportCumulAvant = apportCumul - apport;
    const livretA = apportCumulAvant * (1 + LIVRET_A_RATE) + apport * (1 + LIVRET_A_RATE / 2);

    const isCurrentYear = (y === currentYear);

    // PV latente = valeur actuelle - montant investi cumulé jusqu'à cette année
    const pv      = montantInvesti > 0 ? valeurActuelle - montantInvesti : null;
    // Perf = PV latente / montant investi (comme Bourso)
    const perfPct = montantInvesti > 0 && pv !== null ? pv / montantInvesti : null;

    // Gains réalisés = uniquement ceux de cette année
    const realizedPnlAnnee = parseFloat(d.realizedPnl.toFixed(2));

    return {
      year:           y,
      label:          isCurrentYear ? y + ' YTD' : String(y),
      isYTD:          isCurrentYear,
      apport,                          // versements de l'année
      apportTotal:    apportCumul,     // versements cumulés
      montantInvesti,                  // achats - ventes cumulés jusqu'à cette année
      achatsAnnee:    d.achats,        // achats de l'année seulement
      ventesAnnee:    d.ventes,        // ventes de l'année seulement
      pv,                              // PV latente sur base investie cumulée
      perfPct,
      livretA:        parseFloat(livretA.toFixed(2)),
      realizedPnl:    realizedPnlAnnee, // PnL réalisé de l'année uniquement
      dividendes:     parseFloat(d.dividendes.toFixed(2)),
    };
  });
}

function initBilan() {
  const cards       = document.getElementById('bilan-cards');
  const data        = computeBilanAnnuel();
  const currentYear = new Date().getFullYear();

  if (!data.length) {
    if (cards) cards.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:24px;text-align:center">Aucune donnée — ajoutez des transactions ou des versements.</div>';
    return;
  }

  // ── Cards ────────────────────────────────────────
  if (cards) {
    cards.innerHTML = data.map(y => {
      // Pour l'année en cours : valeur réelle vs Livret A
      // Pour les années passées : on compare les versements cumulés vs ce qu'aurait donné le Livret A
      const valeurPourLA = y.isYTD && y.pv !== null
        ? y.montantInvesti + y.pv   // valeur réelle du portefeuille
        : null;                      // pas de valeur historique disponible
      const avLA  = valeurPourLA !== null ? (valeurPourLA - y.livretA) : null;
      const avPos = avLA !== null && avLA >= 0;

      const rows = [
        { label: "Versements de l'année",    value: y.apport.toFixed(2) + ' €',        color: 'var(--text)' },
        { label: 'Versements cumulés',        value: y.apportTotal.toFixed(2) + ' €',   color: 'var(--text2)' },
        { label: 'Investi en titres (cumul)', value: y.montantInvesti.toFixed(2) + ' €', color: 'var(--text2)' },
        y.isYTD && y.pv !== null ? null : null,
        y.realizedPnl !== 0
          ? { label: 'Gains réalisés (' + y.year + ')', value: (y.realizedPnl >= 0 ? '+' : '') + y.realizedPnl.toFixed(2) + ' €', color: y.realizedPnl >= 0 ? 'var(--positive)' : 'var(--negative)' }
          : null,
        y.dividendes > 0
          ? { label: 'Dividendes reçus (' + y.year + ')', value: y.dividendes.toFixed(2) + ' €', color: 'var(--gold)' }
          : null,
      ].filter(Boolean);

      return `<div class="section-card">
        <div style="margin-bottom:14px">
          <div style="font-family:var(--display);font-size:20px;font-weight:700">${y.label}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0">
          ${rows.map(row => `
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text3);font-size:12px">${row.label}</span>
            <span style="color:${row.color};font-size:13px;font-weight:${row.bold ? 700 : 500};font-family:var(--mono)">${row.value}</span>
          </div>`).join('')}
        </div>
        <div style="margin-top:12px;background:var(--s3);border-radius:10px;padding:10px 14px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text3);font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:5px">${IC.barchart}<span>vs Livret A 2,5%</span></div>
          ${(() => {
            if (y.isYTD && y.pv !== null) {
              // YTD : PV latente vs intérêts Livret A proratisés sur l'année en cours
              const now = new Date();
              const startOfYear = new Date(now.getFullYear(), 0, 1);
              const fractionAnnee = (now - startOfYear) / (365.25 * 24 * 3600 * 1000);
              const pvLivret   = y.montantInvesti * 0.025 * fractionAnnee;
              const avantage   = y.pv - pvLivret;
              const avantagePos = avantage >= 0;
              return '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
                '<span style="color:var(--text2);font-size:12px">Ma plus-value latente</span>' +
                '<span style="font-family:var(--mono);font-size:13px;font-weight:700;color:' + (y.pv >= 0 ? 'var(--positive)' : 'var(--negative)') + '">' + (y.pv >= 0 ? '+' : '') + y.pv.toFixed(2) + ' €</span>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
                '<span style="color:var(--text2);font-size:12px">PV Livret A équivalent</span>' +
                '<span style="font-family:var(--mono);font-size:12px;color:var(--text2)">+' + pvLivret.toFixed(2) + ' €</span>' +
              '</div>' +
              '<div style="height:1px;background:var(--border);margin:6px 0"></div>' +
              '<div style="display:flex;justify-content:space-between">' +
                '<span style="color:var(--text2);font-size:12px">Avantage portefeuille</span>' +
                '<span style="font-family:var(--mono);font-size:13px;font-weight:700;color:' + (avantagePos ? 'var(--positive)' : 'var(--negative)') + '">' + (avantagePos ? '+' : '') + avantage.toFixed(2) + ' €</span>' +
              '</div>';
            } else {
              // Années passées : gains réalisés vs intérêts Livret A sur l'année pleine
              const pvLivret   = y.montantInvesti * 0.025;
              const avantage   = y.realizedPnl - pvLivret;
              const avantagePos = avantage >= 0;
              return '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
                '<span style="color:var(--text2);font-size:12px">Gains réalisés (' + y.year + ')</span>' +
                '<span style="font-family:var(--mono);font-size:13px;font-weight:700;color:' + (y.realizedPnl >= 0 ? 'var(--positive)' : 'var(--negative)') + '">' + (y.realizedPnl >= 0 ? '+' : '') + y.realizedPnl.toFixed(2) + ' €</span>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
                '<span style="color:var(--text2);font-size:12px">PV Livret A équivalent</span>' +
                '<span style="font-family:var(--mono);font-size:12px;color:var(--text2)">+' + pvLivret.toFixed(2) + ' €</span>' +
              '</div>' +
              '<div style="height:1px;background:var(--border);margin:6px 0"></div>' +
              '<div style="display:flex;justify-content:space-between">' +
                '<span style="color:var(--text2);font-size:12px">Avantage portefeuille</span>' +
                '<span style="font-family:var(--mono);font-size:13px;font-weight:700;color:' + (avantagePos ? 'var(--positive)' : 'var(--negative)') + '">' + (avantagePos ? '+' : '') + avantage.toFixed(2) + ' €</span>' +
              '</div>';
            }
          })()}
        </div>
      </div>`;
    }).join('');
  }

  // ── Graphique ────────────────────────────────────
  const ctx = document.getElementById('chart-bilan');
  if (!ctx) return;
  if (chartBilan) { chartBilan.destroy(); chartBilan = null; }

  chartBilan = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(y => y.label),
      datasets: [
        {
          label: 'Portefeuille',
          data: data.map(y => y.isYTD && y.pv !== null ? y.montantInvesti + y.pv : null),
          backgroundColor: 'rgba(124,109,245,0.75)',
          borderColor: '#7c6df5',
          borderWidth: 1, borderRadius: 4,
        },
        {
          label: 'Livret A simulé',
          data: data.map(y => y.livretA),
          backgroundColor: 'rgba(255,77,106,0.75)',
          borderColor: '#ff4d6a',
          borderWidth: 1, borderRadius: 4,
        },
        {
          label: 'Apports cumulés',
          data: data.map(y => y.apportTotal),
          backgroundColor: 'rgba(245,183,49,0.75)',
          borderColor: '#f5b731',
          borderWidth: 1, borderRadius: 4,
        },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8892a8', font: { size: 11 } } },
        tooltip: {
          backgroundColor: '#12141f', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
          titleColor: '#8892a8', bodyColor: '#edf0f7',
          callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y != null ? c.parsed.y.toFixed(2) + ' €' : '—'}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#495068', font: { size: 12 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#495068', font: { size: 10 }, callback: v => fmtCompact(v) } }
      }
    }
  });
}

// ═══════════════════════════════════════════════════
//  TROPHÉES
// ═══════════════════════════════════════════════════
const TROPHIES = {
  patrimoine: { label: IC.briefcase + ' Patrimoine',  key: 'patrimoine', paliers: [500,1000,1500,2000,2500,3000,3500,4000,4500,5000] },
  rendement:  { label: IC.trending + ' Plus-value',  key: 'rendement',  paliers: [50,100,150,200,250,300,350,400,450,500] },
  dividendes: { label: IC.gift + ' Dividendes',  key: 'dividendes', paliers: [10,20,30,40,50,60,70,80,90,100] },
};

function initTrophees() {
  const pf   = getPortfolio(currentUser);
  const txs  = getTransactions(currentUser);

  const totalVal      = pf.reduce((s, r) => s + r.qty * r.currentPrice, 0);
  const totalInvested = pf.reduce((s, r) => s + r.qty * r.buyPrice, 0);
  const totalPnl      = totalVal - totalInvested;

  // Solde espèces = versements - achats + ventes + dividendes
  const versements  = getVersements(currentUser);
  const totalVersements = versements.reduce((s, v) => s + v.amount, 0);
  let totalAchats = 0, totalVentes = 0, totalDividendes = 0, totalDistributions = 0;
  txs.forEach(tx => {
    if (tx.type === 'buy')  totalAchats += tx.qty * tx.price;
    if (tx.type === 'sell') totalVentes += tx.qty * tx.price;
    if (tx.type === 'dividend') totalDividendes += tx.qty * tx.price;
    if (tx.type === 'distribution') totalDistributions += tx.qty * tx.price;
  });
  const cash = Math.max(0, totalVersements - totalAchats + totalVentes + totalDividendes + totalDistributions);

  // Patrimoine total = titres + espèces
  const patrimoine = totalVal + cash;
  // Dividends: sum realizedPnl from 'dividend' type or estimate from known yields
  const divEstim = pf.reduce((s, r) => s + (r.dividendYield ? r.dividendYield * r.qty * r.currentPrice : 0), 0);

  const values = { patrimoine, rendement: totalPnl, dividendes: divEstim };

  // Summary
  const summary = document.getElementById('trophy-summary');
  if (summary) {
    const totalUnlocked = Object.values(TROPHIES).reduce((s, cat) => s + cat.paliers.filter(p => values[cat.key] >= p).length, 0);
    const totalPossible = Object.values(TROPHIES).reduce((s, cat) => s + cat.paliers.length, 0);
    const nextPatrimoine = TROPHIES.patrimoine.paliers.find(p => values.patrimoine < p) || TROPHIES.patrimoine.paliers[TROPHIES.patrimoine.paliers.length - 1];
    summary.innerHTML = `
      <div class="stat-card">
        <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.trophy}Total débloqués</div>
        <div class="stat-value" style="color:var(--gold)">${totalUnlocked} / ${totalPossible}</div>
        <div class="stat-change pos">Trophées obtenus</div>
      </div>
      <div class="stat-card">
        <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.briefcase}Patrimoine</div>
        <div class="stat-value">${patrimoine.toFixed(0)} €</div>
        <div class="stat-change pos" style="font-size:10px">Titres ${totalVal.toFixed(0)} € + Espèces ${cash.toFixed(2)} €</div>
      </div>
      <div class="stat-card">
        <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.trending}Plus-value latente</div>
        <div class="stat-value" style="color:${totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)'}">${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)} €</div>
        <div class="stat-change ${totalPnl >= 0 ? 'pos' : 'neg'}">${TROPHIES.rendement.paliers.filter(p => totalPnl >= p).length} / ${TROPHIES.rendement.paliers.length} paliers</div>
      </div>
      <div class="stat-card">
        <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.target}Prochain palier</div>
        <div class="stat-value" style="color:var(--accent2)">${nextPatrimoine.toLocaleString('fr-FR')} €</div>
        <div class="stat-change">Patrimoine</div>
      </div>
    `;
  }

  // Categories
  const cats = document.getElementById('trophy-categories');
  if (!cats) return;
  cats.innerHTML = Object.values(TROPHIES).map(cat => {
    const current = values[cat.key];
    const unlocked = cat.paliers.filter(p => current >= p).length;
    return `<div class="section-card">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <div style="font-family:var(--display);font-size:16px;font-weight:700">${cat.label}</div>
        <div style="font-size:12px;color:var(--accent)">${unlocked} / ${cat.paliers.length}</div>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:14px">Actuel : <span style="font-family:var(--mono);color:var(--text)">${current.toFixed(0)} €</span></div>
      <div style="display:flex;flex-direction:column;gap:9px">
        ${cat.paliers.map(s => {
          const ok  = current >= s;
          const pct = Math.min(100, (current / s) * 100).toFixed(0);
          return `<div style="display:flex;align-items:center;gap:8px">
            <span style="flex-shrink:0;display:flex">${ok ? IC.checkCirc : IC.square}</span>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:11px;color:${ok ? 'var(--positive)' : 'var(--text3)'};font-weight:${ok ? 600 : 400}">${s.toLocaleString('fr-FR')} €</span>
                <span style="font-size:10px;color:var(--text3);font-family:var(--mono)">${pct}%</span>
              </div>
              <div style="height:3px;background:var(--s4);border-radius:2px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${ok ? 'var(--positive)' : 'var(--accent)'};border-radius:2px;opacity:${ok ? 1 : 0.5};transition:width .5s ease"></div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
//  CALENDRIER
// ═══════════════════════════════════════════════════
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-based

const CAL_DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const CAL_MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function getCalEvents() {
  const txs        = getTransactions(currentUser) || [];
  const versements = getVersements(currentUser)   || [];
  const events     = [];

  // Achats
  txs.filter(t => t.type === 'buy' && t.date).forEach(t => {
    events.push({
      date:   t.date,
      type:   'buy',
      label:  t.name || t.ticker || '—',
      detail: `${t.qty} × ${t.price.toFixed(2)} €`,
      amount: t.qty * t.price,
    });
  });

  // Dividendes reçus
  txs.filter(t => t.type === 'dividend' && t.date).forEach(t => {
    events.push({
      date:   t.date,
      type:   'dividend',
      label:  t.name || t.ticker || 'Dividende',
      detail: `${(t.qty * t.price).toFixed(2)} €`,
      amount: t.qty * t.price,
    });
  });

  // Versements
  versements.filter(v => v.date).forEach(v => {
    events.push({
      date:   v.date,
      type:   'deposit',
      label:  'Versement',
      detail: `${v.amount.toFixed(2)} €`,
      amount: v.amount,
    });
  });

  return events;
}

function calPrevMonth() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendrier();
}
function calNextMonth() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendrier();
}
function calGoToday() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendrier();
}

function renderCalendrier() {
  const label = document.getElementById('cal-month-label');
  if (label) label.textContent = CAL_MONTHS_FR[calMonth] + ' ' + calYear;

  const allEvents = getCalEvents();

  // ── Grille mensuelle ─────────────────────────────
  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  // En-têtes jours
  let html = CAL_DAYS_FR.map(d =>
    `<div class="cal-day-header">${d}</div>`
  ).join('');

  // 1er jour du mois (0=dim → ajuster pour lundi=0)
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);
  let startDow   = firstDay.getDay(); // 0=dim
  startDow = startDow === 0 ? 6 : startDow - 1; // lundi=0

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Jours du mois précédent (padding)
  const prevLast = new Date(calYear, calMonth, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevLast - i;
    html += `<div class="cal-day other-month"><div class="cal-day-num">${d}</div></div>`;
  }

  // Jours du mois courant
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const dayEvents = allEvents.filter(e => e.date === dateStr);

    const dots = dayEvents.slice(0, 3).map(e =>
      `<div class="cal-dot ${e.type}">${e.type === 'buy' ? '▲ ' : e.type === 'dividend' ? IC.wallet + ' ' : '➕ '}${e.label}</div>`
    ).join('');
    const more = dayEvents.length > 3
      ? `<div style="font-size:9px;color:var(--text3);margin-top:1px">+${dayEvents.length - 3} autres</div>` : '';

    html += `<div class="cal-day${isToday ? ' today' : ''}${dayEvents.length ? ' has-events' : ''}">
      <div class="cal-day-num">${d}</div>
      <div class="cal-dot-wrap">${dots}${more}</div>
    </div>`;
  }

  // Padding fin
  const totalCells = startDow + lastDay.getDate();
  const remainder  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remainder; d++) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${d}</div></div>`;
  }

  grid.innerHTML = html;

  // ── Liste événements du mois ──────────────────────
  const monthStr  = `${calYear}-${String(calMonth + 1).padStart(2,'0')}`;
  const monthEvts = allEvents
    .filter(e => e.date.startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  const countEl = document.getElementById('cal-event-count');
  if (countEl) countEl.textContent = `${monthEvts.length} événement${monthEvts.length !== 1 ? 's' : ''}`;

  const listEl = document.getElementById('cal-event-list');
  if (!listEl) return;

  if (!monthEvts.length) {
    listEl.innerHTML = '<div class="cal-empty">Aucun événement ce mois-ci</div>';
    return;
  }

  const typeLabel = { buy: 'ACHAT', deposit: 'VERSEMENT', dividend: 'DIVIDENDE' };
  const amountColor = { buy: 'var(--accent)', deposit: 'var(--positive)', dividend: 'var(--gold)' };

  listEl.innerHTML = monthEvts.map(e => {
    const day = new Date(e.date + 'T12:00:00').toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
    return `<div class="cal-event-item">
      <span class="cal-event-date">${day}</span>
      <span class="cal-event-badge ${e.type}">${typeLabel[e.type]}</span>
      <span class="cal-event-desc">${e.label}${e.detail && e.type !== 'deposit' ? ' — ' + e.detail : ''}</span>
      <span class="cal-event-amount" style="color:${amountColor[e.type]}">${e.type === 'buy' ? '−' : '+'}${e.amount.toFixed(2)} €</span>
    </div>`;
  }).join('');
}

function initCalendrier() {
  calYear  = new Date().getFullYear();
  calMonth = new Date().getMonth();
  renderCalendrier();
}

// ═══════════════════════════════════════════════════
//  DIVIDENDES
// ═══════════════════════════════════════════════════

const DIV_FREQ = {
  default:  { freq: 1, months: [5] },
  'MC.PA':  { freq: 2, months: [4, 12] },
  'TTE.PA': { freq: 4, months: [3, 6, 9, 12] },
  'BNP.PA': { freq: 1, months: [6] },
  'ACA.PA': { freq: 1, months: [6] },
  'ENGI.PA':{ freq: 1, months: [5] },
  'AI.PA':  { freq: 1, months: [6] },
  'SAN.PA': { freq: 2, months: [3, 9] },
};

function getNextDivDate(ticker) {
  const freq = DIV_FREQ[ticker] || DIV_FREQ['default'];
  const now  = new Date();
  const month = now.getMonth() + 1;
  const future = freq.months.find(m => m > month);
  const nextM  = future || freq.months[0];
  const nextY  = future ? now.getFullYear() : now.getFullYear() + 1;
  return new Date(nextY, nextM - 1, 15).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

let _divYieldCache = {};

async function refreshDividendes() {
  _divYieldCache = {};
  const btn = document.getElementById('btn-div-refresh');
  const icon = document.getElementById('div-refresh-icon');
  if (btn) btn.disabled = true;
  if (icon) icon.innerHTML = IC.clock;
  await initDividendes();
  if (btn) btn.disabled = false;
  if (icon) icon.textContent = '↻';
}

// Cache dividendes fetchés automatiquement
// Cache dividendes depuis le fichier JSON généré par GitHub Actions
let _divHistoryCache  = {};
let _divJsonLoaded    = false;
let _divJsonData      = {};
let _divAllEntries    = [];
let _divShowAll       = false;

async function loadDivJson() {
  if (_divJsonLoaded) return;
  try {
    const res  = await fetch('data/dividendes.json');
    if (!res.ok) throw new Error('Fichier non trouvé');
    const json = await res.json();
    _divJsonData   = json.dividends || {};
    _divJsonLoaded = true;
    // Afficher la date de génération dans le sous-titre
    const subEl = document.querySelector('#page-dividendes .page-subtitle span');
    if (subEl && json.generated_at) subEl.textContent = '✦ Données Mistral AI · mis à jour le ' + new Date(json.generated_at).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'});
  } catch(e) {
    console.warn('dividendes.json non disponible, historique vide.', e);
    _divJsonLoaded = true;
  }
}

async function fetchDivHistory(ticker) {
  if (_divHistoryCache[ticker] !== undefined) return _divHistoryCache[ticker];

  let history = [];

  // Fetch real dividend history from Yahoo Finance (exact amounts)
  try {
    const yahooTicker = resolveToYahooTicker(ticker);
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(yahooTicker) + '?interval=1mo&range=10y&events=div';
    const raw = await fetchWithFallback(url);
    const json = JSON.parse(raw);
    const divEvents = json?.chart?.result?.[0]?.events?.dividends;
    if (divEvents) {
      history = Object.values(divEvents).map(d => ({
        date:   new Date(d.date * 1000).toISOString().slice(0, 10),
        amount: d.amount,
        label:  'Dividende',
      }));
    }
  } catch(e) {
    console.warn('fetchDivHistory Yahoo error for', ticker, e);
  }

  // Inject next dividend from JSON (estimated/confirmed) — Yahoo doesn't have future events
  await loadDivJson();
  const jsonData = _divJsonData[ticker];
  if (jsonData?.next?.date) {
    const alreadyIn = history.find(h => h.date === jsonData.next.date);
    const todayStr  = new Date().toISOString().slice(0, 10);
    const isPast    = jsonData.next.date <= todayStr;
    if (!alreadyIn) {
      history.unshift({
        date:   jsonData.next.date,
        amount: jsonData.next.amount_estimated || 0,
        label:  jsonData.next.confirmed ? 'Prochain (confirmé)' : (isPast ? 'Dividende' : 'Prochain (estimé)'),
        next:   !isPast,
      });
    }
  }

  history.sort((a, b) => b.date.localeCompare(a.date));
  _divHistoryCache[ticker] = history;
  return history;
}

function calcNextDivDate(history) {
  if (!history || history.length === 0) return '—';
  const today = new Date();
  const dates  = history.map(d => new Date(d.date)).sort((a, b) => b - a);
  // Si le dernier versement est dans le futur, on l'affiche directement
  if (dates[0] > today) {
    return dates[0].toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
  if (dates.length === 1) {
    // Un seul point : suppose annuel
    const d = new Date(dates[0]);
    while (d <= today) d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
  // Intervalle moyen réel entre versements
  let totalGap = 0;
  for (let i = 0; i < dates.length - 1; i++) totalGap += dates[i] - dates[i + 1];
  const avgGapMs = totalGap / (dates.length - 1);
  let next = new Date(dates[0]);
  while (next <= today) next = new Date(next.getTime() + avgGapMs);
  return next.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
}

function getQtyAtDate(txs, ticker, date) {
  let qty = 0;
  for (const t of txs) {
    if ((t.type === 'buy' || t.type === 'sell') && t.ticker === ticker && t.date <= date) {
      qty += t.type === 'buy' ? t.qty : -t.qty;
    }
  }
  return Math.max(0, qty);
}

// Détection + enregistrement automatique des dividendes versés (date passée),
// indépendant de l'ouverture de la page Dividendes. Appelé au démarrage de l'app.
async function _autoLogDividends() {
  if (window.IS_DEMO || !currentUser) return;
  try {
    const pf  = getPortfolio(currentUser);
    const txs = getTransactions(currentUser) || [];
    const ETF_TICKERS = ['WPEA.PA','ESEE.PA','ESE.PA','PUST.PA','PANX.PA','PAEEM.PA','ETZ.PA','EWLD.PA','CW8.PA','MWRD.PA','RS2K.PA','PCEU.PA','IUSQ.AS','IWDA.AS','VWCE.AS','VWRL.AS','CSPX.AS','EMIM.AS','XDWD.AS','SPPW.AS','SPY','QQQ','VTI','VT','VOO','ARKK','GLD','TLT','SOXX'];
    const actions = pf.filter(r => r.quoteType !== 'ETF' && r.quoteType !== 'MUTUALFUND' && !ETF_TICKERS.includes(r.ticker));
    if (!actions.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const existingDiv = txs.filter(t => t.type === 'dividend');
    let added = 0;
    await Promise.all(actions.map(async r => {
      const buyTxs   = txs.filter(t => t.type === 'buy' && t.ticker === r.ticker);
      const firstBuy = r.buyDate || (buyTxs.length ? buyTxs.map(t => t.date).sort()[0] : null);
      if (!firstBuy) return;
      let history;
      try { history = await fetchDivHistory(r.ticker); } catch(_) { return; }
      (history || []).forEach(d => {
        if (d.next || d.date < firstBuy || d.date > today) return;
        if (existingDiv.find(t => t.ticker === r.ticker && t.date === d.date)) return;
        if (isDivIgnored(r.ticker, d.date)) return;   // supprimé par l'utilisateur
        const qty = getQtyAtDate(txs, r.ticker, d.date);
        if (!qty || !d.amount) return;
        logTransaction(currentUser, {
          type: 'dividend', ticker: r.ticker, name: r.name || r.ticker,
          qty, price: d.amount, date: d.date, source: 'yahoo-auto',
        });
        existingDiv.push({ ticker: r.ticker, date: d.date });
        added++;
      });
    }));
    if (added) { try { window.renderPortfolio(); } catch(_) {} }
  } catch(e) { console.warn('[dividendes] auto-log:', e && e.message); }
}

function initDividendes() {
  const pf  = getPortfolio(currentUser);
  const txs = getTransactions(currentUser) || [];

  const ETF_TICKERS = ['WPEA.PA','ESEE.PA','ESE.PA','PUST.PA','PANX.PA','PAEEM.PA','ETZ.PA','EWLD.PA','CW8.PA','MWRD.PA','RS2K.PA','PCEU.PA','IUSQ.AS','IWDA.AS','VWCE.AS','VWRL.AS','CSPX.AS','EMIM.AS','XDWD.AS','SPPW.AS','SPY','QQQ','VTI','VT','VOO','ARKK','GLD','TLT','SOXX'];
  const actions = pf.filter(r => r.quoteType !== 'ETF' && r.quoteType !== 'MUTUALFUND' && !ETF_TICKERS.includes(r.ticker));

  const divTxs   = txs.filter(t => t.type === 'dividend');
  const divRecus = divTxs.reduce((s, t) => s + t.qty * t.price, 0);
  // Rompus d'attribution gratuite : encaissés comme un dividende, donc comptés
  // ici, mais gardés sous leur propre libellé — ce n'est pas un dividende.
  const distribTxs   = txs.filter(t => t.type === 'distribution');
  const distribRecus = distribTxs.reduce((s, t) => s + t.qty * t.price, 0);

  // Afficher un état de chargement
  const tbody = document.getElementById('div-tbody');
  const histEl = document.getElementById('div-history');
  if (tbody)  tbody.innerHTML  = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">Chargement des dividendes…</td></tr>';
  if (histEl) histEl.innerHTML = '<div class="cal-empty" style="display:flex;align-items:center;justify-content:center;gap:6px">' + IC.clock + ' Récupération de l\'historique…</div>';

  // KPIs immédiats
  const kpis = document.getElementById('div-kpis');
  if (kpis) kpis.innerHTML = `
    <div class="stat-card" id="div-kpi-recus">
      <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.gift}Dividendes reçus</div>
      <div class="stat-value" style="color:var(--gold)">—</div>
      <div class="stat-change pos">Chargement…</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.list}Actions suivies</div>
      <div class="stat-value">${actions.length}</div>
      <div class="stat-change">Dans le portefeuille</div>
    </div>
    <div class="stat-card" id="div-kpi-holding">
      <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.calendar}Versements pendant détention</div>
      <div class="stat-value">—</div>
      <div class="stat-change">Chargement…</div>
    </div>
    <div class="stat-card" id="div-kpi-next">
      <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.clock}Prochain versement</div>
      <div class="stat-value" style="font-size:16px">—</div>
      <div class="stat-change">Chargement…</div>
    </div>`;

  // Fetch async puis render
  Promise.all(actions.map(async r => {
    const history  = await fetchDivHistory(r.ticker);
    const buyDate  = r.buyDate || null;
    const today    = new Date().toISOString().slice(0, 10);

    // Dividendes manuellement enregistrés pour ce ticker
    const manualReceived = divTxs.filter(t => t.ticker === r.ticker);

    // Récupérer la date d'achat depuis le portfolio OU depuis les transactions
    const buyTxs    = txs.filter(t => t.type === 'buy' && t.ticker === r.ticker);
    const firstBuy  = buyDate || (buyTxs.length ? buyTxs.map(t=>t.date).sort()[0] : null);

    // Dividendes automatiquement détectés : versés pendant la détention, date passée, pas "next"
    const autoReceived = firstBuy
      ? history.filter(d =>
          !d.next &&
          d.date >= firstBuy &&
          d.date <= today &&
          !isDivIgnored(r.ticker, d.date)   // supprimé depuis l'Activité
        )
      : [];

    // Fusionner manuel + auto (éviter doublons par date)
    const allReceived = [...manualReceived];
    autoReceived.forEach(d => {
      const alreadyManual = manualReceived.find(t => t.date === d.date);
      if (!alreadyManual) {
        const qtyAtDate = getQtyAtDate(txs, r.ticker, d.date);
        allReceived.push({ ticker: r.ticker, name: r.name, date: d.date, qty: qtyAtDate, price: d.amount, auto: true });
      }
    });

    const totalRecu     = allReceived.reduce((s, t) => s + t.qty * t.price, 0);
    const duringHolding = firstBuy ? history.filter(d => !d.next && d.date >= firstBuy && d.date <= today && !isDivIgnored(r.ticker, d.date)) : [];
    const nextEntry     = history.find(d => d.next === true);
    const nextEstim     = nextEntry ? new Date(nextEntry.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const lastKnown     = history.find(d => !d.next) || null;
    return { r, history, buyDate: firstBuy, allReceived, totalRecu, duringHolding, nextEstim, lastKnown };
  })).then(rows => {
    // Dividendes auto-détectés Yahoo, date de versement passée (d.date <= today),
    // pas encore enregistrés → enregistrement AUTOMATIQUE (plus de confirmation manuelle).
    const existingDiv = (getTransactions(currentUser) || []).filter(t => t.type === 'dividend');
    if (!window.IS_DEMO) {
      let added = 0;
      rows.forEach(x => x.allReceived.forEach(e => {
        if (!e.auto || !e.qty || !e.price) return;
        if (existingDiv.find(t => t.ticker === e.ticker && t.date === e.date)) return;
        logTransaction(currentUser, {
          type: 'dividend', ticker: e.ticker, name: e.name || e.ticker,
          qty: e.qty, price: e.price, date: e.date, source: 'yahoo-auto',
        });
        existingDiv.push({ ticker: e.ticker, date: e.date }); // évite double-ajout dans la même passe
        added++;
      }));
      if (added) { try { renderPortfolio(); } catch(_) {} }
    }

    // Mettre à jour KPIs dynamiques
    const totalHolding   = rows.reduce((s, x) => s + x.duringHolding.length, 0);
    const totalRecuAuto  = rows.reduce((s, x) => s + x.totalRecu, 0) + distribRecus;
    const totalVersionts = rows.reduce((s, x) => s + x.allReceived.length, 0) + distribTxs.length;
    const nextRows = rows.filter(x => x.nextEstim !== '—').sort((a, b) => a.nextEstim.localeCompare(b.nextEstim));
    const kpiRecus   = document.getElementById('div-kpi-recus');
    const kpiHolding = document.getElementById('div-kpi-holding');
    const kpiNext    = document.getElementById('div-kpi-next');
    if (kpiRecus) kpiRecus.innerHTML = `
      <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.gift}Dividendes reçus</div>
      <div class="stat-value" style="color:var(--gold);font-size:26px">${totalRecuAuto.toFixed(2)} €</div>
      ${totalVersionts > 0 ? `<div class="stat-change pos">${totalVersionts} versement(s) détecté(s)</div>` : ''}`;
    if (kpiHolding) kpiHolding.innerHTML = `
      <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.calendar}Versements pendant détention</div>
      <div class="stat-value">${totalHolding}</div>
      <div class="stat-change">Depuis date d'achat</div>`;
    if (kpiNext && nextRows.length) kpiNext.innerHTML = `
      <div class="stat-label" style="display:flex;align-items:center;gap:6px">${IC.clock}Prochain versement</div>
      <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
        ${logoHtml(nextRows[0].r.ticker, 26, 'ticker-icon')}
        <span style="font-size:13px;font-weight:600;color:var(--text1)">${nextRows[0].r.name || nextRows[0].r.ticker}</span>
      </div>
      <div class="stat-value" style="font-size:16px;color:var(--gold)">${nextRows[0].nextEstim}</div>`;

    startDivKpisAutoScroll();

    // ── Projection dividendes annuels ────────────────────────────────────────
    const projEl = document.getElementById('div-projection-content');
    if (projEl) {
      const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().slice(0, 10);
      const projRows = rows.map(({ r, history, lastKnown }) => {
        const nextEntry = history.find(d => d.next === true);
        const refDiv = nextEntry || lastKnown;
        if (!refDiv) return null;
        const freq = Math.max(history.filter(d => !d.next && d.date >= oneYearAgoStr).length, 1);
        const annual = refDiv.amount * r.qty * freq;
        return { ticker: r.ticker, name: r.name, amount: refDiv.amount, qty: r.qty, freq, annual, announced: !!nextEntry };
      }).filter(Boolean).sort((a, b) => b.annual - a.annual);

      const totalAnnual  = projRows.reduce((s, x) => s + x.annual, 0);
      const totalMonthly = totalAnnual / 12;
      const maxAnnual    = Math.max(...projRows.map(x => x.annual), 1);

      projEl.innerHTML = `
        <div style="display:flex;gap:32px;margin-bottom:20px;flex-wrap:wrap">
          <div>
            <div style="font-size:11px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Annuel estimé</div>
            <div style="font-size:28px;font-weight:700;color:var(--gold);font-family:var(--mono)">${totalAnnual.toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 })} €</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Mensuel moyen</div>
            <div style="font-size:28px;font-weight:700;color:var(--positive);font-family:var(--mono)">${totalMonthly.toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 })} €</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${projRows.map(p => `
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:130px;display:flex;align-items:center;gap:7px;min-width:0">${logoHtml(p.ticker, 22, 'ticker-icon')}<span style="font-size:12px;font-weight:600;color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</span></div>
              <div style="flex:1;background:var(--s2);border-radius:4px;height:6px;overflow:hidden">
                <div style="width:${(p.annual / maxAnnual * 100).toFixed(1)}%;height:100%;background:var(--gold);border-radius:4px;transition:width 0.4s"></div>
              </div>
              <div style="font-family:var(--mono);font-size:12px;color:var(--gold);font-weight:600;width:70px;text-align:right">${p.annual.toFixed(2)} €</div>
              <div style="font-size:10px;color:var(--text3);width:80px;text-align:right">${p.freq}×/an · ${p.amount.toFixed(2)}€/act${p.announced ? ' <span style="color:var(--gold)">·&nbsp;annoncé</span>' : ''}</div>
            </div>`).join('')}
        </div>`;
    }

    // Tableau
    if (tbody) tbody.innerHTML = !rows.length
      ? '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">Aucune action en portefeuille</td></tr>'
      : rows.map(({r, duringHolding, totalRecu, nextEstim, lastKnown}) => {
          const holdingBadge = duringHolding.length > 0
            ? `<span style="background:rgba(0,224,158,0.12);color:var(--positive);border-radius:5px;padding:2px 8px;font-size:10px;font-weight:600">✓ ${duringHolding.length} versement(s)</span>`
            : `<span style="background:var(--s3);color:var(--text3);border-radius:5px;padding:2px 8px;font-size:10px">Aucun depuis achat</span>`;
          const buyStr = r.buyDate ? new Date(r.buyDate+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
          return `<tr>
            <td data-label="Action"><div style="display:flex;align-items:center;gap:8px">
              ${logoHtml(r.ticker, 24, 'ticker-icon')}
              <div><div style="font-size:12px;font-weight:600">${r.name}</div>
              <div style="font-size:10px;color:var(--text2);font-family:var(--mono)">${r.ticker}</div></div>
            </div></td>
            <td data-label="Détenu depuis" class="mono" style="font-size:11px;color:var(--text3)">${buyStr}</td>
            <td data-label="Quantité" class="mono">${r.qty}</td>
            <td data-label="Total reçu" class="mono" style="color:var(--gold);font-weight:600">${totalRecu > 0 ? totalRecu.toFixed(2)+' €' : '—'}</td>
            <td data-label="Dernier div./action" class="mono" style="color:var(--text2)">${lastKnown ? lastKnown.amount.toFixed(2)+' €/action' : '—'}</td>
            <td data-label="Prochain estimé" style="font-size:11px;color:var(--text2)">${nextEstim !== '—' ? nextEstim : '—'}</td>
            <td data-label="Pendant détention">${holdingBadge}</td>
          </tr>`;
        }).join('');

    // Historique complet
    let allEntries = [];
    divTxs.forEach(t => {
      allEntries.push({ date: t.date||'', ticker: t.ticker, name: t.name||t.ticker, amount: t.qty*t.price, perShare: t.price, label: '', source: 'reçu', duringHolding: true });
    });
    distribTxs.forEach(t => {
      allEntries.push({ date: t.date||'', ticker: t.ticker, name: t.name||t.ticker, amount: t.qty*t.price, perShare: null, label: t.label || 'Attribution d\'actions gratuites', source: 'attribution', duringHolding: true });
    });
    rows.forEach(({r, history, buyDate, allReceived}) => {
      const today = new Date().toISOString().slice(0,10);
      const buyTxsFallback = txs.filter(t => t.type==='buy' && t.ticker===r.ticker);
      const firstBuyDate   = buyDate || (buyTxsFallback.length ? buyTxsFallback.map(t=>t.date).sort()[0] : null);
      (history||[]).forEach(d => {
        const alreadyManual = divTxs.find(t => t.ticker===r.ticker && t.date===d.date);
        if (alreadyManual) return;
        if (isDivIgnored(r.ticker, d.date)) return;   // supprimé depuis l'Activité
        const during = firstBuyDate ? (d.date >= firstBuyDate && d.date <= today && !d.next) : false;
        const isAutoReceived = during;
        const qtyForAmount = during ? getQtyAtDate(txs, r.ticker, d.date) : r.qty;
        allEntries.push({
          date: d.date, ticker: r.ticker, name: r.name,
          amount: d.amount * qtyForAmount, perShare: d.amount,
          label: d.label||'', source: isAutoReceived ? 'reçu-auto' : (d.next ? 'annoncé' : 'référence'),
          duringHolding: during || (d.next && (!firstBuyDate || d.date >= firstBuyDate)),
        });
      });
    });
    allEntries.sort((a,b) => b.date.localeCompare(a.date));
    _divAllEntries = allEntries;
    _divShowAll    = false;

    if (histEl) renderDivHistory(histEl);
  }).catch(err => {
    console.error('initDividendes error:', err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--negative);padding:24px"><span style="display:inline-flex;align-items:center;gap:6px">' + IC.warning + ' Erreur lors du chargement des dividendes</span></td></tr>';
    if (histEl) histEl.innerHTML = '<div class="cal-empty" style="display:flex;align-items:center;justify-content:center;gap:6px">' + IC.warning + ' Erreur lors du chargement</div>';
  });
}

function renderDivHistory(histEl) {
  if (!histEl) return;
  const entries  = _divShowAll ? _divAllEntries : _divAllEntries.filter(e => e.duringHolding);
  const hiddenN  = _divAllEntries.filter(e => !e.duringHolding).length;
  if (!_divAllEntries.length) {
    histEl.innerHTML = '<div class="cal-empty">Aucun historique disponible.</div>';
    return;
  }
  const toggleBtn = hiddenN > 0
    ? `<button onclick="toggleDivHistory()" style="background:var(--s3);border:none;border-radius:6px;padding:4px 12px;font-size:11px;color:var(--text2);cursor:pointer;margin-bottom:8px">
        ${_divShowAll ? '▲ Masquer avant achat' : `▼ Avant achat (${hiddenN})`}
       </button>`
    : '';
  const rows = entries.map(e => {
    const ds = e.date ? new Date(e.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const periodBadge = e.duringHolding
      ? '<span style="background:rgba(0,224,158,0.12);color:var(--positive);font-size:10px;padding:1px 7px;border-radius:4px">Pendant détention</span>'
      : '<span style="background:var(--s3);color:var(--text3);font-size:10px;padding:1px 7px;border-radius:4px">Avant achat</span>';
    const statutBadge = e.source==='annoncé'
      ? `<span style="background:rgba(245,183,49,0.12);color:var(--gold);font-size:10px;padding:1px 7px;border-radius:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;margin-top:-1px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Versement annoncé le ${ds}</span>`
      : e.source==='reçu' || e.source==='reçu-auto' || e.source==='attribution'
      ? '<span style="background:rgba(0,224,158,0.15);color:var(--positive);font-size:10px;padding:1px 7px;border-radius:4px">✓ Reçu</span>'
      : '';
    const srcBadge = e.source==='attribution'
      ? '<span style="background:rgba(124,109,245,0.14);color:#a99bff;font-size:10px;padding:1px 7px;border-radius:4px;border:1px solid rgba(124,109,245,0.3);white-space:nowrap">🎁 ATTRIBUTION</span>'
      : e.source==='reçu'
      ? '<span style="background:rgba(124,109,245,0.15);color:#a89cf7;font-size:10px;padding:1px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:3px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a89cf7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Manuel</span>'
      : e.source==='annoncé'
      ? '<span style="background:var(--s2);color:var(--text3);font-size:10px;padding:1px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:3px"><img src="https://www.boursorama.com/favicon.ico" width="11" height="11" style="border-radius:2px;vertical-align:middle">Boursorama</span>'
      : '<span style="background:var(--s2);color:var(--text3);font-size:10px;padding:1px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:3px"><img src="https://finance.yahoo.com/favicon.ico" width="11" height="11" style="border-radius:2px;vertical-align:middle">Yahoo Finance</span>';
    return `<tr>
      <td data-label="Date" class="mono" style="font-size:12px;color:var(--text2)">${ds}</td>
      <td data-label="Action"><div style="display:flex;align-items:center;gap:6px">${logoHtml(e.ticker||'',20,'ticker-icon')}
        <div><span style="font-size:12px">${e.name||e.ticker}</span>
        ${e.label?`<div style="font-size:10px;color:var(--text3)">${e.label}</div>`:''}</div></div></td>
      <td data-label="Montant total" class="mono" style="font-weight:600;color:var(--gold)">${e.amount.toFixed(2)} €</td>
      <td data-label="Par action" class="mono" style="font-size:11px;color:var(--text3)">${e.perShare == null ? '—' : e.perShare.toFixed(3) + ' €/action'}</td>
      <td data-label="Période">${periodBadge}</td>
      <td data-label="Statut">${statutBadge}</td>
      <td data-label="Source">${srcBadge}</td>
    </tr>`;
  }).join('');
  const emptyMsg = !entries.length ? '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">Aucun dividende pendant la période de détention</td></tr>' : rows;
  histEl.innerHTML = `${toggleBtn}<table style="width:100%">
    <thead><tr>
      <th>Date</th><th style="text-align:left">Action</th>
      <th>Montant total</th><th>Par action</th><th>Période</th><th>Statut</th><th>Source</th>
    </tr></thead><tbody>${emptyMsg}</tbody></table>`;
}

function toggleDivHistory() {
  _divShowAll = !_divShowAll;
  renderDivHistory(document.getElementById('div-history'));
}

// Auto-scroll horizontal des KPIs (mobile, RAF pour fluidité iOS Safari)
function startKpisAutoScroll(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (el._kpisRaf) cancelAnimationFrame(el._kpisRaf);
  if (!el._kpisState) {
    el._kpisState = { paused: false };
    const st = el._kpisState;
    el.addEventListener('touchstart', () => { st.paused = true; }, { passive: true });
    el.addEventListener('touchend',   () => { setTimeout(() => { st.paused = false; }, 2500); }, { passive: true });
    el.addEventListener('mouseenter', () => { st.paused = true; });
    el.addEventListener('mouseleave', () => { st.paused = false; });
  }
  let last = 0;
  const step = (ts) => {
    if (!last) last = ts;
    const dt = ts - last;
    last = ts;
    if (!el._kpisState.paused) {
      const max = el.scrollWidth - el.clientWidth;
      if (max > 0) {
        el.scrollLeft += (dt * 33 / 1000); // 33px/s ≈ portfolio
        if (el.scrollLeft >= max - 1) el.scrollLeft = 0;
      }
    }
    el._kpisRaf = requestAnimationFrame(step);
  };
  el._kpisRaf = requestAnimationFrame(step);
}
function startDivKpisAutoScroll() { startKpisAutoScroll('div-kpis'); }

// ── Bouton agrandir chart (plein écran landscape) ──
const EXPAND_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const COLLAPSE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
function _findChartContainer(canvasId) {
  const c = document.getElementById(canvasId);
  if (!c) return null;
  // Wrap direct du canvas (div position:relative ou portf-canvas-wrap)
  return c.parentElement;
}
function toggleChartFullscreen(canvasId, btn) {
  const container = _findChartContainer(canvasId);
  if (!container) return;
  const isOn = container.classList.toggle('chart-fullscreen');
  btn.innerHTML = isOn ? COLLAPSE_ICON : EXPAND_ICON;
  btn.title = isOn ? 'Réduire' : 'Agrandir';
  // Si bouton dans bar dédiée (portfolio), positionne fixed en fullscreen pour rester accessible
  const bar = btn.closest('.chart-expand-bar');
  if (bar) bar.classList.toggle('chart-expand-bar-fullscreen', isOn);
  // Force Chart.js resize
  setTimeout(() => {
    const chart = window.Chart && Chart.getChart && Chart.getChart(canvasId);
    if (chart) chart.resize();
    // Verrouille orientation si possible (mobile uniquement)
    if (isOn && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    } else if (!isOn && screen.orientation && screen.orientation.unlock) {
      try { screen.orientation.unlock(); } catch {}
    }
  }, 100);
}
function _addExpandBtn(canvasId) {
  const container = _findChartContainer(canvasId);
  if (!container) return;
  const card = container.closest('.portf-chart-card, .section-card');
  if ((card || container).querySelector(`.chart-expand-btn[data-target="${canvasId}"]`)) return;
  const btn = document.createElement('button');
  btn.className = 'chart-expand-btn';
  btn.dataset.target = canvasId;
  btn.innerHTML = EXPAND_ICON;
  btn.title = 'Agrandir';
  btn.onclick = (e) => { e.stopPropagation(); toggleChartFullscreen(canvasId, btn); };
  // Portfolio : bar dédiée entre header et canvas, bouton non superposé
  if (canvasId === 'chart-portfolio' && card) {
    const bar = document.createElement('div');
    bar.className = 'chart-expand-bar';
    bar.appendChild(btn);
    card.insertBefore(bar, container);
  } else {
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(btn);
  }
}
function initChartExpandButtons() {
  ['chart-portfolio', 'chart-benchmark', 'chart-projections', 'chart-perf-annual'].forEach(_addExpandBtn);
}

function openDivModal() {
  const pf  = getPortfolio(currentUser);
  const sel = document.getElementById('div-modal-ticker');
  // Positions actuelles + tickers seulement présents dans l'historique : un
  // dividende peut concerner une ligne déjà revendue, que l'auto-détection
  // ne couvre plus.
  const opts = pf.map(r => ({ ticker: r.ticker, name: r.name || r.ticker }));
  const seen = new Set(opts.map(o => o.ticker));
  (getTransactions(currentUser) || []).forEach(t => {
    if (!t.ticker || seen.has(t.ticker)) return;
    seen.add(t.ticker);
    opts.push({ ticker: t.ticker, name: (t.name || t.ticker) + ' (soldée)' });
  });
  if (sel) sel.innerHTML = opts.length
    ? opts.map(o => `<option value="${o.ticker}">${o.name}</option>`).join('')
    : '<option value="">Aucune action enregistrée</option>';
  document.getElementById('div-modal-date').value   = new Date().toISOString().slice(0,10);
  document.getElementById('div-modal-amount').value = '';
  document.getElementById('div-modal-overlay').classList.add('open');
}
function closeDivModal() { document.getElementById('div-modal-overlay').classList.remove('open'); }
function closeDivModalOutside(e) { if (e.target===document.getElementById('div-modal-overlay')) closeDivModal(); }
function confirmDividende() {
  const ticker = document.getElementById('div-modal-ticker').value;
  const amount = parseFloat(document.getElementById('div-modal-amount').value);
  const date   = document.getElementById('div-modal-date').value;
  if (!ticker||!amount||amount<=0||!date) { alert('Veuillez remplir tous les champs.'); return; }
  const pf  = getPortfolio(currentUser);
  const row = pf.find(r => r.ticker === ticker);
  // Quantité détenue le jour du versement, pas la quantité actuelle : sinon le
  // montant par action est faussé dès que la position a bougé depuis.
  const qty = getQtyAtDate(getTransactions(currentUser) || [], ticker, date)
              || (row ? row.qty : 0) || 1;
  // Ressaisie manuelle d'un dividende précédemment supprimé : on lève la
  // pierre tombale, sinon l'historique le masquerait à nouveau.
  const ign = getDivIgnored(currentUser);
  if (ign.includes(_divKey(ticker, date))) {
    saveDivIgnored(currentUser, ign.filter(k => k !== _divKey(ticker, date)));
  }
  const past = (getTransactions(currentUser) || []).find(t => t.ticker === ticker && t.name);
  const name = (row && (row.name || ticker)) || (past && past.name) || ticker;
  logTransaction(currentUser, { type:'dividend', ticker, name, qty, price: parseFloat((amount/qty).toFixed(6)), date });
  closeDivModal();
  initDividendes();
  try { renderActivite(); } catch (_) {}
}

const _origShowPageAnalytique = showPage;
showPage = function(id) {
  _origShowPageAnalytique(id);
  if (id === 'benchmark')    initBenchmark();
  if (id === 'projections')  initProjections();
  if (id === 'bilan')        initBilan();
  if (id === 'dividendes')   initDividendes();
  if (id === 'performance')  initPerformance();
};
const _origShowPageMobileAnalytique = showPageMobile;
showPageMobile = function(id) {
  _origShowPageMobileAnalytique(id);
  if (id === 'benchmark')    initBenchmark();
  if (id === 'projections')  initProjections();
  if (id === 'bilan')        initBilan();
  if (id === 'dividendes')   initDividendes();
  if (id === 'performance')  initPerformance();
};

// ─── PERFORMANCE PAGE ─────────────────────────────────
let perfAnnualChart = null;
let _perfCache = null; // évite de refetch à chaque clic

// Plugin Chart.js : trace une ligne violette à 0 % sur l'axe Y.
const zeroLinePlugin = {
  id: 'zeroLine',
  afterDatasetsDraw(chart) {
    const y = chart.scales.y;
    if (!y) return;
    const y0 = y.getPixelForValue(0);
    if (y0 < y.top || y0 > y.bottom) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y0);
    ctx.lineTo(chartArea.right, y0);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#7c6df5';
    ctx.stroke();
    ctx.restore();
  }
};

// ─────────────────────────────────────────────────────────────────
//  Import du CSV de valorisation quotidienne du broker
//  Formats supportés (auto-détection) :
//    - Boursorama : "Date","Valorisation portefeuille","Perf période portefeuille","Perf cumulée portefeuille"
//    - Générique  : Date,Valeur (séparateur , ou ;)
// ─────────────────────────────────────────────────────────────────
function onImportCSVClick() {
  document.getElementById('input-daily-csv').click();
}

async function importTRTransactionsCSV(lines, parseLine) {
  const successEl = document.getElementById('csv-import-success');
  const statusEl  = document.getElementById('daily-status');
  function showProgress(msg) {
    if (statusEl) statusEl.innerHTML = '<span style="display:inline-flex;vertical-align:middle">' + IC.clock + '</span> ' + msg;
  }

  try {
    const header = parseLine(lines[0]).map(h => h.toLowerCase().trim());
    const col = name => header.indexOf(name);
    const iDate=col('date'), iAccType=col('account_type'), iType=col('type'),
          iSymbol=col('symbol'), iName=col('name'), iShares=col('shares'),
          iPrice=col('price'), iAmount=col('amount'), iFee=col('fee'), iTax=col('tax');

    // 1. Parser les lignes PEA : achats/ventes + dividendes
    const trades = [];      // {date, year, isin, name, type, qty, price, signedCost}
    const dividends = [];   // {date, year, amount}
    for (let i = 1; i < lines.length; i++) {
      const c = parseLine(lines[i]);
      if (!c || c.length < 5) continue;
      if ((c[iAccType] || '').trim() !== 'PEA') continue;
      const type = (c[iType] || '').trim();
      const date = (c[iDate] || '').trim();
      const year = parseInt(date.slice(0, 4), 10);
      if (!year) continue;
      if (type === 'BUY' || type === 'SELL') {
        const isin   = (c[iSymbol] || '').trim();
        const shares = parseFloat(c[iShares]) || 0;
        const price  = parseFloat(c[iPrice])  || 0;
        if (!isin || !shares || price <= 0) continue;
        const fee = iFee >= 0 ? Math.abs(parseFloat(c[iFee]) || 0) : 0;
        const tax = iTax >= 0 ? Math.abs(parseFloat(c[iTax]) || 0) : 0;
        const qty = Math.abs(shares);
        // signedCost = cash net déployé dans les titres : achat positif, vente négative
        const signedCost = (type === 'BUY')
          ? qty * price + fee + tax
          : -(qty * price - fee - tax);
        trades.push({ date, year, isin, name: (c[iName] || '').trim(), type, qty, price, signedCost });
      } else if (type === 'DIVIDEND' || type === 'DIVIDEND_EQUIVALENT_PAYMENT') {
        const amt = parseFloat(c[iAmount]) || 0;
        if (amt > 0) dividends.push({ date, year, amount: amt });
      }
    }

    if (!trades.length) { alert('Aucune transaction PEA (achat/vente) trouvée dans le fichier.'); return; }
    trades.sort((a, b) => a.date < b.date ? -1 : 1);

    // 2. Résoudre ISIN → ticker Yahoo
    showProgress('Résolution des tickers…');
    const isins = [...new Set(trades.map(t => t.isin))];
    const isinToTicker = {}, isinName = {};
    for (const t of trades) if (t.name && !isinName[t.isin]) isinName[t.isin] = t.name;
    await Promise.all(isins.map(async isin => {
      if (ISIN_MAP[isin]) { isinToTicker[isin] = ISIN_MAP[isin]; return; }
      try {
        const raw = await fetchWithFallback(
          'https://query1.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(isin)
          + '&lang=fr&region=FR&quotesCount=3&newsCount=0');
        const q = (JSON.parse(raw).quotes || []).find(x => x.symbol);
        if (q) isinToTicker[isin] = q.symbol;
      } catch {}
    }));

    // 3. Récupérer l'historique de prix Yahoo (cours de clôture quotidiens)
    showProgress('Récupération des prix…');
    const firstDate = trades[0].date;
    const p1 = Math.floor(new Date(firstDate + 'T00:00:00').getTime() / 1000);
    const p2 = Math.floor(Date.now() / 1000) + 86400;
    const priceHistory = {}; // ticker → { 'YYYY-MM-DD': close }
    const uniqueTickers = [...new Set(Object.values(isinToTicker).filter(Boolean))];
    await Promise.all(uniqueTickers.map(async ticker => {
      priceHistory[ticker] = {};
      try {
        const raw = await fetchWithFallback(
          'https://query1.finance.yahoo.com/v8/finance/chart/'
          + encodeURIComponent(ticker) + '?interval=1d&period1=' + p1 + '&period2=' + p2);
        const res = JSON.parse(raw).chart && JSON.parse(raw).chart.result && JSON.parse(raw).chart.result[0];
        if (!res || !res.timestamp) return;
        const closes = res.indicators.quote[0].close;
        res.timestamp.forEach((ts, i) => {
          if (closes[i] == null) return;
          priceHistory[ticker][new Date(ts * 1000).toISOString().slice(0, 10)] = closes[i];
        });
      } catch {}
    }));

    // Prix d'exécution TR par ISIN (fallback si Yahoo absent / incohérent)
    const execByIsin = {};
    for (const t of trades) (execByIsin[t.isin] = execByIsin[t.isin] || []).push({ date: t.date, price: t.price });
    function execPriceAt(isin, date) {
      const list = execByIsin[isin] || [];
      let px = list.length ? list[0].price : null;
      for (const e of list) { if (e.date <= date) px = e.price; else break; }
      return px;
    }

    // 3b. Contrôle de cohérence : si Yahoo diverge >15% du prix d'exécution TR → on rejette Yahoo
    function yahooAt(ticker, date) {
      const ph = priceHistory[ticker];
      if (!ph) return null;
      if (ph[date] != null) return ph[date];
      let px = null;
      for (const d of Object.keys(ph).sort()) { if (d <= date) px = ph[d]; else break; }
      return px;
    }
    for (const isin of isins) {
      const ticker = isinToTicker[isin];
      if (!ticker || !priceHistory[ticker]) continue;
      const ratios = [];
      for (const t of (execByIsin[isin] || [])) {
        const yp = yahooAt(ticker, t.date);
        if (yp != null && t.price > 0) ratios.push(yp / t.price);
      }
      if (ratios.length >= 2) {
        ratios.sort((a, b) => a - b);
        const med = ratios[Math.floor(ratios.length / 2)];
        if (med < 0.85 || med > 1.15) {
          console.warn('[TR import] prix Yahoo incohérent pour', isin, '(' + ticker + ')',
            'ratio médian', med.toFixed(3), '→ fallback prix TR');
          priceHistory[ticker] = {};
        }
      }
    }

    // Prix d'un ISIN à une date : Yahoo si dispo, sinon prix d'exécution TR
    function priceAt(isin, date) {
      const ticker = isinToTicker[isin];
      const yp = ticker ? yahooAt(ticker, date) : null;
      return (yp != null) ? yp : execPriceAt(isin, date);
    }

    // 4. Quantité détenue d'un ISIN à une date donnée
    function heldQtyAt(isin, date) {
      let q = 0;
      for (const t of trades) {
        if (t.isin !== isin || t.date > date) continue;
        q += (t.type === 'BUY') ? t.qty : -t.qty;
      }
      return q;
    }
    // Valeur du portefeuille à une date
    function portfolioValueAt(date) {
      let v = 0;
      for (const isin of isins) {
        const q = heldQtyAt(isin, date);
        if (q <= 0.0000001) continue;
        const px = priceAt(isin, date);
        if (px) v += q * px;
      }
      return v;
    }

    // 5. Performance calendaire année par année
    showProgress('Calcul des performances…');
    const today = new Date().toISOString().slice(0, 10);
    const firstYear = trades[0].year;
    const currentYear = new Date().getFullYear();
    const valueNow = portfolioValueAt(today);

    // Valeur du portefeuille au 31/12 de chaque année close
    const yearEndValue = {};
    for (let y = firstYear; y < currentYear; y++) {
      yearEndValue[y] = portfolioValueAt(y + '-12-31');
    }

    const years = [];
    for (let y = firstYear; y <= currentYear; y++) {
      const vStart = (y === firstYear) ? 0 : (yearEndValue[y - 1] || 0);
      const vEnd   = (y === currentYear) ? valueNow : (yearEndValue[y] || 0);
      let vers = 0;
      for (const t of trades) if (t.year === y) vers += t.signedCost;
      let div = 0;
      for (const d of dividends) if (d.year === y) div += d.amount;
      const base = vStart + vers;
      // Gain = plus-value seule (hors dividendes, comme l'affichage TR). Dividendes = KPI séparé.
      const gain = vEnd - vStart - vers;
      years.push({
        year: y,
        invested: +vers.toFixed(2),
        value:    +vEnd.toFixed(2),
        gain:     +gain.toFixed(2),
        dividends:+div.toFixed(2),
        perfPct:  base > 0.01 ? +(gain / base * 100).toFixed(2) : 0,
      });
    }

    // 6. Totaux
    const totalInvested = trades.reduce((s, t) => s + t.signedCost, 0);
    const totalDiv = dividends.reduce((s, d) => s + d.amount, 0);
    const totalGain = valueNow - totalInvested; // plus-value seule, hors dividendes
    const total = {
      invested: +totalInvested.toFixed(2),
      value:    +valueNow.toFixed(2),
      gain:     +totalGain.toFixed(2),
      dividends:+totalDiv.toFixed(2),
      perfPct:  totalInvested > 0.01 ? +(totalGain / totalInvested * 100).toFixed(2) : 0,
    };

    // 7. Positions actuelles
    const positions = isins.map(isin => {
      const q = heldQtyAt(isin, today);
      const px = priceAt(isin, today) || 0;
      return { isin, ticker: isinToTicker[isin] || '', name: isinName[isin] || isin,
        qty: +q.toFixed(4), price: px, value: +(q * px).toFixed(2) };
    }).filter(p => p.qty > 0.0001).sort((a, b) => b.value - a.value);

    const cohort = { updatedAt: today, years, total, positions };
    saveTRCohort(currentUser, cohort);
    saveDailyValues(currentUser, []); // désactive le path valorisations quotidiennes (Boursorama)
    _perfCache = null;

    if (successEl) {
      successEl.textContent = '✓ ' + trades.length + ' transactions TR importées — performance calculée sur '
        + years.length + ' année(s).';
      successEl.classList.add('visible');
      clearTimeout(successEl._hideTimer);
      successEl._hideTimer = setTimeout(() => successEl.classList.remove('visible'), 8000);
    }

    updateDailyStatus();
    if (typeof initPerformance === 'function') initPerformance();

  } catch (err) {
    console.error('Erreur import TR:', err);
    alert('Erreur lors du traitement du fichier TR : ' + err.message);
    updateDailyStatus();
  }
}

function importDailyValuesCSV(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      let text = e.target.result;
      // Strip BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

      // Détecter séparateur (, ou ;)
      const firstLine = text.split(/\r?\n/)[0];
      const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { alert('Le fichier semble vide ou invalide.'); return; }

      // Parser en tenant compte des guillemets
      function parseLine(line) {
        const out = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') { inQ = !inQ; continue; }
          if (c === sep && !inQ) { out.push(cur); cur = ''; continue; }
          cur += c;
        }
        out.push(cur);
        return out.map(s => s.trim());
      }

      const header = parseLine(lines[0]).map(h => h.toLowerCase().trim());

      // Détection format Trade Republic (colonnes account_type + transaction_id)
      if (header.includes('account_type') && header.includes('transaction_id')) {
        await importTRTransactionsCSV(lines, parseLine);
        return;
      }

      const idxDate = header.findIndex(h => h.includes('date'));
      const idxVal  = header.findIndex(h => h.includes('valorisation') || h.includes('valeur') || h.includes('value'));
      if (idxDate < 0 || idxVal < 0) {
        alert('Colonnes attendues introuvables.\n\nLe fichier doit contenir une colonne "Date" et une colonne "Valorisation" (ou "Valeur").');
        return;
      }

      const rows = [];
      const errors = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = parseLine(lines[i]);
        if (cells.length <= Math.max(idxDate, idxVal)) continue;
        let dateStr = cells[idxDate];
        let valStr  = cells[idxVal];

        // Normalisation date : accepte YYYY-MM-DD ou DD/MM/YYYY
        let isoDate = null;
        const m1 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const m2 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m1) isoDate = dateStr;
        else if (m2) isoDate = m2[3] + '-' + m2[2] + '-' + m2[1];
        if (!isoDate) { errors.push('ligne ' + (i+1) + ' : date invalide "' + dateStr + '"'); continue; }

        // Normalisation valeur : accepte virgule décimale, espace milliers
        valStr = valStr.replace(/\s/g, '').replace(/\u00A0/g, '').replace(',', '.');
        const value = parseFloat(valStr);
        if (!isFinite(value) || value <= 0) { errors.push('ligne ' + (i+1) + ' : valeur invalide "' + cells[idxVal] + '"'); continue; }

        rows.push({ date: isoDate, value: value });
      }

      if (!rows.length) {
        alert('Aucune ligne valide trouvée.\n\n' + (errors.slice(0,3).join('\n') || ''));
        return;
      }

      // Dédupliquer (garder dernière occurrence) et trier
      const byDate = {};
      for (const r of rows) byDate[r.date] = r.value;
      const finalRows = Object.keys(byDate).sort().map(d => ({ date: d, value: byDate[d] }));

      saveDailyValues(currentUser, finalRows);
      saveTRCohort(currentUser, null); // un CSV broker classique désactive le mode cohorte TR
      _perfCache = null;

      const successEl = document.getElementById('csv-import-success');
      if (successEl) {
        let label = '✓ ' + finalRows.length + ' valorisations importées (' + finalRows[0].date + ' → ' + finalRows[finalRows.length-1].date + '). La performance annuelle utilisera désormais ces valeurs broker.';
        if (errors.length) label += ' (' + errors.length + ' ligne(s) ignorée(s))';
        successEl.textContent = label;
        successEl.classList.add('visible');
        clearTimeout(successEl._hideTimer);
        successEl._hideTimer = setTimeout(() => successEl.classList.remove('visible'), 6000);
      }

      updateDailyStatus();
      // Recharger la page perf
      if (typeof initPerformance === 'function') initPerformance();
    } catch (err) {
      console.error('Erreur import CSV daily values:', err);
      alert('Erreur lors de la lecture du fichier : ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function confirmClearDaily() {
  showConfirmModal({
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    title: 'Réinitialiser les données broker ?',
    body: 'Toutes les valorisations importées seront supprimées.\nLa performance sera recalculée depuis Yahoo Finance.',
    onConfirm: clearDailyValues,
    danger: true
  });
}

function showConfirmModal({ icon, title, body, onConfirm, onCancel, okLabel, cancelLabel, danger = false, infoOnly = false }) {
  const modal = document.getElementById('confirm-modal2');
  document.getElementById('confirm-modal2-icon').innerHTML = icon || '';
  document.getElementById('confirm-modal2-title').textContent = title;
  document.getElementById('confirm-modal2-body').textContent = body;
  const okBtn = document.getElementById('confirm-modal2-ok');
  okBtn.style.background = danger ? '#ff4d6a' : '#7c6df5';
  okBtn.textContent = okLabel || 'Confirmer';
  okBtn.onclick = () => { closeConfirmModal(); if (onConfirm) onConfirm(); };
  const cancelBtn = document.getElementById('confirm-modal2-cancel');
  if (cancelBtn) {
    // infoOnly : un seul bouton (OK). Sinon on réaffiche le bouton Annuler.
    cancelBtn.style.display = infoOnly ? 'none' : '';
    cancelBtn.textContent = cancelLabel || 'Annuler';
    cancelBtn.onclick = () => { closeConfirmModal(); if (onCancel) onCancel(); };
  }
  modal.style.display = 'flex';
}

function closeConfirmModal() {
  document.getElementById('confirm-modal2').style.display = 'none';
}

// ─── POPUP CONFIRMATION DIVIDENDES AUTO-DÉTECTÉS ─────
let _divPromptQueue  = [];
let _divPromptActive = false;
const _divDeclined   = new Set();   // refus session : "ticker|date"

function _processDivPromptQueue() {
  if (_divPromptActive) return;
  const item = _divPromptQueue.shift();
  if (!item) return;
  _divPromptActive = true;
  const total  = item.qty * item.price;
  const dateFr = new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
  showConfirmModal({
    icon:  '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f5b731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    title: 'Dividende reçu ?',
    body:  `${item.name} — ${total.toFixed(2)} € (${item.qty} × ${item.price.toFixed(3)} €/action)\nVersement prévu le ${dateFr}.\nL'as-tu reçu sur ton compte espèces ?`,
    okLabel:     'Oui, reçu',
    cancelLabel: 'Pas encore',
    onConfirm: () => {
      logTransaction(currentUser, {
        type: 'dividend', ticker: item.ticker, name: item.name,
        qty: item.qty, price: item.price, date: item.date, source: 'yahoo-auto',
      });
      try { renderPortfolio(); } catch(_) {}
      _divPromptActive = false;
      _processDivPromptQueue();
    },
    onCancel: () => {
      _divDeclined.add(item.ticker + '|' + item.date);
      _divPromptActive = false;
      _processDivPromptQueue();
    },
  });
}

// ─── DÉTECTION AUTO ATTRIBUTIONS GRATUITES / OST (rompus cash) ───
// Yahoo expose une attribution gratuite comme un "split" (ex 11:10).
// L'event + les actions entières sont calculables ; le cash des rompus
// (fractions vendues par le broker) est estimé puis ajustable par l'user.
let _ostScanned     = false;
let _ostPromptQueue = [];
let _ostActive      = false;
const _ostDeclined  = new Set();   // "ticker|date" refusés cette session

async function scanCorporateActions() {
  if (_ostScanned || !currentUser) return;
  _ostScanned = true;
  const pf  = getPortfolio(currentUser);
  const txs = getTransactions(currentUser);
  if (!pf.length) return;

  // Date d'achat la plus ancienne par ticker : on ignore les OST antérieures.
  const firstBuy = {};
  txs.forEach(t => {
    if (t.type === 'buy' && t.ticker && t.date) {
      if (!firstBuy[t.ticker] || t.date < firstBuy[t.ticker]) firstBuy[t.ticker] = t.date;
    }
  });

  for (const row of pf) {
    try {
      const yt  = resolveToYahooTicker(row.ticker);
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
        encodeURIComponent(yt) + '?interval=1d&range=2y&events=split';
      const raw    = await fetchWithFallback(url);
      const json   = JSON.parse(raw);
      const splits = json && json.chart && json.chart.result && json.chart.result[0] &&
                     json.chart.result[0].events && json.chart.result[0].events.splits;
      if (!splits) continue;
      const since = firstBuy[row.ticker] || '0000-00-00';
      for (const key in splits) {
        const s    = splits[key];
        const date = new Date(s.date * 1000).toISOString().slice(0, 10);
        if (date < since) continue;                       // OST avant que tu détiennes
        const num = s.numerator, den = s.denominator;
        if (!num || !den) continue;
        const factor = num / den;
        if (factor <= 1) continue;                        // regroupement : pas de cash rompu
        const totalNew = row.qty * factor;
        const whole    = Math.floor(totalNew) - row.qty;  // actions entières gratuites
        const fraction = totalNew - Math.floor(totalNew); // rompu (fraction résiduelle)
        if (fraction < 0.0001) continue;                  // split entier pur → pas de rompus
        if (_ostDeclined.has(row.ticker + '|' + date)) continue;
        if (txs.some(t => t.ostDate === date && t.ticker === row.ticker)) continue; // déjà logué
        const price   = row.currentPrice || row.buyPrice || 0;
        const estCash = +(fraction * price).toFixed(2);
        _ostPromptQueue.push({
          ticker: row.ticker, name: row.name || row.ticker,
          date, num, den, whole, fraction, estCash, price,
        });
      }
    } catch (e) { console.warn('scanCorporateActions', row.ticker, e); }
  }
  _processOstQueue();
}

function _processOstQueue() {
  if (_ostActive) return;
  const item = _ostPromptQueue.shift();
  if (!item) return;
  _ostActive = true;
  showOstPrompt(item);
}

function showOstPrompt(item) {
  const modal = document.getElementById('ost-modal');
  const body  = document.getElementById('ost-modal-body');
  const input = document.getElementById('ost-modal-cash');
  const okBtn = document.getElementById('ost-modal-ok');
  const noBtn = document.getElementById('ost-modal-cancel');
  if (!modal || !body || !input) { _ostActive = false; return; }

  const dateFr = new Date(item.date + 'T12:00:00')
    .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const logo = (typeof logoHtmlModal === 'function') ? logoHtmlModal(item.ticker) : '';
  const wholeRow = item.whole > 0
    ? `<div class="ost-row"><span>Actions gratuites reçues</span><b>+${item.whole}</b></div>` : '';
  const titleEl = document.getElementById('ost-modal-title');
  const kickEl  = document.getElementById('ost-modal-kicker');
  if (titleEl) titleEl.textContent = 'Attribution gratuite détectée';
  if (kickEl)  kickEl.textContent  = 'Opération sur titre';
  body.innerHTML =
    `<div class="ost-firm">${logo}<div>` +
      `<div class="ost-firm-name">${item.name}</div>` +
      `<div class="ost-firm-meta">Ratio <span class="ost-pill">${item.num}:${item.den}</span> · ${dateFr}</div>` +
    `</div></div>` +
    `<div class="ost-break">${wholeRow}` +
      `<div class="ost-row"><span>Fraction (rompu)</span><b>${item.fraction.toFixed(3)} action</b></div>` +
      `<div class="ost-row ost-row-cash"><span>Cash estimé</span><b>${item.estCash.toFixed(2)} €</b></div>` +
    `</div>`;
  input.value = item.estCash.toFixed(2);
  modal.style.display = 'flex';
  setTimeout(() => { try { input.focus(); input.select(); } catch (_) {} }, 60);

  // Détection obligatoire : pas d'échappatoire. Seul « Enregistrer » ferme.
  noBtn.style.display = 'none';

  const close = () => { noBtn.style.display = ''; modal.style.display = 'none'; _ostActive = false; _processOstQueue(); };

  okBtn.onclick = () => {
    const cash = parseFloat(String(input.value).replace(',', '.'));
    if (isNaN(cash) || cash < 0) { input.focus(); return; }

    // Actions entières gratuites → buy à prix 0, PRU dilué.
    if (item.whole > 0) {
      const pf = getPortfolio(currentUser);
      const r  = pf.find(x => x.ticker === item.ticker);
      if (r) {
        const oldCost = r.qty * r.buyPrice;
        r.qty     += item.whole;
        r.buyPrice = r.qty > 0 ? oldCost / r.qty : r.buyPrice;
        savePortfolio(currentUser, pf);
      }
      logTransaction(currentUser, {
        type: 'buy', ticker: item.ticker, name: item.name,
        qty: item.whole, price: 0, date: item.date,
        ost: true, ostDate: item.date, label: 'Attribution gratuite',
      });
    }

    // Rompu → cash entrant (type distribution).
    if (cash > 0) {
      logTransaction(currentUser, {
        type: 'distribution', ticker: item.ticker, name: item.name,
        qty: 1, price: cash, date: item.date,
        ost: true, ostDate: item.date, label: 'Rompus attribution gratuite',
      });
    }

    try { renderPortfolio(); } catch (_) {}
    try { renderActivite(); } catch (_) {}
    close();
  };
}

// Édition du montant d'une attribution (rompus) déjà enregistrée.
// L'attribution ne peut PAS être supprimée : on ne modifie que le montant.
function showOstEdit(txId) {
  const tx = getTransactions(currentUser).find(t => t.id === txId);
  if (!tx) return;
  const modal = document.getElementById('ost-modal');
  const body  = document.getElementById('ost-modal-body');
  const input = document.getElementById('ost-modal-cash');
  const okBtn = document.getElementById('ost-modal-ok');
  const noBtn = document.getElementById('ost-modal-cancel');
  const titleEl = document.getElementById('ost-modal-title');
  const kickEl  = document.getElementById('ost-modal-kicker');
  if (!modal || !body || !input) return;

  const dateFr = tx.date
    ? new Date(tx.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const logo = (typeof logoHtmlModal === 'function') ? logoHtmlModal(tx.ticker) : '';
  if (titleEl) titleEl.textContent = 'Modifier le montant';
  if (kickEl)  kickEl.textContent  = 'Attribution gratuite';
  body.innerHTML =
    `<div class="ost-firm">${logo}<div>` +
      `<div class="ost-firm-name">${tx.name || tx.ticker || '—'}</div>` +
      `<div class="ost-firm-meta">Rompus attribution · ${dateFr}</div>` +
    `</div></div>` +
    `<div class="ost-break"><div class="ost-row ost-row-cash">` +
      `<span>Montant enregistré</span><b>${(tx.qty * tx.price).toFixed(2)} €</b>` +
    `</div></div>`;
  input.value = (tx.qty * tx.price).toFixed(2);
  noBtn.style.display = '';
  noBtn.textContent = 'Annuler';
  modal.style.display = 'flex';
  setTimeout(() => { try { input.focus(); input.select(); } catch (_) {} }, 60);

  const close = () => { modal.style.display = 'none'; noBtn.textContent = 'Pas encore'; };
  noBtn.onclick = () => close();
  okBtn.onclick = () => {
    const cash = parseFloat(String(input.value).replace(',', '.'));
    if (isNaN(cash) || cash < 0) { input.focus(); return; }
    const list = getTransactions(currentUser);
    const t = list.find(x => x.id === txId);
    if (t) { t.qty = 1; t.price = cash; saveTransactions(currentUser, list); }
    try { renderPortfolio(); } catch (_) {}
    try { renderActivite(); } catch (_) {}
    close();
  };
}

// ─── ONGLET ACTIVITÉ : timeline unifiée + retour arrière ───
function renderActivite() {
  const feed  = document.getElementById('activite-feed');
  const empty = document.getElementById('activite-empty');
  if (!feed) return;
  const txs  = getTransactions(currentUser) || [];
  const vers = getVersements(currentUser) || [];

  const ev = [];
  txs.forEach(t => ev.push({ kind:'tx', id:t.id, type:t.type, date:t.date||'',
    ticker:t.ticker, name:t.name, qty:t.qty, price:t.price }));
  vers.forEach(v => ev.push({ kind:'versement', id:v.id, type:'versement', date:v.date||'',
    name:v.label || 'Versement', amount:v.amount }));

  if (!ev.length) { feed.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  ev.sort((a,b) => (b.date||'').localeCompare(a.date||'') || (b.id||0)-(a.id||0));

  const CFG = {
    buy:          { tag:'ACHAT',       bg:'rgba(124,109,245,.15)', col:'#a99bff', sign:-1 },
    sell:         { tag:'VENTE',       bg:'rgba(255,93,120,.14)',  col:'#ff5d78', sign:+1 },
    dividend:     { tag:'DIVIDENDE',   bg:'rgba(245,183,49,.14)',  col:'#f5b731', sign:+1 },
    distribution: { tag:'ATTRIBUTION', bg:'rgba(124,109,245,.15)', col:'#a99bff', sign:+1 },
    versement:    { tag:'VERSEMENT',   bg:'rgba(0,224,158,.14)',   col:'#00e09e', sign:+1 },
  };
  const ICO = {
    buy:  '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
    sell: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    dividend: '<rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M20 12v10H4V12"/>',
    distribution: '<rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    versement: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  };
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const fmtMonth = d => d ? new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'}) : 'Sans date';
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // Regroupe les événements par mois (ordre décroissant déjà trié)
  const groups = [];
  const gIdx = {};
  ev.forEach(e => {
    const key = e.date ? e.date.slice(0, 7) : 'nodate';
    if (!(key in gIdx)) { gIdx[key] = groups.length; groups.push({ label: fmtMonth(e.date), items: [] }); }
    groups[gIdx[key]].items.push(e);
  });

  const rowHtml = e => {
    const c = CFG[e.type] || CFG.buy;
    const amount = e.kind === 'versement' ? e.amount : (e.qty * e.price);
    const signed = (c.sign < 0 ? '−' : '+') + amount.toFixed(2) + ' €';
    const amtCol = c.sign < 0 ? 'var(--negative)' : 'var(--positive)';
    const title  = e.name || e.ticker || 'Opération';
    let sub;
    if (e.kind === 'versement')        sub = fmtD(e.date);
    else if (e.type === 'distribution') sub = fmtD(e.date) + ' · rompus';
    else                                sub = fmtD(e.date) + ' · ' + e.qty + ' × ' + Number(e.price).toFixed(2) + ' €';

    let actions;
    if (e.type === 'distribution') {
      actions =
        `<button class="act-btn edit" title="Modifier le montant" onclick="showOstEdit(${e.id})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>` +
        `<span class="act-lock" title="Attribution non supprimable"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>`;
    } else {
      actions =
        `<button class="act-btn del" title="Supprimer" onclick="deleteActivite('${e.kind}',${e.id})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>`;
    }

    return `<div class="act-item">` +
      `<div class="act-ico" style="background:${c.bg}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c.col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICO[e.type]||''}</svg></div>` +
      `<div class="act-main"><div class="act-title">${title}<span class="act-tag" style="background:${c.bg};color:${c.col}">${c.tag}</span></div><div class="act-sub">${sub}</div></div>` +
      `<div class="act-amt" style="color:${amtCol}">${signed}</div>` +
      `<div class="act-actions">${actions}</div>` +
      `</div>`;
  };

  feed.innerHTML = groups.map(g => {
    let net = 0;
    g.items.forEach(e => {
      const c = CFG[e.type] || CFG.buy;
      const amount = e.kind === 'versement' ? e.amount : (e.qty * e.price);
      net += c.sign * amount;
    });
    const netCol = net >= 0 ? 'var(--positive)' : 'var(--negative)';
    const netStr = (net >= 0 ? '+' : '−') + Math.abs(net).toFixed(2) + ' €';
    const rows = g.items.map(rowHtml).join('');
    return `<div class="act-month">` +
      `<div class="act-month-head">` +
        `<span class="act-month-name">${cap(g.label)}<span class="act-month-count">${g.items.length} op.</span></span>` +
        `<span class="act-month-net" style="color:${netCol}">${netStr}</span>` +
      `</div>${rows}</div>`;
  }).join('');
}

function deleteActivite(kind, id) {
  const txs  = getTransactions(currentUser) || [];
  const vers = getVersements(currentUser) || [];
  let label = 'cette opération';
  if (kind === 'tx') {
    const t = txs.find(x => x.id === id);
    if (t && t.type === 'distribution') return;   // attribution non supprimable
    if (t) {
      const noms = { buy:"l'achat", sell:'la vente', dividend:'le dividende' };
      label = (noms[t.type] || "l'opération") + ' ' + (t.name || t.ticker || '');
    }
  } else {
    const v = vers.find(x => x.id === id);
    if (v) label = 'le versement « ' + (v.label || '') + ' » (' + v.amount.toFixed(2) + ' €)';
  }
  showConfirmModal({
    icon: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff5d78" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
    title: 'Supprimer cette opération ?',
    body: 'Supprimer ' + label + ' ? Le solde espèces et le portefeuille seront recalculés.',
    okLabel: 'Supprimer', cancelLabel: 'Annuler', danger: true,
    onConfirm: () => _doDeleteActivite(kind, id),
  });
}

function _doDeleteActivite(kind, id) {
  if (kind === 'versement') {
    saveVersements(currentUser, getVersements(currentUser).filter(v => v.id !== id));
  } else {
    const txs = getTransactions(currentUser);
    const t = txs.find(x => x.id === id);
    if (!t || t.type === 'distribution') return;
    // Retour arrière sur la position (Option « annule tout »).
    if (t.type === 'buy' || t.type === 'sell') {
      const pf  = getPortfolio(currentUser);
      const row = pf.find(r => r.ticker === t.ticker);
      if (row) {
        if (t.type === 'buy')  row.qty -= t.qty;
        if (t.type === 'sell') row.qty += t.qty;
        if (row.qty <= 0) {
          pf.splice(pf.indexOf(row), 1);
        } else if (t.type === 'buy') {
          const rest = txs.filter(x => x.id !== id && x.type === 'buy' && x.ticker === t.ticker);
          const q = rest.reduce((s,x)=>s+x.qty,0);
          const c = rest.reduce((s,x)=>s+x.qty*x.price,0);
          if (q > 0) row.buyPrice = c / q;
        }
        savePortfolio(currentUser, pf);
      }
    }
    // Un dividende détecté automatiquement serait re-créé au prochain
    // chargement : on le note comme ignoré pour que la suppression tienne.
    if (t.type === 'dividend') {
      const key = _divKey(t.ticker, t.date);
      const ign = getDivIgnored(currentUser);
      if (!ign.includes(key)) saveDivIgnored(currentUser, ign.concat(key));
    }
    saveTransactions(currentUser, txs.filter(x => x.id !== id));
  }
  try { renderPortfolio(); } catch (_) {}
  try { renderActivite(); } catch (_) {}
  try { initDividendes(); } catch (_) {}
}

// Affiche l'état "aucune donnée" : graphe vidé + message dans le tableau.
function showPerfEmptyState() {
  if (perfAnnualChart) { perfAnnualChart.destroy(); perfAnnualChart = null; }
  const canvas = document.getElementById('chart-perf-annual');
  const empty  = document.getElementById('perf-chart-empty');
  if (canvas) canvas.style.display = 'none';
  if (empty)  empty.style.display = 'flex';
  const tbodyEl = document.getElementById('perf-tbody');
  if (tbodyEl) tbodyEl.innerHTML =
    '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:32px">Aucune donnée — merci d\'importer un CSV.</td></tr>';
}

// Réaffiche le graphe (masque le message vide).
function hidePerfEmptyState() {
  const canvas = document.getElementById('chart-perf-annual');
  const empty  = document.getElementById('perf-chart-empty');
  if (canvas) canvas.style.display = '';
  if (empty)  empty.style.display = 'none';
}

function clearDailyValues() {
  saveDailyValues(currentUser, []);
  saveTRCohort(currentUser, null);
  _perfCache = null;

  // Vider immédiatement l'affichage perf
  const kpiEl = document.getElementById('perf-kpis');
  if (kpiEl) kpiEl.innerHTML = '';
  showPerfEmptyState();

  // Masquer la bannière de succès import
  const successEl = document.getElementById('csv-import-success');
  if (successEl) { clearTimeout(successEl._hideTimer); successEl.classList.remove('visible'); }

  updateDailyStatus();
}

function updateDailyStatus() {
  const el = document.getElementById('daily-status');
  if (!el) return;
  const tr = getTRCohort(currentUser);
  if (tr && tr.years && tr.years.length) {
    el.innerHTML = '<span style="color:var(--positive)">●</span> Trade Republic — '
      + tr.years.length + ' année(s), maj ' + (tr.updatedAt || '');
    return;
  }
  const dv = getDailyValues(currentUser);
  if (dv && dv.length) {
    el.innerHTML = '<span style="color:var(--positive)">●</span> ' + dv.length + ' j (' + dv[0].date + ' → ' + dv[dv.length-1].date + ')';
  } else {
    el.innerHTML = '<span style="color:var(--text3)">○</span> aucune donnée broker importée';
  }
}

async function initPerformance() {
  const kpiEl       = document.getElementById('perf-kpis');
  const tbodyEl     = document.getElementById('perf-tbody');

  if (typeof updateDailyStatus === 'function') updateDailyStatus();

  // ── Path Trade Republic : performance cohorte importée depuis un CSV TR ──
  const trCohort = getTRCohort(currentUser);
  if (trCohort && trCohort.years && trCohort.years.length) {
    renderTRCohort(trCohort);
    return;
  }

  const portfolio   = getPortfolio(currentUser);
  const txs         = getTransactions(currentUser);

  if (!portfolio.length && !txs.length) {
    kpiEl.innerHTML = '';
    tbodyEl.innerHTML =
      '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:32px">Aucune donnée disponible.</td></tr>';
    return;
  }

  if (typeof updateDailyStatus === 'function') updateDailyStatus();

  const dailyValues = getDailyValues(currentUser);
  if (!dailyValues || dailyValues.length < 2) {
    // Pas de CSV broker → KPIs depuis portfolio uniquement, graphe + tableau vides
    renderPerformancePage({ years: [] }, portfolio, txs);
    showPerfEmptyState();
    return;
  }

  // CSV présent : graphe visible
  hidePerfEmptyState();

  kpiEl.innerHTML = '<div class="stat-card"><div class="stat-label">Chargement…</div></div>';
  tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:24px">Calcul en cours…</td></tr>';

  try {
    const result = _perfCache || await computeAnnualPerformance(portfolio, txs);
    _perfCache = result;
    renderPerformancePage(result, portfolio, txs);
  } catch (e) {
    console.error('Performance page error:', e);
    kpiEl.innerHTML = '';
    tbodyEl.innerHTML =
      '<tr><td colspan="4" style="text-align:center;color:var(--negative);padding:32px">Erreur lors du chargement des données.</td></tr>';
  }
}

// ─────────────────────────────────────────────────────────────────
//  Rendu de la performance cohorte importée depuis un CSV Trade Republic.
//  Chaque année = ses propres achats, valorisés au prix du jour.
// ─────────────────────────────────────────────────────────────────
function renderTRCohort(cohort) {
  const { years, total } = cohort;
  const kpiEl = document.getElementById('perf-kpis');
  const tbody = document.getElementById('perf-tbody');
  if (!kpiEl || !tbody) return;
  const sign = v => v >= 0 ? '+' : '';
  const colE = v => v >= 0 ? 'var(--positive)' : 'var(--negative)';

  kpiEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">PERF GLOBALE</div>
      <div class="stat-value" style="color:${colE(total.gain)}">${sign(total.gain)}${fmt(total.gain)}</div>
      <div class="stat-sub">${sign(total.perfPct)}${total.perfPct.toFixed(2)} %</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">VALEUR ACTUELLE</div>
      <div class="stat-value">${fmt(total.value)}</div>
      <div class="stat-sub">Cours du jour</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">TOTAL INVESTI</div>
      <div class="stat-value">${fmt(total.invested)}</div>
      <div class="stat-sub">Frais & taxes inclus</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">DIVIDENDES</div>
      <div class="stat-value" style="color:var(--positive)">+${fmt(total.dividends || 0)}</div>
      <div class="stat-sub">Encaissés</div>
    </div>`;
  startKpisAutoScroll('perf-kpis');

  tbody.innerHTML = years.map(y => `
    <tr>
      <td style="font-weight:600">${y.year}</td>
      <td class="mono" style="text-align:right">${fmt(y.invested)}</td>
      <td class="mono" style="text-align:right;color:${colE(y.gain)}">${sign(y.gain)}${fmt(y.gain)}</td>
      <td class="mono" style="text-align:right"><span style="font-weight:600;color:${colE(y.perfPct)}">${sign(y.perfPct)}${y.perfPct.toFixed(2)} %</span></td>
    </tr>`).join('');

  const ctx = document.getElementById('chart-perf-annual');
  if (ctx) {
    const wrap = ctx.closest('.section-card');
    if (wrap) wrap.style.display = '';
    if (perfAnnualChart) perfAnnualChart.destroy();
    perfAnnualChart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: years.map(y => String(y.year)),
        datasets: [{
          data: years.map(y => y.perfPct),
          backgroundColor: years.map(y => y.perfPct >= 0 ? 'rgba(0,224,158,0.55)' : 'rgba(255,77,106,0.55)'),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.y.toFixed(2) + ' %' } } },
        scales: { y: { ticks: { callback: v => v + ' %' } } },
      },
      plugins: [zeroLinePlugin],
    });
  }
}

// ─────────────────────────────────────────────────────────────────
//  Calcul de performance annuelle à partir des valeurs quotidiennes broker
//  (export "performance.csv" Boursorama, équivalent chez Fortuneo, etc.)
//
//  C'est la méthode privilégiée car elle donne EXACTEMENT le chiffre du broker.
// ─────────────────────────────────────────────────────────────────
function computeAnnualPerformanceFromDaily(dailyValues, versements, portfolio) {
  // Index dates -> valeur, trié
  const valByDate = {};
  for (const dv of dailyValues) {
    if (dv && dv.date && typeof dv.value === 'number' && isFinite(dv.value)) {
      valByDate[dv.date] = dv.value;
    }
  }
  const sortedDates = Object.keys(valByDate).sort();
  if (sortedDates.length < 2) return { years: [] };

  // Versements par date
  const versByDate = {};
  for (const v of versements) {
    if (!v || !v.date) continue;
    versByDate[v.date] = (versByDate[v.date] || 0) + v.amount;
  }

  // Valeur portefeuille LIVE (pour aujourd'hui si pas dans dailyValues)
  let liveValue = null;
  if (portfolio && portfolio.length) {
    let v = 0;
    for (const r of portfolio) {
      if (r && r.qty && r.currentPrice) v += r.qty * r.currentPrice;
    }
    if (v > 0) liveValue = v;
  }

  // Cash résiduel : versements totaux − (achats − ventes)
  // Permet d'aligner la valeur live sur la valeur broker (qui inclut le cash).
  // Sans ça on perd ~les centimes de cash → quelques bps d'écart sur la perf.
  const txs = getTransactions(currentUser);
  let cashResidual = 0;
  for (const v of versements) {
    if (v && typeof v.amount === 'number') cashResidual += v.amount;
  }
  for (const t of txs) {
    if (!t || !t.qty || !t.price) continue;
    if (t.type === 'buy')      cashResidual -= t.qty * t.price;
    if (t.type === 'sell')     cashResidual += t.qty * t.price;
    if (t.type === 'dividend') cashResidual += t.qty * t.price;
    if (t.type === 'distribution') cashResidual += t.qty * t.price;
  }
  if (cashResidual > 0.001 && liveValue != null) {
    liveValue += cashResidual;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const firstDate = sortedDates[0];
  const firstYear = new Date(firstDate + 'T12:00:00').getFullYear();
  const lastDate = sortedDates[sortedDates.length - 1];
  const currentYear = new Date().getFullYear();

  const yearResults = [];

  for (let y = firstYear; y <= currentYear; y++) {
    const isYTD = (y === currentYear);
    const yearStart = y + '-01-01';
    const yearEnd   = y + '-12-31';

    // Versements de l'année
    const yearVers = versements.filter(v =>
      v && v.date && new Date(v.date + 'T12:00:00').getFullYear() === y
    );
    const totalVersYear = yearVers.reduce((s, v) => s + v.amount, 0);

    // V_début = dernière valeur connue strictement avant l'année (= 31/12 Y-1)
    //
    // Pour la PREMIÈRE année (= année d'ouverture du compte), on ne peut PAS
    // prendre la première valeur de l'historique comme V_début, car c'est en
    // général un versement initial (V_début = 0, pas la valeur du versement).
    // On démarre donc à 0 et on traite le premier versement comme un flux entrant
    // — la formule (1+r) = V_jour / (V_veille + vers_jour) gère ça nativement.
    let prevValue = null;
    if (y === firstYear) {
      prevValue = 0; // compte ouvert avec un solde nul
    } else {
      // Cherche la dernière date < yearStart
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        if (sortedDates[i] < yearStart) { prevValue = valByDate[sortedDates[i]]; break; }
      }
      if (prevValue == null) continue; // pas de données pour cette année
    }

    // Collecte les dates de l'année + dates de versement
    const datesSet = new Set();
    for (const d of sortedDates) {
      if (d >= yearStart && d <= yearEnd) datesSet.add(d);
    }
    for (const v of yearVers) {
      if (v.date >= yearStart && v.date <= yearEnd) datesSet.add(v.date);
    }
    const yearDates = [...datesSet].sort();

    let twr = 1;
    let hasCapital = false;
    let valueEnd = prevValue;

    for (const d of yearDates) {
      const versToday = versByDate[d] || 0;
      // Si pas de valorisation broker pour ce jour, on garde la veille (jour férié)
      const valToday = (valByDate[d] != null) ? valByDate[d] : prevValue;
      const denom = prevValue + versToday;
      if (denom > 0.01) {
        hasCapital = true;
        twr *= valToday / denom;
      }
      prevValue = valToday;
      valueEnd = valToday;
    }

    // Pour le YTD : si la dernière dailyValue n'est pas d'aujourd'hui mais
    // qu'on a une valeur LIVE, on ajoute le ratio du jour
    if (isYTD && liveValue != null) {
      const lastBrokerDate = yearDates.length ? yearDates[yearDates.length - 1] : null;
      if (lastBrokerDate && lastBrokerDate < todayStr) {
        const versToday = versByDate[todayStr] || 0;
        const denom = prevValue + versToday;
        if (denom > 0.01) {
          hasCapital = true;
          twr *= liveValue / denom;
          valueEnd = liveValue;
        }
      }
    }

    const perfPct = hasCapital ? (twr - 1) * 100 : 0;

    // V_début de l'année (= valeur au 31/12 de l'année précédente)
    const valueYearStart = (y === firstYear) ? 0 : (function(){
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        if (sortedDates[i] < yearStart) return valByDate[sortedDates[i]];
      }
      return 0;
    })();
    const totalGain = valueEnd - valueYearStart - totalVersYear;

    yearResults.push({
      year: y,
      isYTD,
      base: +(valueYearStart + totalVersYear).toFixed(2),
      gain: +totalGain.toFixed(2),
      perfPct: +perfPct.toFixed(2),
    });
  }

  return { years: yearResults };
}

async function computeAnnualPerformance(portfolio, txs) {
  const versements = getVersements(currentUser);
  const dailyValues = getDailyValues(currentUser);

  // ── PATH PRIORITAIRE : si on a les valorisations quotidiennes du broker, ──
  //    on calcule directement la TWR à partir de ces valeurs (= EXACT broker).
  //    Pas besoin de Yahoo, pas d'écart, pas de bricolage.
  if (dailyValues && dailyValues.length >= 2) {
    return computeAnnualPerformanceFromDaily(dailyValues, versements, portfolio);
  }

  // ── PATH FALLBACK : reconstitution depuis prix Yahoo (méthode historique) ──

  // ── PATH PRIORITAIRE : si on a les valorisations quotidiennes du broker, ──
  //    on calcule directement la TWR à partir de ces valeurs (= EXACT broker).
  //    Pas besoin de Yahoo, pas d'écart, pas de bricolage.
  //
  //    Formule Boursorama (convention same_day) :
  //      (1 + perf_jour) = V_jour / (V_veille + versement_jour)
  //
  if (dailyValues && dailyValues.length >= 2) {
    return computeAnnualPerformanceFromDaily(dailyValues, versements, portfolio);
  }

  // ── PATH FALLBACK : reconstitution depuis prix Yahoo (méthode historique) ──

  // ── 1. Déterminer la plage de dates ──
  const allDates = [];
  txs.forEach(t => { if (t.date) allDates.push(t.date); });
  versements.forEach(v => { if (v.date) allDates.push(v.date); });
  portfolio.forEach(r => { if (r.buyDate) allDates.push(r.buyDate); });
  if (!allDates.length) return { years: [] };

  allDates.sort();
  const firstYear = new Date(allDates[0] + 'T12:00:00').getFullYear();
  const currentYear = new Date().getFullYear();

  // ── 2. Collecter tous les tickers ──
  const allTickers = new Set(portfolio.map(r => r.ticker));
  txs.forEach(tx => { if (tx.ticker) allTickers.add(tx.ticker); });
  const tickers = [...allTickers].filter(Boolean);

  // ── 3. Fetch prix DAILY pour tous les tickers sur toute la période ──
  const dailyPrices = {}; // { ticker: { 'YYYY-MM-DD': close } }

  if (tickers.length) {
    const p1 = Math.floor(new Date(firstYear + '-01-01T00:00:00').getTime() / 1000);
    const p2 = Math.floor(Date.now() / 1000) + 86400;

    await Promise.all(tickers.map(async ticker => {
      dailyPrices[ticker] = {};
      try {
        const yahooTicker = resolveToYahooTicker(ticker);
        const raw = await fetchWithFallback(
          'https://query1.finance.yahoo.com/v8/finance/chart/'
          + encodeURIComponent(yahooTicker)
          + '?interval=1d&period1=' + p1 + '&period2=' + p2
        );
        const d = JSON.parse(raw);
        const res = d.chart && d.chart.result && d.chart.result[0];
        if (!res || !res.timestamp) return;
        const timestamps = res.timestamp;
        const closes = res.indicators.quote[0].close;
        for (let i = 0; i < timestamps.length; i++) {
          if (closes[i] == null) continue;
          const key = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
          dailyPrices[ticker][key] = closes[i];
        }
      } catch (e) { /* skip */ }
    }));
  }

  // ── 4. Prix live ──
  const livePrice = {};
  portfolio.forEach(r => { livePrice[r.ticker] = r.currentPrice; });

  // ── 5. Helpers ──
  function getPriceAt(ticker, dateStr) {
    if (dailyPrices[ticker] && dailyPrices[ticker][dateStr]) return dailyPrices[ticker][dateStr];
    if (!dailyPrices[ticker]) return null;
    const keys = Object.keys(dailyPrices[ticker]).sort();
    let last = null;
    for (const k of keys) {
      if (k > dateStr) break;
      last = dailyPrices[ticker][k];
    }
    return last;
  }

  function inventoryAtDate(dateStr) {
    const inv = {};
    for (const tx of txs) {
      if (!tx.date || tx.date > dateStr) continue;
      if (tx.type === 'buy') inv[tx.ticker] = (inv[tx.ticker] || 0) + tx.qty;
      else if (tx.type === 'sell') {
        inv[tx.ticker] = (inv[tx.ticker] || 0) - tx.qty;
        if (inv[tx.ticker] <= 0.0001) delete inv[tx.ticker];
      }
    }
    return inv;
  }

  function cashAtDate(dateStr) {
    let cash = 0;
    versements.forEach(v => { if (v.date && v.date <= dateStr) cash += v.amount; });
    txs.forEach(t => {
      if (!t.date || t.date > dateStr) return;
      if (t.type === 'buy') cash -= t.qty * t.price;
      if (t.type === 'sell') cash += t.qty * t.price;
      if (t.type === 'dividend') cash += t.qty * t.price;
      if (t.type === 'distribution') cash += t.qty * t.price;
    });
    return Math.max(0, cash);
  }

  // Valeur totale (titres + cash) à une date
  function totalValueAt(dateStr, useLive) {
    const inv = inventoryAtDate(dateStr);
    let val = cashAtDate(dateStr);
    for (const [ticker, qty] of Object.entries(inv)) {
      if (qty <= 0.0001) continue;
      const p = useLive ? (livePrice[ticker] || getPriceAt(ticker, dateStr)) : getPriceAt(ticker, dateStr);
      if (p != null) val += qty * p;
    }
    return val;
  }

  // ── 6. Construire la liste triée de toutes les dates de trading ──
  const allTradingDatesSet = new Set();
  for (const ticker of tickers) {
    if (dailyPrices[ticker]) {
      for (const d of Object.keys(dailyPrices[ticker])) allTradingDatesSet.add(d);
    }
  }
  const allTradingDates = [...allTradingDatesSet].sort();

  // Grouper tous les versements par date
  const allVersByDate = {};
  for (const v of versements) {
    if (!v.date) continue;
    if (!allVersByDate[v.date]) allVersByDate[v.date] = 0;
    allVersByDate[v.date] += v.amount;
  }

  // ── 7. Calcul TWR par année (méthode TWR rigoureuse, alignée Boursorama) ──
  //
  // La formule naïve V_jour / (V_veille + versement_jour) souffre de deux biais :
  //   1) Quand le prix Yahoo d'un titre diffère du prix réel de la transaction
  //      (cas WPEA.PA acheté 5.54€ mais Yahoo cote 6.22€), Yahoo "voit" un gain
  //      artificiel le jour de l'achat → la perf TWR est gonflée.
  //   2) Convention "same_day" sur les versements : Bourso compte plutôt les
  //      versements en sortie de journée (J+1).
  //
  // Correction appliquée :
  //   - Neutralisation des écarts prix Yahoo / prix transaction comme flux extérieurs.
  //     Pour chaque transaction du jour : flux_tx += sign × qty × (prix_yahoo - prix_tx)
  //     (sign = +1 achat, -1 vente)
  //   - Convention next_day pour versements : (1+r) = (V_jour - vers_jour) / (V_veille + flux_tx)
  //
  // Perf annuelle = ∏(1 + perf_jour) - 1

  // Index : pour chaque (ticker, date), prix moyen pondéré des transactions de ce jour
  const txByDate = {};
  for (const tx of txs) {
    if (!tx.date || !tx.ticker) continue;
    if (!txByDate[tx.date]) txByDate[tx.date] = [];
    txByDate[tx.date].push(tx);
  }

  // Calcule le flux d'écart de valorisation pour les transactions d'un jour donné
  function txFluxAt(dateStr) {
    const txList = txByDate[dateStr];
    if (!txList) return 0;
    let flux = 0;
    for (const tx of txList) {
      const py = getPriceAt(tx.ticker, dateStr);
      if (py == null) continue;
      const sign = (tx.type === 'buy') ? 1 : -1;
      flux += sign * tx.qty * (py - tx.price);
    }
    return flux;
  }

  const yearResults = [];

  for (let y = firstYear; y <= currentYear; y++) {
    const isYTD = (y === currentYear);

    // Versements de l'année
    const yearVers = versements.filter(v => {
      if (!v.date) return false;
      return new Date(v.date + 'T12:00:00').getFullYear() === y;
    });

    // Valeur en début d'année (= valeur au 31/12 Y-1)
    let prevValue;
    if (y === firstYear) {
      prevValue = 0;
    } else {
      prevValue = totalValueAt((y - 1) + '-12-31', false);
    }

    // Filtrer les dates de trading de cette année
    const yearStart = y + '-01-01';
    const yearEnd = y + '-12-31';
    const todayStr = new Date().toISOString().slice(0, 10);

    // Collecter toutes les dates à traiter :
    // dates de trading Yahoo + dates de versement + dates de transaction
    // Pour le YTD : exclure aujourd'hui de la boucle (on utilise les prix live après)
    const yearDatesSet = new Set();
    for (const d of allTradingDates) {
      if (d >= yearStart && d <= yearEnd) {
        if (isYTD && d >= todayStr) continue;
        yearDatesSet.add(d);
      }
    }
    for (const v of yearVers) {
      if (v.date >= yearStart && v.date <= yearEnd) {
        if (isYTD && v.date >= todayStr) continue;
        yearDatesSet.add(v.date);
      }
    }
    // Ajouter aussi les dates de transaction (pour traiter le flux d'écart)
    for (const tx of txs) {
      if (!tx.date) continue;
      if (tx.date >= yearStart && tx.date <= yearEnd) {
        if (isYTD && tx.date >= todayStr) continue;
        yearDatesSet.add(tx.date);
      }
    }
    const yearDates = [...yearDatesSet].sort();

    let twrProduct = 1;
    let hasCapital = false;

    for (const d of yearDates) {
      const versToday = allVersByDate[d] || 0;
      const fluxTx    = txFluxAt(d);
      const valToday  = totalValueAt(d, false);

      // Convention next_day + neutralisation flux tx :
      //   (1+r) = (V_jour - vers_jour) / (V_veille + flux_tx)
      const denom = prevValue + fluxTx;
      if (denom > 0.01) {
        hasCapital = true;
        twrProduct *= (valToday - versToday) / denom;
      }

      prevValue = valToday;
    }

    // Dernière étape : valeur de fin
    let valueEnd;
    if (isYTD) {
      // Ajouter le rendement d'aujourd'hui avec les prix LIVE
      valueEnd = totalValueAt(todayStr, true);
      const versToday = allVersByDate[todayStr] || 0;
      const fluxTx    = txFluxAt(todayStr);
      const denom = prevValue + fluxTx;
      if (denom > 0.01) {
        hasCapital = true;
        twrProduct *= (valueEnd - versToday) / denom;
      }
    } else {
      valueEnd = totalValueAt(yearEnd, false);
      if (prevValue > 0.01) {
        const lastDate = yearDates.length ? yearDates[yearDates.length - 1] : null;
        if (lastDate && lastDate < yearEnd) {
          const denom = prevValue;
          if (denom > 0.01) {
            hasCapital = true;
            twrProduct *= (valueEnd / denom);
          }
        }
      }
    }

    const perfPct = hasCapital ? (twrProduct - 1) * 100 : 0;

    // Gain en € (pour affichage)
    const valueYearStart = (y === firstYear) ? 0 : totalValueAt((y - 1) + '-12-31', false);
    const totalVersYear = yearVers.reduce((s, v) => s + v.amount, 0);
    const totalGain = valueEnd - valueYearStart - totalVersYear;

    yearResults.push({
      year: y,
      isYTD,
      base: +(valueYearStart + totalVersYear).toFixed(2),
      gain: +totalGain.toFixed(2),
      perfPct: +perfPct.toFixed(2),
    });
  }

  return { years: yearResults };
}

// ─────────────────────────────────────────────────────────────────
//  Calcul de performances courtes (mois en cours, veille)
//  Utilise les dailyValues du broker en priorité, sinon retourne null.
//  Même formule TWR que la perf annuelle :
//    (1+r) = V_jour / (V_veille + vers_jour)
// ─────────────────────────────────────────────────────────────────
function computeShortPerf() {
  const dailyValues = getDailyValues(currentUser);
  const versements  = getVersements(currentUser);
  const portfolio   = getPortfolio(currentUser);
  const txs         = getTransactions(currentUser);

  if (!dailyValues || dailyValues.length < 2) {
    return { month: null, prevDay: null, monthLabel: null };
  }

  // Index date -> valeur, trié
  const valByDate = {};
  for (const dv of dailyValues) {
    if (dv && dv.date && typeof dv.value === 'number' && isFinite(dv.value)) {
      valByDate[dv.date] = dv.value;
    }
  }
  const sortedDates = Object.keys(valByDate).sort();
  if (sortedDates.length < 2) return { month: null, prevDay: null, monthLabel: null };

  // Versements par date
  const versByDate = {};
  for (const v of versements) {
    if (!v || !v.date) continue;
    versByDate[v.date] = (versByDate[v.date] || 0) + v.amount;
  }

  // liveValue = portefeuille actuel + cash résiduel
  let liveValue = null;
  if (portfolio && portfolio.length) {
    let v = 0;
    for (const r of portfolio) if (r && r.qty && r.currentPrice) v += r.qty * r.currentPrice;
    if (v > 0) liveValue = v;
  }
  let cashResidual = 0;
  for (const v of versements) if (v && typeof v.amount === 'number') cashResidual += v.amount;
  for (const t of txs) {
    if (!t || !t.qty || !t.price) continue;
    if (t.type === 'buy')      cashResidual -= t.qty * t.price;
    if (t.type === 'sell')     cashResidual += t.qty * t.price;
    if (t.type === 'dividend') cashResidual += t.qty * t.price;
    if (t.type === 'distribution') cashResidual += t.qty * t.price;
  }
  if (cashResidual > 0.001 && liveValue != null) liveValue += cashResidual;

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastDate = sortedDates[sortedDates.length - 1];

  // Valeur "courante" : si on a une valeur live, on l'utilise. Sinon dernière dailyValue.
  const valueNow = (liveValue != null) ? liveValue : valByDate[lastDate];
  // Dernière date "comptée" comme V_courante
  const dateNow = (liveValue != null && lastDate < todayStr) ? todayStr : lastDate;

  // ─── Perf de la veille ───
  // = dernier jour ouvré complet : ratio entre la valeur de la veille et l'avant-veille
  // Pour rester cohérent avec Bourso "ma performance de la veille" = perf du dernier
  // jour de cotation dans le CSV broker (pas le live).
  let prevDay = null;
  if (sortedDates.length >= 2) {
    const dLast = sortedDates[sortedDates.length - 1];
    const dPrev = sortedDates[sortedDates.length - 2];
    const versJ = versByDate[dLast] || 0;
    const denom = valByDate[dPrev] + versJ;
    if (denom > 0.01) {
      prevDay = (valByDate[dLast] / denom - 1) * 100;
    }
  }

  // ─── Perf du mois en cours ───
  // V_début mois = dernière valeur connue strictement avant le 1er du mois en cours
  const now = new Date();
  const monthStart = now.toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  let prevValue = null;
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    if (sortedDates[i] < monthStart) { prevValue = valByDate[sortedDates[i]]; break; }
  }
  // Si on a démarré ce mois (compte ouvert ce mois), V_début = 0
  if (prevValue == null) prevValue = 0;

  // Dates à enchaîner : toutes les dailyValues du mois + dates de versement du mois
  const monthDatesSet = new Set();
  for (const d of sortedDates) {
    if (d >= monthStart && d <= dateNow) monthDatesSet.add(d);
  }
  for (const d of Object.keys(versByDate)) {
    if (d >= monthStart && d <= dateNow) monthDatesSet.add(d);
  }
  const monthDates = [...monthDatesSet].sort();

  let twr = 1, hasCapital = false;
  let lastSeenValue = prevValue;
  for (const d of monthDates) {
    const versJ = versByDate[d] || 0;
    const valJ  = (valByDate[d] != null) ? valByDate[d] : lastSeenValue;
    const denom = prevValue + versJ;
    if (denom > 0.01) {
      hasCapital = true;
      twr *= valJ / denom;
    }
    prevValue = valJ;
    lastSeenValue = valJ;
  }

  // Étape live : si le dernier point du mois < aujourd'hui et qu'on a liveValue
  if (liveValue != null && monthDates.length && monthDates[monthDates.length - 1] < todayStr) {
    const versJ = versByDate[todayStr] || 0;
    const denom = prevValue + versJ;
    if (denom > 0.01) {
      hasCapital = true;
      twr *= liveValue / denom;
    }
  }

  const month = hasCapital ? (twr - 1) * 100 : null;

  return { month, prevDay, monthLabel };
}

function renderPerformancePage(result, portfolio, txs) {
  if (window.IS_DEMO) {
    const el = document.getElementById('performance-content') || document.querySelector('#performance .page-content') || document.getElementById('performance');
    if (el) {
      el.innerHTML =
        '<div class="section-card" style="text-align:center;padding:64px 32px;max-width:600px;margin:40px auto">'
        + '<div style="margin-bottom:16px;opacity:0.6"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>'
        + '<div style="font-size:16px;color:var(--text);font-weight:600;margin-bottom:8px">Performance non disponible en démo</div>'
        + '<div style="font-size:13px;color:var(--text2);line-height:1.6">Cette page calcule votre performance réelle à partir d\'un import CSV de votre courtier (Bourse Direct, Boursorama, Trade Republic…).<br><br>Créez un compte gratuit pour importer vos transactions et débloquer cette analyse.</div>'
        + '<a href="app.html?signup=1" class="btn btn-primary" style="margin-top:20px;display:inline-block">Créer un compte gratuit →</a>'
        + '</div>';
    }
    return;
  }
  const rows = result.years;

  // ── KPIs globaux ──
  const totalInvested = portfolio.reduce((s, r) => s + r.qty * r.buyPrice, 0);
  const totalValue = portfolio.reduce((s, r) => s + r.qty * r.currentPrice, 0);
  const latentPnl = totalValue - totalInvested;
  const totalRealized = txs.filter(t => t.type === 'sell' && t.realizedPnl != null)
                            .reduce((s, t) => s + t.realizedPnl, 0);
  const totalPerfEur = totalRealized + latentPnl;
  const totalPerfPct = totalInvested > 0 ? (totalPerfEur / totalInvested * 100) : 0;

  // KPIs courts (mois en cours, veille) — calculés depuis dailyValues si dispo
  const shortPerf = computeShortPerf();
  const fmtPct = v => (v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + ' %');
  const colPct = v => v == null ? 'var(--text3)' : (v >= 0 ? 'var(--positive)' : 'var(--negative)');

  const kpiHtml = `
    <div class="stat-card">
      <div class="stat-label">PERF GLOBALE</div>
      <div class="stat-value" style="color:${totalPerfEur >= 0 ? 'var(--positive)' : 'var(--negative)'}">
        ${totalPerfEur >= 0 ? '+' : ''}${fmt(totalPerfEur)}
      </div>
      <div class="stat-sub">${totalPerfPct >= 0 ? '+' : ''}${totalPerfPct.toFixed(2)} %</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">PERF ${(shortPerf.monthLabel || 'MOIS EN COURS').toUpperCase()}</div>
      <div class="stat-value" style="color:${colPct(shortPerf.month)}">
        ${fmtPct(shortPerf.month)}
      </div>
      <div class="stat-sub">${shortPerf.month == null ? 'Importez le CSV broker' : 'Depuis le 1er du mois'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">PERF DE LA VEILLE</div>
      <div class="stat-value" style="color:${colPct(shortPerf.prevDay)}">
        ${fmtPct(shortPerf.prevDay)}
      </div>
      <div class="stat-sub">${shortPerf.prevDay == null ? 'Importez le CSV broker' : 'Dernier jour de cotation'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">PNL RÉALISÉ TOTAL</div>
      <div class="stat-value" style="color:${totalRealized >= 0 ? 'var(--positive)' : 'var(--negative)'}">
        ${totalRealized >= 0 ? '+' : ''}${fmt(totalRealized)}
      </div>
      <div class="stat-sub">Plus-values encaissées</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">PV LATENTE</div>
      <div class="stat-value" style="color:${latentPnl >= 0 ? 'var(--positive)' : 'var(--negative)'}">
        ${latentPnl >= 0 ? '+' : ''}${fmt(latentPnl)}
      </div>
      <div class="stat-sub">${totalInvested > 0 ? (latentPnl >= 0 ? '+' : '') + (latentPnl / totalInvested * 100).toFixed(2) + ' %' : '—'} · Non encaissée</div>
    </div>
  `;
  document.getElementById('perf-kpis').innerHTML = kpiHtml;
  startKpisAutoScroll('perf-kpis');

  // ── Tableau ──
  const tbody = document.getElementById('perf-tbody');
  tbody.innerHTML = rows.map(r => {
    const sign = v => v >= 0 ? '+' : '';
    const color = v => v >= 0 ? 'var(--positive)' : 'var(--negative)';
    const perfStr = `<span style="font-weight:600;color:${color(r.perfPct)}">${sign(r.perfPct)}${r.perfPct.toFixed(2)} %</span>`;
    return `<tr>
      <td style="font-weight:600">${r.isYTD ? r.year + ' <span style="font-size:10px;color:var(--text3)">YTD</span>' : r.year}</td>
      <td class="mono" style="text-align:right">${fmt(r.base)}</td>
      <td class="mono" style="text-align:right;color:${color(r.gain)}">${sign(r.gain)}${fmt(r.gain)}</td>
      <td class="mono" style="text-align:right">${perfStr}</td>
    </tr>`;
  }).join('');

  // ── Graphique barres ──
  const ctx = document.getElementById('chart-perf-annual');
  if (!ctx) return;
  if (perfAnnualChart) perfAnnualChart.destroy();

  perfAnnualChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: rows.map(r => r.isYTD ? r.year + ' YTD' : String(r.year)),
      datasets: [{
        label: 'Performance',
        data: rows.map(r => r.perfPct),
        backgroundColor: rows.map(r => r.perfPct >= 0 ? 'rgba(0,224,158,0.7)' : 'rgba(255,77,106,0.7)'),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: perfAnnualChartTooltip
        }
      },
      scales: {
        x: { ticks: { color: '#8892a8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: {
          ticks: { color: '#8892a8', callback: v => v + ' %' },
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      }
    },
    plugins: [zeroLinePlugin]
  });
}

function perfAnnualChartTooltip(context) {
  const { chart, tooltip } = context;
  let el = document.getElementById('perf-annual-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'perf-annual-tooltip';
    el.style.cssText = 'position:absolute;pointer-events:none;background:#10121c;' +
      'border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;' +
      'font-size:12px;opacity:0;transition:opacity .12s;z-index:50;' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.5);white-space:nowrap';
    const parent = chart.canvas.parentNode;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    parent.appendChild(el);
  }
  if (tooltip.opacity === 0) { el.style.opacity = 0; return; }
  const title = (tooltip.title && tooltip.title[0]) || '';
  const dp = (tooltip.dataPoints || [])[0];
  if (!dp) { el.style.opacity = 0; return; }
  const v = dp.parsed.y;
  const isPos = v >= 0;
  const icon = isPos ? IC.trending : IC.trendDown;
  const color = isPos ? '#00e09e' : '#ff4d6a';
  el.innerHTML =
    '<div style="display:flex;align-items:center;gap:6px;color:#8892a8;margin-bottom:4px">' +
      IC.calendar + '<span>' + title + '</span></div>' +
    '<div style="display:flex;align-items:center;gap:6px;color:' + color + ';font-weight:600">' +
      icon + '<span>' + (isPos ? '+' : '') + v.toFixed(2) + ' %</span></div>';
  el.style.opacity = 1;
  el.style.left = (chart.canvas.offsetLeft + tooltip.caretX) + 'px';
  el.style.top  = (chart.canvas.offsetTop + tooltip.caretY) + 'px';
  el.style.transform = 'translate(-50%, calc(-100% - 10px))';
}

// ═══════════════════════════════════════════════════════════
// TOAST DE NOTIFICATION (réutilisé par les notifications push)
// ═══════════════════════════════════════════════════════════

let _toastTimer = null;

function _showBrowserNotif(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: 'assets/logo.png' }); } catch {}
}

function _showChatToast({ icon = IC.bell, title, msg, duration = 5000 }) {
  const toast = document.getElementById('chat-toast');
  if (!toast) return;
  const iconEl = document.getElementById('chat-toast-icon');
  const titleEl = document.getElementById('chat-toast-title');
  const msgEl = document.getElementById('chat-toast-msg');
  if (iconEl)  iconEl.innerHTML    = icon;
  if (titleEl) titleEl.textContent = title || '';
  if (msgEl)   msgEl.textContent   = msg || '';
  const bar = document.getElementById('chat-toast-bar');
  if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = 'toast-bar ' + duration + 'ms linear forwards'; }
  toast.style.display = 'block';
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(_dismissChatToast, duration);
}

window._chatToastClick = function() { _dismissChatToast(); };

window._dismissChatToast = function() {
  const toast = document.getElementById('chat-toast');
  if (toast) toast.style.display = 'none';
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
};


// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS — FCM, alertes prix, historique
// ═══════════════════════════════════════════════════════════════

async function initPush(uid) {
  if (!fcmMessaging || !('serviceWorker' in navigator) || VAPID_KEY === 'YOUR_VAPID_KEY_HERE') return;
  try {
    const swReg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    const token = await getFCMToken(fcmMessaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (token) setFirestoreDoc(firestoreDoc(db, 'roles', uid), { fcmToken: token }, { merge: true }).catch(() => {});
    // Garde : initPush peut être appelé plusieurs fois (auth, activation notifs…).
    // Sans ce flag, onFCMMessage empile un listener à chaque appel → toast en
    // double/triple quand l'app est au premier plan.
    if (!_fcmMsgHandlerSet) {
      _fcmMsgHandlerSet = true;
      onFCMMessage(fcmMessaging, payload => {
        const { title, body } = payload.data || payload.notification || {};
        _logNotifHistory(payload.data?.type || 'push', title || 'Capital Board', body || '');
        _showChatToast({ icon: IC.bell, title: title || 'Capital Board', msg: body || '' });
        renderNotificationsPage();
        if (payload.data?.type === 'daily_recap') _refreshRecap();
      });
    }
  } catch(e) { console.warn('FCM init:', e.message); }
}

async function requestPushPermission() {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') await initPush(currentUser);
  updatePushBtn();
}

// Renvoie true si on tourne sur iOS hors mode app installée (PWA).
function _isIOSNonStandalone() {
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  const standalone = navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  return isIOS && !standalone;
}

// Affiche une notification locale (via service worker, repli Notification).
// Renvoie true si la notification a pu être affichée.
async function _showLocalNotif(title, body) {
  if (!('Notification' in window)) return false;
  if (_isIOSNonStandalone()) return false;
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  try {
    await navigator.serviceWorker.register('firebase-messaging-sw.js');
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, icon: 'assets/logo.png', badge: 'assets/logo.png', tag: 'recap' });
    return true;
  } catch(e) {
    try { new Notification(title, { body, icon: 'assets/logo.png' }); return true; }
    catch(e2) { console.warn('Notif locale:', e2.message); return false; }
  }
}

// Envoie une notification de test locale (valide permission + SW + affichage).
async function sendTestNotification() {
  const btn = document.getElementById('btn-test-push');
  if (!('Notification' in window)) {
    _showChatToast({ icon: IC.bellOff, title: 'Non supporté', msg: 'Ce navigateur ne gère pas les notifications.' });
    return;
  }
  if (_isIOSNonStandalone()) {
    _showChatToast({ icon: IC.phone, title: 'Installez l\'app', msg: 'Sur iPhone : Partager → Sur l\'écran d\'accueil, puis rouvrez Capital Board.' });
    return;
  }
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    _showChatToast({ icon: IC.bellOff, title: 'Notifications bloquées', msg: 'Autorisez les notifications dans votre navigateur.' });
    updatePushBtn();
    return;
  }
  if (btn) { btn.disabled = true; btn.innerHTML = IC.mail + ' Envoi…'; }
  const title = 'Capital Board — Test';
  const body  = 'Notification de test reçue avec succès';
  try {
    await navigator.serviceWorker.register('firebase-messaging-sw.js');
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body, icon: 'assets/logo.png', badge: 'assets/logo.png', tag: 'test',
    });
  } catch(e) {
    // Repli : notification directe sans service worker
    try { new Notification(title, { body, icon: 'assets/logo.png' }); }
    catch(e2) { console.warn('Test notif:', e2.message); }
  }
  _logNotifHistory('test', title, body);
  _showChatToast({ icon: IC.bell, title: 'Test envoyé', msg: 'Vérifiez vos notifications.' });
  renderNotificationsPage();
  if (btn) { btn.disabled = false; btn.innerHTML = IC.mail + ' Tester'; }
}

function _logNotifHistory(type, title, body) {
  if (!currentUser) return;
  const history = getNotifHistory(currentUser);
  history.unshift({ id: Date.now(), type, title, body, timestamp: new Date().toISOString(), read: false });
  if (history.length > 50) history.splice(50);
  saveNotifHistory(currentUser, history);
  _updateNotifBadge();
}

function _updateNotifBadge() {
  const unread = currentUser ? getNotifHistory(currentUser).filter(n => !n.read).length : 0;
  ['notif-nav-badge', 'notif-drawer-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = unread > 0 ? 'inline' : 'none';
    el.textContent = unread > 9 ? '9+' : String(unread);
  });
}

function checkPriceAlerts() {
  if (!currentUser) return;
  const settings = getUserSettings(currentUser);
  if (settings.notifSettings?.priceAlerts === false) return;
  const alerts = getAlerts(currentUser);
  if (!alerts.length) return;
  const allItems = [
    ...getPortfolio(currentUser).map(p => ({ ticker: p.ticker, price: p.currentPrice })),
    ...getWatchlist(currentUser).map(w => ({ ticker: w.ticker, price: w.price }))
  ];
  let changed = false;
  alerts.forEach(alert => {
    if (!alert.active || alert.triggeredAt) return;
    const item = allItems.find(i => i.ticker === alert.ticker);
    if (!item || !item.price) return;
    const hit = alert.direction === 'above' ? item.price >= alert.targetPrice : item.price <= alert.targetPrice;
    if (hit) {
      alert.triggeredAt = new Date().toISOString();
      alert.active = false;
      const dir = alert.direction === 'above' ? '>=' : '<=';
      const body = alert.name + ' (' + alert.ticker + ') ' + dir + ' ' + alert.targetPrice + 'EUR — cours : ' + item.price.toFixed(2) + 'EUR';
      _logNotifHistory('price_alert', 'Alerte prix declenchee', body);
      _showBrowserNotif('Alerte prix', body);
      changed = true;
    }
  });
  if (changed) {
    saveAlerts(currentUser, alerts);
    if (document.getElementById('page-notifications')?.classList.contains('active')) renderNotificationsPage();
  }
}

function renderNotificationsPage() {
  renderAlertsList();
  renderNotifSettings();
  updatePushBtn();
  // Marquer les notifications comme lues à l'ouverture de la page
  const h = getNotifHistory(currentUser);
  if (h.some(n => !n.read)) { h.forEach(n => n.read = true); saveNotifHistory(currentUser, h); }
  _updateNotifBadge();
  const hint = document.getElementById('ios-push-hint');
  if (hint) hint.style.display = _isIOSNonStandalone() ? 'flex' : 'none';
}

// ─── PAGE RÉCAP DU JOUR ───────────────────────────────
// Affiche le dernier récap quotidien généré côté serveur (Firestore).
// Peint le cache immédiatement, puis rafraîchit depuis Firestore (un
// nouveau récap a pu être généré depuis l'ouverture de la session).
let _recapView = 'day';

function renderRecapPage() {
  // Auto-select: vendredi (5) → hebdo, autres jours → quotidien
  const isFriday = new Date().getDay() === 5;
  const view = isFriday ? 'week' : 'day';
  const dayEl  = document.getElementById('recap-day-view');
  const weekEl = document.getElementById('recap-week-view');
  if (dayEl)  dayEl.style.display  = view === 'day'  ? '' : 'none';
  if (weekEl) weekEl.style.display = view === 'week' ? '' : 'none';
  const gen = document.getElementById('btn-generate-recap');
  if (gen) gen.style.display = view === 'day' ? '' : 'none';
  _paintRecapPage();
  _paintWeeklyRecap();
  _refreshRecap();
  _refreshWeeklyRecap();
}

// Bascule entre vue quotidienne et hebdomadaire.
window.switchRecapView = function(v) {
  _recapView = v;
  const dayEl  = document.getElementById('recap-day-view');
  const weekEl = document.getElementById('recap-week-view');
  if (dayEl)  dayEl.style.display  = v === 'day'  ? '' : 'none';
  if (weekEl) weekEl.style.display = v === 'week' ? '' : 'none';
  document.querySelectorAll('.recap-switch-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === v));
  const gen = document.getElementById('btn-generate-recap');
  if (gen) gen.style.display = v === 'day' ? '' : 'none';
};

async function _refreshRecap() {
  if (window.IS_DEMO) return;
  if (!currentUser || !db) return;
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'recap'));
    _localCache[currentUser + '_recap'] = snap.exists() ? snap.data() : null;
    if (document.getElementById('page-recap')?.classList.contains('active')) _paintRecapPage();
  } catch(e) { /* garde le cache */ }
}

async function _refreshWeeklyRecap() {
  if (window.IS_DEMO) return;
  if (!currentUser || !db) return;
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'weeklyRecap'));
    _localCache[currentUser + '_weeklyRecap'] = snap.exists() ? snap.data() : null;
    if (document.getElementById('page-recap')?.classList.contains('active')) _paintWeeklyRecap();
  } catch(e) { /* garde le cache */ }
}

// ─── RENDU DU RAPPORT HEBDOMADAIRE ────────────────────────────
function _paintWeeklyRecap() {
  const el = document.getElementById('weekly-content');
  if (!el) return;
  const r = getWeeklyRecap(currentUser);

  if (!r || !r.lines || !r.lines.length) {
    el.innerHTML =
      '<div class="section-card" style="text-align:center;padding:48px 24px">'
      + '<div style="margin-bottom:12px;opacity:0.5"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8892a8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>'
      + '<div style="font-size:14px;color:var(--text2);font-weight:600;margin-bottom:6px">Aucun rapport hebdomadaire</div>'
      + '<div style="font-size:12px;color:var(--text3);line-height:1.6">Le rapport hebdomadaire est généré<br>chaque vendredi soir à 20h.</div>'
      + '</div>';
    return;
  }

  const sgn = v => v >= 0 ? '+' : '';
  const col = v => v >= 0 ? 'var(--positive)' : 'var(--negative)';
  const fp  = v => sgn(v) + (v).toFixed(2) + ' %';

  const _u    = fbAuth.currentUser;
  const _name = (_u && (_u.displayName || (_u.email || '').split('@')[0])) || '';
  const wkCol = col(r.weekChange);

  const rows = r.lines.map(l => {
    const c = col(l.weekPct);
    const badge = isETF(l.ticker)
      ? '<span class="badge-etf">ETF</span>'
      : '<span class="badge-action">ACTION</span>';
    return '<tr>'
      + '<td data-label="Action"><div style="display:flex;align-items:center;gap:9px">'
      + logoHtml(l.ticker, 28, 'ticker-icon')
      + '<span style="font-size:13px;font-weight:600;color:var(--text)">' + l.name + badge + '</span>'
      + '</div></td>'
      + '<td data-label="Ticker" style="color:var(--text2)">' + l.ticker + '</td>'
      + '<td data-label="Qté" style="color:var(--text)">' + l.qty + '</td>'
      + '<td data-label="Cours" style="color:var(--text)">' + fmt(l.price) + '</td>'
      + '<td data-label="Var. semaine" style="color:' + c + '">' + fp(l.weekPct) + '</td>'
      + '</tr>';
  }).join('');

  const bestWorst = (r.best && r.worst)
    ? '<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:18px">'
      + '<div class="stat-card" style="border-left:3px solid var(--positive)">'
      + '<div class="stat-label" style="display:flex;align-items:center;gap:6px">' + IC.trophy + 'Meilleure de la semaine</div>'
      + '<div class="stat-value" style="font-size:15px">' + r.best.name + '</div>'
      + '<div class="stat-sub" style="color:var(--positive)">' + fp(r.best.weekPct) + '</div></div>'
      + '<div class="stat-card" style="border-left:3px solid var(--negative)">'
      + '<div class="stat-label" style="display:flex;align-items:center;gap:6px">' + IC.trendDown + 'Moins bonne de la semaine</div>'
      + '<div class="stat-value" style="font-size:15px">' + r.worst.name + '</div>'
      + '<div class="stat-sub" style="color:var(--negative)">' + fp(r.worst.weekPct) + '</div></div>'
      + '</div>'
    : '';

  const divs = r.dividends || [];
  const divBlock = '<div class="section-card" style="margin-bottom:18px">'
    + '<div class="section-title">Dividendes à venir</div>'
    + (divs.length
      ? '<div style="display:flex;flex-direction:column;gap:8px">'
        + divs.map(d => '<div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px">'
          + '<span style="color:var(--text)">' + d.name + (d.estimated ? ' <span style="color:var(--text3);font-size:10px">estimé</span>' : '') + '</span>'
          + '<span style="color:var(--text2);font-family:var(--mono);white-space:nowrap">'
          + (d.amount ? d.amount + ' € · ' : '') + (d.estimated ? '≈ ' : '') + d.date + '</span></div>').join('')
        + '</div>'
      : '<div style="font-size:12.5px;color:var(--text3)">Aucun dividende à venir — lignes capitalisantes ou sans versement prévu.</div>')
    + '</div>';

  el.innerHTML =
    '<div style="font-size:12px;color:var(--text3);margin-bottom:14px">' + (r.weekLabel || '') + '</div>'
    + '<div class="recap-hello">Bonjour <strong style="color:var(--text)">' + _name + '</strong>,</div>'

    // KPIs
    + '<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:18px">'
    + '<div class="stat-card"><div class="stat-label">Valeur totale</div>'
    + '<div class="stat-value">' + fmt(r.totalValue) + '</div></div>'
    + '<div class="stat-card"><div class="stat-label">Variation de la semaine</div>'
    + '<div class="stat-value" style="color:' + wkCol + '">' + fp(r.weekPct) + '</div>'
    + '<div class="stat-sub" style="color:' + wkCol + '">' + sgn(r.weekChange) + fmt(r.weekChange) + '</div></div>'
    + '<div class="stat-card"><div class="stat-label">Lignes</div>'
    + '<div class="stat-value">' + r.lines.length + '</div></div>'
    + '</div>'

    + bestWorst
    + divBlock

    // Rapport IA
    + (r.aiReport
      ? '<div class="recap-ai">'
        + '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">'
        + '<div class="recap-ai-title">✦ Rapport hebdomadaire</div>'
        + (r.date || r.generatedAt ? '<span style="font-size:11.5px;color:var(--text3)">' + new Date(r.date || r.generatedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) + '</span>' : '')
        + '</div>'
        + '<div class="recap-ai-text">' + _renderAiReport(r.aiReport) + '</div></div>'
      : '')

    // Détail
    + '<div class="section-card">'
    + '<div class="section-title">Détail des lignes — semaine</div>'
    + '<div style="overflow-x:auto"><table class="recap-table">'
    + '<thead><tr><th>Action</th><th>Ticker</th><th>Qté</th><th>Cours</th><th>Var. semaine</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div></div>';
}

// Génère un récap immédiatement à partir du portefeuille courant et le
// stocke dans Firestore. Aperçu local : pas d'analyse IA, pas de push
// (la push s'envoie uniquement côté serveur via GitHub Actions).
// ─── ACTUALITÉS MARCHÉS ──────────────────────────────────────────────────
// Flux RSS agrégés et dédoublonnés par le Worker (GET /news), qui les garde
// 15 min en KV. Ici on ajoute un cache mémoire de 10 min : la page se consulte
// par à-coups et le contenu est le même pour tout le monde.
const NEWS_MEM_TTL = 10 * 60 * 1000;
const _newsCache   = {};   // clé de page → { items, updatedAt, stale, fetchedAt }
const _newsLoading = {};

function _newsCard(n, proxyImg) {
  const dt   = n.ts ? new Date(n.ts) : null;
  const when = dt ? _relTime(dt) : '';
  const full = dt ? dt.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) : '';
  // Titres et résumés viennent d'éditeurs tiers : échappement obligatoire.
  const href = /^https:\/\//i.test(n.link) ? n.link.replace(/"/g, '%22') : '#';
  // Les vignettes Meta refusent le hotlink (CORP) : elles transitent par le Worker.
  let img = /^https:\/\//i.test(n.img || '') ? n.img : '';
  if (img) img = (proxyImg ? WORKER_URL + '/fav-img?url=' + encodeURIComponent(img) : img.replace(/"/g, '%22'));
  // Les passerelles Instagram recopient la légende dans le titre ET dans la
  // description : sans ça, chaque carte affiche deux fois le même texte.
  const norm    = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
  const summary = norm(n.summary) && norm(n.summary) !== norm(n.title) ? n.summary : '';

  return '<a class="news-card' + (summary ? '' : ' news-card-nosum') + '" href="' + href + '" target="_blank" rel="noopener noreferrer">'
    + (img ? '<img class="news-thumb" src="' + img + '" alt="" loading="lazy" onerror="this.remove()">' : '')
    + '<div class="news-body">'
    +   '<div class="news-meta"><span class="news-source">' + _escapeHtmlChat(n.source) + '</span>'
    +     (when ? '<span class="news-date" title="' + _escapeHtmlChat(full) + '">' + _escapeHtmlChat(when) + '</span>' : '')
    +   '</div>'
    +   '<div class="news-title">' + _escapeHtmlChat(n.title) + '</div>'
    +   (summary ? '<div class="news-summary">' + _escapeHtmlChat(summary) + '</div>' : '')
    + '</div></a>';
}

// Les deux pages de flux (Actualités marchés, Contenus favoris) partagent le
// même contrat côté Worker — { items, updatedAt, stale } — donc le même rendu.
const FEED_PAGES = {
  news: {
    path: '/news', list: 'news-list', sub: 'news-updated', fn: 'renderActualites',
    empty: 'Aucune actualité disponible pour le moment.',
    error: 'Actualités indisponibles pour l\'instant.',
  },
  favoris: {
    path: '/favoris', list: 'fav-list', sub: 'fav-updated', fn: 'renderFavoris',
    proxyImg: true, layout: 'carousel',
    empty: 'Aucun contenu pour le moment.',
    error: 'Contenus indisponibles pour l\'instant.',
    unconfigured: 'Les comptes suivis ne sont pas encore configurés.',
  },
};

// Rendu « carrousel par compte » : une rangée défilante par source, les comptes
// classés du plus récemment actif au plus ancien. Sépare visuellement les
// sources, ce qu'une liste unique ne fait pas.
function _feedCarousel(items, proxyImg) {
  const parCompte = new Map();
  items.forEach(i => {
    if (!parCompte.has(i.source)) parCompte.set(i.source, []);
    parCompte.get(i.source).push(i);
  });

  const blocs = [...parCompte.entries()]
    .sort((a, b) => (b[1][0].ts || 0) - (a[1][0].ts || 0));

  return blocs.map(([compte, posts]) => {
    // Le libellé configuré est du type « @zonebourse » : on en tire le profil.
    const handle  = compte.replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '');
    const lienCpt = handle
      ? '<a class="fav-car-all" href="https://www.instagram.com/' + handle + '/" target="_blank" rel="noopener noreferrer">Voir le compte →</a>'
      : '';

    // Photo de profil : portée par les items, absente des sources sans Graph API.
    let ava = (posts.find(p => /^https:\/\//i.test(p.avatar || '')) || {}).avatar || '';
    if (ava) ava = proxyImg ? WORKER_URL + '/fav-img?url=' + encodeURIComponent(ava) : ava.replace(/"/g, '%22');
    const avaImg = ava
      ? '<img class="fav-car-avatar" src="' + ava + '" alt="" loading="lazy" onerror="this.remove()">'
      : '';

    const cartes = posts.map(p => {
      const dt   = p.ts ? new Date(p.ts) : null;
      const href = /^https:\/\//i.test(p.link) ? p.link.replace(/"/g, '%22') : '#';
      let img = /^https:\/\//i.test(p.img || '') ? p.img : '';
      if (img) img = proxyImg ? WORKER_URL + '/fav-img?url=' + encodeURIComponent(img) : img.replace(/"/g, '%22');
      // La vignette est posée deux fois : en fond (floutée par le CSS) pour
      // combler le cadre, et par-dessus en entier. Même URL donc même
      // téléchargement, le navigateur ne la charge qu'une fois.
      return '<a class="fav-car-card" href="' + href + '" target="_blank" rel="noopener noreferrer">'
        + (img ? '<div class="fav-car-media" style="background-image:url(&quot;' + img + '&quot;)">'
               +   '<img src="' + img + '" alt="" loading="lazy" onerror="this.parentNode.remove()">'
               + '</div>' : '')
        + '<div class="fav-car-body">'
        +   '<div class="fav-car-title">' + _escapeHtmlChat(p.title) + '</div>'
        +   (dt ? '<span class="news-date">' + _escapeHtmlChat(_relTime(dt)) + '</span>' : '')
        + '</div></a>';
    }).join('');

    return '<div class="fav-car-block">'
      + '<div class="fav-car-head">'
      +   '<span class="fav-car-account">' + avaImg
      +     '<span class="news-source">' + _escapeHtmlChat(compte) + '</span>'
      +   '</span>' + lienCpt
      + '</div>'
      + '<div class="fav-car-wrap">'
      +   '<button type="button" class="fav-car-nav prev" onclick="favCarScroll(this,-1)" aria-label="Publications précédentes">'
      +     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
      +   '</button>'
      +   '<div class="fav-car-row">' + cartes + '</div>'
      +   '<button type="button" class="fav-car-nav next" onclick="favCarScroll(this,1)" aria-label="Publications suivantes">'
      +     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
      +   '</button>'
      + '</div></div>';
  }).join('');
}

// Un bouton est masqué dès qu'on touche l'extrémité correspondante : garder
// une flèche cliquable qui ne fait rien est plus déroutant que pas de flèche.
function _favCarSync(row) {
  const wrap = row.closest('.fav-car-wrap');
  if (!wrap) return;
  const max  = row.scrollWidth - row.clientWidth;
  const prev = wrap.querySelector('.fav-car-nav.prev');
  const next = wrap.querySelector('.fav-car-nav.next');
  if (prev) prev.classList.toggle('off', row.scrollLeft <= 4);
  if (next) next.classList.toggle('off', row.scrollLeft >= max - 4);
}

// Glisser-déposer à la souris, en complément des flèches. Réservé au pointeur
// souris : sur écran tactile le défilement natif fait déjà le travail, et le
// court-circuiter dégraderait l'inertie du système.
function _favCarDrag(row) {
  let actif = false, departX = 0, departScroll = 0, amplitude = 0;

  // Surtout pas de setPointerCapture ici : la capture redirige le pointerup ET
  // le click vers la rangée, et la carte survolée ne s'ouvre plus jamais.
  // Suivre le pointeur sur window donne le même confort sans casser le clic.
  const bouge = e => {
    if (!actif) return;
    const dx = e.clientX - departX;
    amplitude = Math.max(amplitude, Math.abs(dx));
    if (Math.abs(dx) > 3) {
      row.classList.add('dragging');   // neutralise scroll-snap pendant le geste
      row.scrollLeft = departScroll - dx;
      e.preventDefault();
    }
  };

  const fin = () => {
    if (!actif) return;
    actif = false;
    row.classList.remove('grabbing');
    window.removeEventListener('pointermove', bouge);
    window.removeEventListener('pointerup', fin);
    window.removeEventListener('pointercancel', fin);
    // Le snap ne se réapplique qu'après le geste, sinon il ramène la rangée.
    setTimeout(() => row.classList.remove('dragging'), 60);
  };

  row.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    actif = true; amplitude = 0;
    departX = e.clientX; departScroll = row.scrollLeft;
    row.classList.add('grabbing');
    window.addEventListener('pointermove', bouge);
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
  });

  // Sans ça, relâcher après un glissement ouvre la publication survolée.
  row.addEventListener('click', e => {
    if (amplitude > 5) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // Empêche le drag natif de l'image (fantôme translucide au curseur).
  row.addEventListener('dragstart', e => e.preventDefault());
}

function _favCarInit(container) {
  container.querySelectorAll('.fav-car-row').forEach(row => {
    row.addEventListener('scroll', () => _favCarSync(row), { passive: true });
    _favCarDrag(row);
    _favCarSync(row);
  });
}

window.favCarScroll = function(btn, dir) {
  const wrap = btn.closest('.fav-car-wrap');
  const row  = wrap && wrap.querySelector('.fav-car-row');
  if (!row) return;
  const card = row.querySelector('.fav-car-card');
  // Un « écran » de cartes moins une, pour garder un repère visuel au défilement.
  const unit = card ? card.offsetWidth + 12 : 220;
  const step = Math.max(unit, (Math.max(1, Math.floor(row.clientWidth / unit) - 1)) * unit);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  row.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' });
};

function _paintFeed(key) {
  const cfg   = FEED_PAGES[key];
  const cache = _newsCache[key];
  const list  = document.getElementById(cfg.list);
  const sub   = document.getElementById(cfg.sub);
  if (!list || !cache) return;

  if (!cache.items.length) {
    list.innerHTML = '<div class="news-empty">'
      + (cache.unconfigured ? (cfg.unconfigured || cfg.empty) : cfg.empty) + '</div>';
    if (sub) sub.textContent = '';
    return;
  }

  list.innerHTML = cfg.layout === 'carousel'
    ? _feedCarousel(cache.items, !!cfg.proxyImg)
    : cache.items.map(i => _newsCard(i, !!cfg.proxyImg)).join('');
  if (cfg.layout === 'carousel') _favCarInit(list);
  if (sub) {
    sub.textContent = '· Mis à jour ' + _relTime(new Date(cache.updatedAt))
      + (cache.stale ? ' — flux momentanément indisponibles, dernière collecte affichée' : '');
  }
}

async function _renderFeed(key, force) {
  const cfg  = FEED_PAGES[key];
  const list = document.getElementById(cfg.list);
  if (!list) return;

  const cache = _newsCache[key];
  if (!force && cache && Date.now() - cache.fetchedAt < NEWS_MEM_TTL) { _paintFeed(key); return; }
  if (_newsLoading[key]) return;
  _newsLoading[key] = true;

  if (!cache) {
    list.innerHTML = ('<div class="news-card news-skel"><div class="news-body">'
      + '<div class="skel-line" style="width:30%"></div><div class="skel-line" style="width:85%"></div>'
      + '<div class="skel-line" style="width:60%"></div></div></div>').repeat(4);
  }

  try {
    const r = await fetch(WORKER_URL + cfg.path, { signal: AbortSignal.timeout(12000) });
    const d = await r.json();
    if (!r.ok && !(d.items || []).length && !d.unconfigured) throw new Error(d.error || ('HTTP ' + r.status));
    _newsCache[key] = {
      items: d.items || [], updatedAt: d.updatedAt || Date.now(),
      stale: !!d.stale, unconfigured: !!d.unconfigured, fetchedAt: Date.now(),
    };
    _paintFeed(key);
  } catch (e) {
    console.warn('[' + key + ']', e && e.message);
    if (!_newsCache[key]) {
      list.innerHTML = '<div class="news-empty">' + cfg.error
        + '<br><button class="btn-add" style="margin-top:12px;font-size:12px;padding:7px 14px" onclick="'
        + cfg.fn + '(true)">Réessayer</button></div>';
    }
  } finally {
    _newsLoading[key] = false;
  }
}

function renderActualites(force) { return _renderFeed('news', force); }
function renderFavoris(force)    { return _renderFeed('favoris', force); }

window.renderActualites = renderActualites;
window.renderFavoris    = renderFavoris;

window.generateRecapNow = async function() {
  const btn = document.getElementById('btn-generate-recap');
  const pf  = getPortfolio(currentUser);
  if (!pf.length) {
    _showChatToast({ icon: IC.inbox, title: 'Portefeuille vide', msg: 'Ajoutez des lignes avant de générer un récap.' });
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Génération…'; }

  const lines = pf.filter(r => r.currentPrice).map(r => {
    const chg  = r.changePct || 0;
    const prev = r.currentPrice / (1 + chg / 100);
    return {
      ticker:    r.ticker,
      name:      r.name || r.ticker,
      qty:       r.qty,
      buyPrice:  r.buyPrice || 0,
      price:     r.currentPrice,
      prev,
      changePct: chg,
      value:     r.qty * r.currentPrice,
      pnl:       r.qty * (r.currentPrice - (r.buyPrice || r.currentPrice)),
    };
  });

  const totalValue     = lines.reduce((s, l) => s + l.value, 0);
  const totalInvested  = lines.reduce((s, l) => s + l.qty * l.buyPrice, 0);
  const totalPnl       = totalValue - totalInvested;
  const totalPnlPct    = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const totalDayChange = lines.reduce((s, l) => s + l.qty * (l.price - l.prev), 0);
  const prevValue      = lines.reduce((s, l) => s + l.qty * l.prev, 0);
  const totalDayPct    = prevValue > 0 ? (totalDayChange / prevValue) * 100 : 0;
  const sorted         = [...lines].sort((a, b) => b.changePct - a.changePct);

  const recap = {
    date:        new Date().toISOString().slice(0, 10),
    dateLabel:   new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    generatedAt: new Date().toISOString(),
    totalValue, totalInvested, totalPnl, totalPnlPct, totalDayChange, totalDayPct,
    lines,
    best:  sorted.length     ? { name: sorted[0].name, changePct: sorted[0].changePct } : null,
    worst: sorted.length > 1 ? { name: sorted[sorted.length-1].name, changePct: sorted[sorted.length-1].changePct } : null,
    aiComment: '',
  };

  _localCache[currentUser + '_recap'] = recap;
  try {
    await setFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'recap'), recap);
  } catch(e) { console.warn('Récap save:', e); }

  _paintRecapPage();

  // Notification locale (sur l'appareil) — pas un envoi serveur FCM.
  const up       = totalDayPct >= 0;
  const pctStr   = (up ? '+' : '') + totalDayPct.toFixed(2) + '%';
  const ntitle   = `Récap du jour : ${pctStr}`;
  const nbody    = 'Touchez pour voir le détail.';
  const shown    = await _showLocalNotif(ntitle, nbody);
  _logNotifHistory('daily_recap', ntitle, nbody);
  renderNotificationsPage();

  if (btn) { btn.disabled = false; btn.innerHTML = IC.zap + ' Générer maintenant'; }
  _showChatToast({
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00e09e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    title: 'Récap généré',
    msg: shown ? 'Notification envoyée sur cet appareil.' : 'Aperçu local — notification non disponible.',
  });
};

// Supprime le récap stocké (utile pour les tests).
window.deleteRecap = async function() {
  _localCache[currentUser + '_recap'] = null;
  try {
    await deleteFirestoreDoc(firestoreDoc(db, 'users', currentUser, 'data', 'recap'));
  } catch(e) { console.warn('Récap delete:', e); }
  _paintRecapPage();
  _showChatToast({ icon: IC.trash, title: 'Récap supprimé', msg: 'La page Récap est de nouveau vide.' });
};

// Rendu markdown minimal : **gras**, *italique*, sauts de ligne.
function _mdInline(s) {
  const esc = String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');
}

// Rend le rapport IA (format "Titre: corps", une section par ligne).
function _renderAiReport(text) {
  const blocks = String(text || '')
    .split('\n')
    .map(s => s.trim().replace(/^[-*#\s]+/, '').trim())
    .filter(s => s && !/^[-—=*]{2,}$/.test(s));
  if (!blocks.length) return '';
  return blocks.map(b => {
    const i = b.indexOf(':');
    if (i < 0) return '<p class="recap-ai-b">' + _mdInline(b) + '</p>';
    const head = b.slice(0, i).replace(/\*/g, '').trim();
    const body = b.slice(i + 1).trim();
    const isSynth = /^synth[èe]se$/i.test(head);
    return '<div class="recap-ai-item' + (isSynth ? ' recap-ai-synth' : '') + '">'
      + '<div class="recap-ai-h">' + _mdInline(head) + '</div>'
      + '<div class="recap-ai-b">' + _mdInline(body) + '</div>'
      + '</div>';
  }).join('');
}

function _paintRecapPage() {
  const chk = document.getElementById('recap-notif-toggle');
  if (chk) chk.checked = getUserSettings(currentUser).pushRecap !== false;
  const el = document.getElementById('recap-content');
  if (!el) return;
  const r = getRecap(currentUser);

  if (!r || !r.lines || !r.lines.length) {
    el.innerHTML =
      '<div class="section-card" style="text-align:center;padding:48px 24px">'
      + '<div style="margin-bottom:12px;opacity:0.5"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>'
      + '<div style="font-size:14px;color:var(--text2);font-weight:600;margin-bottom:6px">Aucun récap pour l\'instant</div>'
      + '<div style="font-size:12px;color:var(--text3);line-height:1.6">Le récap quotidien est généré automatiquement<br>chaque jour ouvré à 20h.</div>'
      + '</div>';
    return;
  }

  const sgn = v => v >= 0 ? '+' : '';
  const col = v => v >= 0 ? 'var(--positive)' : 'var(--negative)';
  const fp  = v => sgn(v) + (v).toFixed(2) + ' %';

  const dayCol = col(r.totalDayChange);
  const glbCol = col(r.totalPnl);

  const rows = r.lines.map(l => {
    const c = col(l.changePct);
    const dayVal = l.qty * (l.price - l.prev);
    const badge  = isETF(l.ticker)
      ? '<span class="badge-etf">ETF</span>'
      : '<span class="badge-action">ACTION</span>';
    return '<tr>'
      + '<td data-label="Action"><div style="display:flex;align-items:center;gap:9px">'
      + logoHtml(l.ticker, 28, 'ticker-icon')
      + '<span style="font-size:13px;font-weight:600;color:var(--text)">' + l.name + badge + '</span>'
      + '</div></td>'
      + '<td data-label="Ticker" style="color:var(--text2)">' + l.ticker + '</td>'
      + '<td data-label="Qté" style="color:var(--text)">' + l.qty + '</td>'
      + '<td data-label="Cours" style="color:var(--text)">' + fmt(l.price) + '</td>'
      + '<td data-label="Var. jour" style="color:' + c + '">' + fp(l.changePct) + '</td>'
      + '<td data-label="Impact €" style="color:' + c + '">' + sgn(dayVal) + fmt(dayVal) + '</td>'
      + '</tr>';
  }).join('');

  const bestWorst = (r.best && r.worst)
    ? '<div class="stat-card" style="border-left:3px solid var(--positive)">'
      + '<div class="stat-label" style="display:flex;align-items:center;gap:6px">' + IC.trophy + 'Meilleure performance</div>'
      + '<div class="stat-value" style="font-size:15px">' + r.best.name + '</div>'
      + '<div class="stat-sub" style="color:var(--positive)">' + fp(r.best.changePct) + '</div></div>'
      + '<div class="stat-card" style="border-left:3px solid var(--negative)">'
      + '<div class="stat-label" style="display:flex;align-items:center;gap:6px">' + IC.trendDown + 'Moins bonne performance</div>'
      + '<div class="stat-value" style="font-size:15px">' + r.worst.name + '</div>'
      + '<div class="stat-sub" style="color:var(--negative)">' + fp(r.worst.changePct) + '</div></div>'
    : '';

  const _u    = fbAuth.currentUser;
  const _name = (_u && (_u.displayName || (_u.email || '').split('@')[0])) || '';
  const upN   = r.lines.filter(l => l.changePct > 0).length;
  const dnN   = r.lines.filter(l => l.changePct < 0).length;

  el.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px">'
    + '<div style="font-size:12px;color:var(--text3)">Récap du ' + (r.dateLabel || r.date || '') + '</div>'
    + '<button onclick="deleteRecap()" class="btn-outline" style="font-size:11px;padding:5px 11px;color:var(--negative);border-color:rgba(255,77,106,0.3);display:inline-flex;align-items:center;gap:5px">' + IC.trash + 'Supprimer</button>'
    + '</div>'

    // Salutation
    + '<div class="recap-hello">Bonjour <strong style="color:var(--text)">' + _name + '</strong>,</div>'

    // KPIs + best/worst sur une seule ligne défilante
    + '<div class="stats-scroll-wrap">'
    + '<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px" id="recap-kpis-row">'
    + '<div class="stat-card"><div class="stat-label">Valeur totale</div>'
    + '<div class="stat-value">' + fmt(r.totalValue) + '</div></div>'
    + '<div class="stat-card"><div class="stat-label">Variation du jour</div>'
    + '<div class="stat-value" style="color:' + dayCol + '">' + fp(r.totalDayPct) + '</div>'
    + '<div class="stat-sub" style="color:' + dayCol + '">' + sgn(r.totalDayChange) + fmt(r.totalDayChange) + '</div></div>'
    + '<div class="stat-card"><div class="stat-label">+/- Value totale</div>'
    + '<div class="stat-value" style="color:' + glbCol + '">' + sgn(r.totalPnl) + fmt(r.totalPnl) + '</div>'
    + '<div class="stat-sub" style="color:' + glbCol + '">' + fp(r.totalPnlPct) + '</div></div>'
    + '<div class="stat-card"><div class="stat-label">Lignes</div>'
    + '<div class="stat-value">' + r.lines.length + '</div>'
    + '<div class="stat-sub">' + upN + ' en hausse · ' + dnN + ' en baisse</div></div>'
    + bestWorst
    + '</div></div>'

    // Commentaire IA
    + (r.aiComment
      ? '<div class="recap-ai">'
        + '<div class="recap-ai-title">✦ Analyse IA</div>'
        + '<div class="recap-ai-text">' + _renderAiReport(r.aiComment) + '</div></div>'
      : '')

    // Tableau détaillé
    + '<div class="section-card">'
    + '<div class="section-title">Détail des lignes</div>'
    + '<div style="overflow-x:auto"><table class="recap-table">'
    + '<thead><tr>'
    + '<th>Action</th><th>Ticker</th><th>Qté</th><th>Cours</th><th>Var. jour</th><th>Impact €</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  startKpisAutoScroll('recap-kpis-row');
}

function updatePushBtn() {
  const btn = document.getElementById('btn-enable-push');
  if (!btn) return;
  const perm = 'Notification' in window ? Notification.permission : 'denied';
  if (VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
    btn.textContent = 'Cle VAPID non configuree';
    btn.disabled = true;
  } else if (perm === 'granted') {
    btn.textContent = 'Push actives';
    btn.disabled = true;
  } else if (perm === 'denied') {
    btn.textContent = 'Push bloques (parametres navigateur)';
    btn.disabled = true;
  } else {
    btn.textContent = 'Activer les push';
    btn.disabled = false;
  }
}

function renderNotifSettings() {
  const el = document.getElementById('notif-settings-list');
  if (!el) return;
  const settings = getUserSettings(currentUser);
  const ns = settings.notifSettings || { chat: true, dividends: true, priceAlerts: true };
  const toggles = [
    { key: 'dividends',   icon: IC.wallet, label: 'Dividendes recus',      sub: 'Notification lors de l enregistrement d un dividende' },
    { key: 'priceAlerts', icon: IC.target, label: 'Alertes prix',          sub: 'Notification quand un seuil de prix est atteint' },
  ];
  el.innerHTML = toggles.map(t => {
    const checked = ns[t.key] !== false;
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:18px">' + t.icon + '</span>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:600;color:var(--text)">' + t.label + '</div>' +
          '<div style="font-size:11px;color:var(--text3)">' + t.sub + '</div>' +
        '</div>' +
      '</div>' +
      '<div onclick="toggleNotifSetting(\'' + t.key + '\',' + !checked + ')" style="cursor:pointer;width:40px;height:22px;border-radius:22px;background:' + (checked ? 'var(--accent)' : 'var(--border2)') + ';position:relative;transition:background .2s;flex-shrink:0">' +
        '<div style="position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:3px;left:' + (checked ? '21px' : '3px') + ';transition:left .2s"></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

async function toggleNotifSetting(key, value) {
  const settings = getUserSettings(currentUser);
  const ns = Object.assign({ chat: true, dividends: true, priceAlerts: true }, settings.notifSettings || {});
  ns[key] = value;
  await saveUserSettings(currentUser, { notifSettings: ns });
  renderNotifSettings();
}

function renderAlertsList() {
  const list = document.getElementById('alerts-list');
  const empty = document.getElementById('alerts-empty');
  if (!list) return;
  const alerts = getAlerts(currentUser);
  if (!alerts.length) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  list.innerHTML = alerts.map((a, i) => {
    const dir = a.direction === 'above' ? '>=' : '<=';
    const status = a.triggeredAt
      ? '<span style="color:var(--accent);font-size:11px">Declenchee</span>'
      : '<span style="color:var(--positive);font-size:11px">Active</span>';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">' +
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:var(--text)">' + a.name + ' <span style="color:var(--text3);font-weight:400">(' + a.ticker + ')</span></div>' +
        '<div style="font-size:12px;color:var(--text2);margin-top:2px">Prix ' + dir + ' ' + a.targetPrice + 'EUR &nbsp;&middot;&nbsp; ' + status + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        (a.triggeredAt ? '<button onclick="resetAlert(' + i + ')" style="background:none;border:1px solid var(--border2);color:var(--text3);border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">Reactiver</button>' : '') +
        '<button onclick="deleteAlert(' + i + ')" style="background:none;border:1px solid rgba(255,77,106,0.3);color:var(--negative);border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">Suppr.</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderNotifHistory() {
  const list = document.getElementById('notif-history-list');
  const empty = document.getElementById('notif-history-empty');
  if (!list) return;
  const history = getNotifHistory(currentUser);
  if (!history.length) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  let changed = false;
  history.forEach(n => { if (!n.read) { n.read = true; changed = true; } });
  if (changed) { saveNotifHistory(currentUser, history); _updateNotifBadge(); }
  list.innerHTML = history.slice(0, 30).map(n => {
    const d = new Date(n.timestamp);
    const dateStr = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    const icon = n.type === 'price_alert' ? IC.target : n.type === 'dividend' ? IC.wallet : IC.message;
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">' +
      '<span style="font-size:18px;flex-shrink:0">' + icon + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;color:var(--text)">' + n.title + '</div>' +
        '<div style="font-size:12px;color:var(--text2);margin-top:2px;word-break:break-word">' + n.body + '</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:4px">' + dateStr + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function clearNotifHistory() {
  saveNotifHistory(currentUser, []);
  renderNotifHistory();
  _updateNotifBadge();
}

function openAddAlertModal() {
  const seen = new Set();
  const items = [];
  [...getPortfolio(currentUser), ...getWatchlist(currentUser)].forEach(r => {
    if (!seen.has(r.ticker)) { seen.add(r.ticker); items.push({ ticker: r.ticker, name: r.name || r.ticker }); }
  });
  if (!items.length) { alert('Ajoutez des actions au portefeuille ou a la watchlist.'); return; }
  const sel = document.getElementById('alert-ticker-select');
  sel.innerHTML = items.map(i => '<option value="' + i.ticker + '">' + i.name + ' (' + i.ticker + ')</option>').join('');
  document.getElementById('alert-price').value = '';
  document.getElementById('alert-direction').value = 'below';
  document.getElementById('alert-modal-overlay').classList.add('open');
}

function closeAlertModal() {
  document.getElementById('alert-modal-overlay').classList.remove('open');
}

function confirmAddAlert() {
  const sel = document.getElementById('alert-ticker-select');
  const ticker = sel.value;
  const name = (sel.options[sel.selectedIndex]?.text || ticker).split(' (')[0];
  const direction = document.getElementById('alert-direction').value;
  const targetPrice = parseFloat(document.getElementById('alert-price').value);
  if (!ticker || !targetPrice || targetPrice <= 0) { alert('Veuillez remplir tous les champs.'); return; }
  const alerts = getAlerts(currentUser);
  alerts.push({ id: Date.now(), ticker, name, direction, targetPrice, active: true, createdAt: new Date().toISOString() });
  saveAlerts(currentUser, alerts);
  closeAlertModal();
  renderAlertsList();
}

function deleteAlert(i) {
  const alerts = getAlerts(currentUser);
  alerts.splice(i, 1);
  saveAlerts(currentUser, alerts);
  renderAlertsList();
}

function resetAlert(i) {
  const alerts = getAlerts(currentUser);
  alerts[i].active = true;
  delete alerts[i].triggeredAt;
  saveAlerts(currentUser, alerts);
  renderAlertsList();
}

// ─── SUPPORT CHAT ────────────────────────────────────────
// Chat 1-to-1 entre user et admin (toi). Firestore:
//   supportChats/{userUid}/messages/{msgId}
//   supportThreads/{userUid}  → metadata thread pour vue admin
const ADMIN_UID = "A6nZQ8PcxdURytSesA17xK81I9T2";

let _supportUnsub = null;
let _supportThreadsUnsub = null;
let _supportPresenceUnsub = null;
let _activeSupportThread = null;
let _currentThreadMeta = null;
let _supportAdminTab = "active"; // 'active' | 'archived'
let _presenceHeartbeat = null;
let _typingTimer = null;
let _typingClearTimer = null;
let _supportThreadDocUnsub = null;
const ADMIN_DISPLAY_NAME = "Armel";

// Sons chat via Web Audio API (pas de fichier externe).
let _audioCtx = null;
function _playTone(freq, duration, type) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, _audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(_audioCtx.destination);
    osc.start();
    osc.stop(_audioCtx.currentTime + duration);
  } catch(_) {}
}
function _playMessageSound() { _playTone(880, 0.18, "sine"); setTimeout(() => _playTone(1175, 0.15, "sine"), 70); }
function _playOpenChatSound() { _playTone(523, 0.08, "sine"); setTimeout(() => _playTone(659, 0.12, "sine"), 50); }

// Modal de saisie multi-champs (remplace window.prompt).
// fields: [{ name, label, placeholder, type, required }]
// onConfirm reçoit un objet { name: value }. Backward-compat: si pas de "fields",
// utilise placeholder/okLabel et passe directement la valeur string.
window.showPromptModal = function({ title, body, placeholder, fields, okLabel, cancelLabel, onConfirm }) {
  const existing = document.getElementById("prompt-modal-dyn");
  if (existing) existing.remove();
  const useFields = Array.isArray(fields) && fields.length > 0
    ? fields
    : [{ name: "_v", label: "", placeholder: placeholder || "", type: "text", required: true }];
  const wrap = document.createElement("div");
  wrap.id = "prompt-modal-dyn";
  wrap.className = "modal-overlay open";
  const fieldsHtml = useFields.map(f => {
    const lbl = f.label ? '<label style="display:block;font-size:11px;color:var(--text2);margin-bottom:4px;font-weight:600">' + _escapeHtmlChat(f.label) + (f.required ? ' *' : '') + '</label>' : '';
    if (f.type === "textarea") {
      return lbl + '<textarea data-name="' + f.name + '" placeholder="' + _escapeHtmlChat(f.placeholder || "") + '" rows="3" style="width:100%;padding:10px 12px;background:var(--s3);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:13px;font-family:inherit;resize:vertical;margin-bottom:12px"></textarea>';
    }
    return lbl + '<input data-name="' + f.name + '" type="text" placeholder="' + _escapeHtmlChat(f.placeholder || "") + '" style="width:100%;padding:11px 13px;background:var(--s3);border:1px solid var(--border2);border-radius:9px;color:var(--text);font-size:13px;font-family:inherit;margin-bottom:12px">';
  }).join("");
  wrap.innerHTML =
    '<div class="modal">'
    + '<div class="modal-title">' + _escapeHtmlChat(title || "") + '</div>'
    + (body ? '<div class="modal-sub">' + _escapeHtmlChat(body) + '</div>' : '')
    + fieldsHtml
    + '<div class="modal-footer">'
    + '<button class="btn-secondary" id="prompt-modal-cancel">' + (cancelLabel || "Annuler") + '</button>'
    + '<button class="btn-primary" id="prompt-modal-ok">' + (okLabel || "Valider") + '</button>'
    + '</div></div>';
  document.body.appendChild(wrap);
  const inputs = wrap.querySelectorAll("[data-name]");
  if (inputs[0]) inputs[0].focus();
  const close = () => wrap.remove();
  document.getElementById("prompt-modal-cancel").onclick = close;
  document.getElementById("prompt-modal-ok").onclick = () => {
    const out = {};
    let ok = true;
    inputs.forEach(inp => {
      const v = (inp.value || "").trim();
      const field = useFields.find(f => f.name === inp.dataset.name);
      if (field && field.required && !v) ok = false;
      out[inp.dataset.name] = v;
    });
    if (!ok) { alert("Champs obligatoires manquants."); return; }
    close();
    if (onConfirm) onConfirm(fields ? out : out._v);
  };
  inputs.forEach(inp => inp.addEventListener("keydown", e => {
    if (e.key === "Enter" && inp.tagName !== "TEXTAREA") document.getElementById("prompt-modal-ok").click();
  }));
  wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
};

// Génère un ticket ID stable à partir d'un UID (6 hex chars).
function _genTicketId(uid) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = ((h << 5) - h + uid.charCodeAt(i)) | 0;
  return 'CB-' + Math.abs(h).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
}

// "Vu il y a X" — formatte un timestamp Firestore en relative time.
function _formatLastSeen(ts) {
  if (!ts) return "jamais vu";
  let date;
  try { date = ts.toDate ? ts.toDate() : new Date(ts); } catch(_) { return ""; }
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "à l'instant";
  if (diff < 3600000) return "il y a " + Math.floor(diff / 60000) + " min";
  if (diff < 86400000) return "il y a " + Math.floor(diff / 3600000) + " h";
  return "il y a " + Math.floor(diff / 86400000) + " j";
}

// Indique que je suis en train d'écrire (debounced, auto-clear après 3s).
window.signalTyping = function() {
  const targetUid = isAdmin() ? _activeSupportThread : currentUser;
  if (!targetUid || !db) return;
  const field = isAdmin() ? "adminTyping" : "userTyping";
  const update = {};
  update[field] = true;
  update[field + "At"] = serverTimestamp();
  if (_typingTimer) clearTimeout(_typingTimer);
  _typingTimer = setTimeout(() => {
    setFirestoreDoc(firestoreDoc(db, "supportThreads", targetUid), update, { merge: true }).catch(() => {});
  }, 200);
  if (_typingClearTimer) clearTimeout(_typingClearTimer);
  _typingClearTimer = setTimeout(() => {
    const clr = {};
    clr[field] = false;
    setFirestoreDoc(firestoreDoc(db, "supportThreads", targetUid), clr, { merge: true }).catch(() => {});
  }, 3500);
};

function _subscribeThreadDoc(uid) {
  if (_supportThreadDocUnsub) { _supportThreadDocUnsub(); _supportThreadDocUnsub = null; }
  _supportThreadDocUnsub = onSnapshot(firestoreDoc(db, "supportThreads", uid), snap => {
    const d = snap.exists() ? snap.data() : {};

    // Si l'état closed/archived change → re-render
    const wasClosed = window._supportUserClosed === true;
    const nowClosed = d.closed === true;
    if (!isAdmin() && nowClosed !== wasClosed) {
      window._supportUserClosed = nowClosed;
      if (window._supportUserView === "chat") _renderSupportUserChat();
      return;
    }
    if (isAdmin()) {
      // Re-render barre actions admin si état change
      const inputEl = document.getElementById("chat-input");
      const sendEl = document.getElementById("chat-send");
      if (inputEl) inputEl.disabled = nowClosed;
      if (sendEl) sendEl.disabled = nowClosed;
    }

    // Typing indicator
    const otherField = isAdmin() ? "userTyping" : "adminTyping";
    const otherFieldAt = otherField + "At";
    const atMs = (d[otherFieldAt] && d[otherFieldAt].toDate) ? d[otherFieldAt].toDate().getTime() : 0;
    const recent = atMs > 0 && (Date.now() - atMs) < 5000;
    const typing = d[otherField] === true && recent;
    const el = document.getElementById("typing-indicator");
    if (el) {
      const otherName = isAdmin() ? ((_currentThreadMeta && _currentThreadMeta.userName) || "L'utilisateur") : ADMIN_DISPLAY_NAME;
      el.innerHTML = typing ? '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ' + _escapeHtmlChat(otherName) + ' écrit…' : '';
    }
  }, () => {});
}

// Heartbeat presence : écrit online + lastSeen toutes les 30s.
function _startPresenceHeartbeat() {
  if (window.IS_DEMO || !db || !currentUser) return;
  if (_presenceHeartbeat) clearInterval(_presenceHeartbeat);
  const ping = () => {
    if (!currentUser) { if (_presenceHeartbeat) { clearInterval(_presenceHeartbeat); _presenceHeartbeat = null; } return; }
    setFirestoreDoc(firestoreDoc(db, "presence", currentUser),
      { online: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
  };
  ping();
  _presenceHeartbeat = setInterval(ping, 30000);
  window.addEventListener("beforeunload", () => {
    if (!currentUser) return;
    setFirestoreDoc(firestoreDoc(db, "presence", currentUser),
      { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
  });
}

function isAdmin() { return currentUser === ADMIN_UID; }

// ─── PAGE ADMIN ──────────────────────────────────────────────────
async function renderAdminPage() {
  if (!isAdmin()) { showPage('portfolio'); return; }
  let cfg = {};
  try { cfg = await _getAppConfig(); } catch (_) {}

  // PIN
  const pinT = document.getElementById('admin-pin-toggle');
  if (pinT) { pinT.checked = !!cfg.pinDisabled; _adminPinStatusText(!!cfg.pinDisabled); }

  // Maintenance
  const maintT = document.getElementById('admin-maint-toggle');
  const maintMsg = document.getElementById('admin-maint-msg');
  if (maintT) maintT.checked = !!cfg.maintenance;
  if (maintMsg) maintMsg.value = cfg.maintenanceMsg || '';
  _adminMaintStatus(!!cfg.maintenance);

  // Inscriptions
  const signupT = document.getElementById('admin-signup-toggle');
  const signupOpen = cfg.signupOpen !== false;
  if (signupT) signupT.checked = signupOpen;
  _adminSignupStatus(signupOpen);

  // Feature flags (on/off) — intégrés à l'éditeur de menu ci-dessous
  applyFeatureFlags(cfg.features || {});

  // Éditeur d'organisation du menu
  _navDraft = (Array.isArray(cfg.nav) && cfg.nav.length)
    ? _mergeNavOrphans(cfg.nav)
    : JSON.parse(JSON.stringify(DEFAULT_NAV));
  _socialDraft = { ...DEFAULT_SOCIAL, ...(cfg.social && typeof cfg.social === 'object' ? cfg.social : {}) };
  renderNavEditor();

  // Version / MAJ
  const vs = document.getElementById('admin-version-status');
  if (vs) vs.innerHTML = 'Version actuelle : <span class="mono">' + APP_VERSION + '</span>' +
    (cfg.minVersion ? ' · minimum forcé : <span class="mono">' + cfg.minVersion + '</span>' : '');

  // Stats + liste utilisateurs
  renderAdminStats();
  renderAdminUsers();
  adminLoadScheduled();
  _startHealthAuto();
}

async function adminToggleFeature(key, el) {
  if (!isAdmin()) return;
  const on = el.checked;
  el.disabled = true;
  try {
    await _setAppConfig({ features: { [key]: on } });
    _audit('feature', key + '=' + (on ? 'on' : 'off'));
    _featureFlags[key] = on;
    applyFeatureFlags(_featureFlags);
    if (_navDraft) renderNavEditor();
  } catch (e) {
    console.error('[admin] feature flag:', e);
    el.checked = !on;
  } finally { el.disabled = false; }
}

// ─── Éditeur d'organisation du menu (admin) ───
// Complète une config nav sauvegardée avec les entrées connues (DEFAULT_NAV)
// qui en sont absentes — ex. la catégorie « Réseaux » et les liens sociaux,
// ajoutés après la dernière sauvegarde admin. Sans ça l'éditeur ne les
// afficherait pas et on ne pourrait pas éditer leurs URLs.
function _mergeNavOrphans(nav) {
  const layout = JSON.parse(JSON.stringify(nav));
  const placed = new Set();
  layout.forEach(c => (c.items || []).forEach(k => placed.add(k)));
  DEFAULT_NAV.forEach(dc => {
    const missing = (dc.items || []).filter(k => ALL_SECTIONS.includes(k) && !placed.has(k));
    if (!missing.length) return;
    const cat = layout.find(c => (c.title || '') === (dc.title || ''));
    if (cat) cat.items = (cat.items || []).concat(missing);
    else layout.push({ title: dc.title, items: missing.slice() });
    missing.forEach(k => placed.add(k));
  });
  return layout;
}
function renderNavEditor() {
  const box = document.getElementById('admin-nav-editor');
  if (!box || !_navDraft) return;
  const used = new Set();
  _navDraft.forEach(c => (c.items || []).forEach(k => used.add(k)));
  const mini = 'width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--s3);color:var(--text3);cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center';

  box.innerHTML = _navDraft.map((cat, ci) => {
    const items = (cat.items || []).map((key, ii) => {
      const flaggable = FLAGGABLE.includes(key);
      const on = _isFeatureOn(key);
      const flagCtrl = flaggable
        ? '<label class="toggle-switch" style="transform:scale(.78);transform-origin:right center" title="Activer / masquer"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="adminToggleFeature(\'' + key + '\',this)"><span class="toggle-track"></span></label>'
        : '<span style="font-size:8.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px">core</span>';
      const dim = flaggable && !on ? 'opacity:.45' : '';
      const isSocial = SOCIAL_KEYS.includes(key);
      const socialInput = isSocial
        ? '<input value="' + ((_socialDraft && _socialDraft[key]) || '').replace(/"/g, '&quot;') + '" onchange="adminNavSetSocial(\'' + key + '\',this)" placeholder="https://…" spellcheck="false" style="width:100%;margin:5px 0 0;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--text2);font-size:11.5px;padding:6px 9px;font-family:var(--mono,monospace);outline:none;box-sizing:border-box">'
        : '';
      return '<div style="padding:7px 10px;background:var(--s2);border:1px solid var(--border);border-radius:9px;margin-bottom:5px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<span style="font-size:12.5px;color:var(--text);' + dim + '">' + (SECTION_LABELS[key] || key) + '</span>' +
          '<span style="display:flex;gap:6px;align-items:center">' +
            flagCtrl +
            '<button style="' + mini + '" onclick="adminNavMoveItem(' + ci + ',' + ii + ',-1)" title="Monter">▲</button>' +
            '<button style="' + mini + '" onclick="adminNavMoveItem(' + ci + ',' + ii + ',1)" title="Descendre">▼</button>' +
            '<button style="' + mini + '" onclick="adminNavRemoveItem(' + ci + ',' + ii + ')" title="Retirer du menu">✕</button>' +
          '</span>' +
        '</div>' + socialInput +
      '</div>';
    }).join('');
    // Entrées ajoutables ici : celles inutilisées, plus celles présentes dans
    // une AUTRE catégorie (les sélectionner les déplace ici). Permet de remplir
    // n'importe quelle catégorie, y compris une nouvelle vide.
    const inThisCat = new Set(cat.items || []);
    const unused    = ALL_SECTIONS.filter(k => !used.has(k));
    const elsewhere = ALL_SECTIONS.filter(k => used.has(k) && !inThisCat.has(k));
    const optGroup = (label, arr) => arr.length
      ? '<optgroup label="' + label + '">' + arr.map(k => '<option value="' + k + '">' + (SECTION_LABELS[k] || k) + '</option>').join('') + '</optgroup>'
      : '';
    const addOpts = (unused.length || elsewhere.length)
      ? '<select onchange="adminNavAddSection(' + ci + ',this)" style="width:100%;margin-top:4px;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--text2);font-size:12px;padding:7px 10px;font-family:var(--sans);outline:none">' +
          '<option value="">＋ Ajouter une entrée…</option>' +
          optGroup('Nouvelles', unused) +
          optGroup('Déplacer depuis une autre catégorie', elsewhere) +
        '</select>'
      : '';
    return '<div style="border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;background:#0f1119">' +
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:9px">' +
        '<input value="' + (cat.title || '').replace(/"/g, '&quot;') + '" onchange="adminNavRenameCategory(' + ci + ',this)" placeholder="Titre catégorie" style="flex:1;background:var(--s2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-weight:600;padding:8px 10px;font-family:var(--sans);outline:none">' +
        '<button style="' + mini + '" onclick="adminNavMoveCategory(' + ci + ',-1)" title="Monter catégorie">▲</button>' +
        '<button style="' + mini + '" onclick="adminNavMoveCategory(' + ci + ',1)" title="Descendre catégorie">▼</button>' +
        '<button style="' + mini + ';color:#ff5d78" onclick="adminNavDeleteCategory(' + ci + ')" title="Supprimer catégorie">✕</button>' +
      '</div>' + items + addOpts +
    '</div>';
  }).join('');
}

async function _saveNav() {
  applyNavLayout(_navDraft);
  applyFeatureFlags(_featureFlags);
  renderNavEditor();
  try { await _setAppConfig({ nav: _navDraft }); _audit('nav_update', ''); }
  catch (e) { console.error('[admin] save nav:', e); }
}

function adminNavMoveItem(ci, ii, dir) {
  const cats = _navDraft;
  const items = cats[ci].items;
  const ni = ii + dir;
  if (ni >= 0 && ni < items.length) {
    [items[ii], items[ni]] = [items[ni], items[ii]];
  } else if (dir < 0 && ci > 0) {
    cats[ci - 1].items.push(items.splice(ii, 1)[0]);       // remonte dans la catégorie précédente
  } else if (dir > 0 && ci < cats.length - 1) {
    cats[ci + 1].items.unshift(items.splice(ii, 1)[0]);    // descend dans la catégorie suivante
  } else { return; }
  _saveNav();
}
function adminNavRemoveItem(ci, ii) { _navDraft[ci].items.splice(ii, 1); _saveNav(); }
function adminNavAddSection(ci, sel) {
  const key = sel.value;
  if (!key) return;
  _navDraft.forEach(c => { c.items = c.items.filter(k => k !== key); }); // évite les doublons
  _navDraft[ci].items.push(key);
  _saveNav();
}
async function adminNavSetSocial(key, inp) {
  if (!SOCIAL_KEYS.includes(key)) return;
  const url = (inp.value || '').trim();
  if (!_socialDraft) _socialDraft = { ...DEFAULT_SOCIAL };
  _socialDraft[key] = url || DEFAULT_SOCIAL[key];
  applySocialLinks(_socialDraft); // effet immédiat sur les liens du menu
  try { await _setAppConfig({ social: _socialDraft }); _audit('social_update', key + '=' + _socialDraft[key]); }
  catch (e) { console.error('[admin] save social:', e); }
}
function adminNavRenameCategory(ci, inp) { _navDraft[ci].title = inp.value; _saveNav(); }
function adminNavDeleteCategory(ci) { _navDraft.splice(ci, 1); _saveNav(); }
function adminNavMoveCategory(ci, dir) {
  const ni = ci + dir;
  if (ni < 0 || ni >= _navDraft.length) return;
  [_navDraft[ci], _navDraft[ni]] = [_navDraft[ni], _navDraft[ci]];
  _saveNav();
}
function adminNavAddCategory() { _navDraft.push({ title: 'Nouvelle catégorie', items: [] }); _saveNav(); }
function adminNavReset() { _navDraft = JSON.parse(JSON.stringify(DEFAULT_NAV)); _saveNav(); }

// ─── Utilisateurs (admin) ───
function _relTime(d) {
  if (!d) return 'jamais';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'à l\'instant';
  if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min';
  if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h';
  return 'il y a ' + Math.floor(s / 86400) + ' j';
}

// Version ultra-compacte pour la liste admin : « 3min », « 22H », « 7J ».
function _relTimeShort(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'min';
  if (s < 86400) return Math.floor(s / 3600) + 'H';
  return Math.floor(s / 86400) + 'J';
}
async function renderAdminUsers() {
  if (!isAdmin()) return;
  const box = document.getElementById('admin-users');
  if (!box) return;
  box.innerHTML = 'Chargement…';
  const empty = { forEach() {} };
  try {
    const [rolesSnap, presSnap, threadsSnap] = await Promise.all([
      getDocs(firestoreCollection(db, 'roles')).catch(() => empty),
      getDocs(firestoreCollection(db, 'presence')).catch(() => empty),
      getDocs(firestoreCollection(db, 'supportThreads')).catch(() => empty),
    ]);
    const users = {};
    const get = uid => (users[uid] = users[uid] || { uid });
    rolesSnap.forEach(d => { const u = get(d.id), r = d.data(); u.role = r.role || 'user'; u.firstName = r.firstName; u.lastName = r.lastName; u.username = r.username; });
    // Online fiable : basé sur la fraîcheur de lastSeen (< 70s = ~2× le
    // heartbeat de 30s), PAS sur le booléen p.online qui reste figé à true si
    // l'onglet meurt sans déclencher beforeunload (fréquent sur mobile/PWA).
    presSnap.forEach(d => { const u = get(d.id), p = d.data(); u.lastSeen = p.lastSeen && p.lastSeen.toDate ? p.lastSeen.toDate() : null; u.online = !!(u.lastSeen && (Date.now() - u.lastSeen.getTime()) < 70000); });
    threadsSnap.forEach(d => { const u = get(d.id), t = d.data(); u.name = t.userName; u.email = t.userEmail; });

    // Ne garder que les comptes réellement présents dans Firebase Auth : masque
    // les docs roles/presence orphelins (compte Auth supprimé). Si la liste Auth
    // est indisponible (worker injoignable), on n'exclut personne (repli).
    let authUsers = null;
    try { const r = await _adminAuthPost('/admin/list-auth-users', {}); if (r && r.ok && Array.isArray(r.users)) authUsers = r.users; } catch (_) {}
    if (authUsers) {
      const authEmail = {};
      const validUids = new Set(authUsers.map(a => { authEmail[a.localId] = a.email; return a.localId; }));
      Object.keys(users).forEach(uid => { if (!validUids.has(uid)) delete users[uid]; });
      Object.values(users).forEach(u => { if (!u.email && authEmail[u.uid]) u.email = authEmail[u.uid]; });
    }

    const list = Object.values(users).sort((a, b) => (b.lastSeen ? b.lastSeen.getTime() : 0) - (a.lastSeen ? a.lastSeen.getTime() : 0));
    if (!list.length) { box.innerHTML = 'Aucun utilisateur trouvé.'; return; }

    const rowHtml = u => {
      const isSuper = u.role === 'superadmin';
      const self = u.uid === currentUser;
      const fullName = (u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : '';
      const label = fullName || u.name || u.email || (u.uid.slice(0, 10) + '…');
      const sub = (u.username ? '@' + u.username + ' · ' : '') + (u.email ? u.email + ' · ' : '') + _relTime(u.lastSeen);
      const dot = u.online ? '<span style="width:7px;height:7px;border-radius:50%;background:var(--positive);box-shadow:0 0 8px var(--positive);flex-shrink:0"></span>' : '<span style="width:7px;height:7px;border-radius:50%;background:var(--text3);flex-shrink:0"></span>';
      const roleBadge = '<span style="font-size:9px;font-weight:700;letter-spacing:.5px;padding:2px 7px;border-radius:5px;font-family:var(--mono);' + (isSuper ? 'background:rgba(255,77,106,.14);color:#ff5d78' : 'background:rgba(255,255,255,.06);color:var(--text3)') + '">' + (isSuper ? 'ADMIN' : 'USER') + '</span>';
      const safeLabel = label.replace(/'/g, '');
      const resetBtn = (self || u.uid === ADMIN_UID) ? '' : '<button class="pf-btn ghost" style="font-size:10.5px;padding:6px 10px" onclick="adminResetPassword(\'' + u.uid + '\',\'' + safeLabel + '\')">Reset mdp</button>';
      const delBtn = (self || u.uid === ADMIN_UID) ? '' : '<button class="pf-btn ghost" style="font-size:10.5px;padding:6px 10px;border-color:rgba(255,93,120,.3);color:#ff5d78" onclick="adminDeleteUser(\'' + u.uid + '\',\'' + safeLabel + '\')">Effacer (RGPD)</button>';
      return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">' +
        dot +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:7px">' + label +
            (u.lastSeen ? '<span title="Dernière connexion" style="font-size:10px;font-weight:600;color:var(--text2);font-family:var(--mono);padding:1px 6px;background:rgba(255,255,255,.05);border-radius:5px">' + _relTimeShort(u.lastSeen) + '</span>' : '') +
            roleBadge + '</div>' +
          '<div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + sub + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' + resetBtn + delBtn + '</div>' +
      '</div>';
    };

    // Inscrits = prénom + nom + username renseignés. Les autres derrière un bouton.
    const registered = list.filter(u => u.firstName && u.lastName && u.username);
    const pending = list.filter(u => !(u.firstName && u.lastName && u.username));

    let html = registered.length
      ? registered.map(rowHtml).join('')
      : '<div style="color:var(--text3);padding:8px 0">Aucun utilisateur enregistré.</div>';

    if (pending.length) {
      html += '<button class="pf-btn ghost" id="admin-pending-btn" onclick="adminTogglePendingUsers()" style="font-size:11.5px;margin-top:12px">Voir les personnes non enregistrées (' + pending.length + ')</button>' +
        '<div id="admin-pending-users" style="display:none;margin-top:4px">' +
          '<div style="font-size:11px;color:var(--text3);line-height:1.6;margin:8px 0">Comptes sans prénom/nom/nom d\'utilisateur complet.</div>' +
          pending.map(rowHtml).join('') +
        '</div>';
    }
    box.innerHTML = html;
  } catch (e) {
    console.error('[admin] users:', e);
    box.innerHTML = 'Erreur de chargement (droits Firestore insuffisants ?).';
  }
}

// Affiche/masque la liste des comptes non enregistrés.
function adminTogglePendingUsers() {
  const el = document.getElementById('admin-pending-users');
  const btn = document.getElementById('admin-pending-btn');
  if (!el) return;
  const show = el.style.display === 'none';
  el.style.display = show ? 'block' : 'none';
  const n = el.querySelectorAll(':scope > div[style*="border-bottom"]').length;
  if (btn) btn.textContent = (show ? 'Masquer' : 'Voir') + ' les personnes non enregistrées (' + n + ')';
}

async function adminSetRole(uid, role) {
  if (!isAdmin()) return;
  try {
    await setFirestoreDoc(firestoreDoc(db, 'roles', uid), { role }, { merge: true });
    renderAdminUsers();
  } catch (e) {
    console.error('[admin] setRole:', e);
    alert('Échec du changement de rôle (droits Firestore ?).');
  }
}

async function adminDeleteUser(uid, label) {
  if (!isAdmin() || uid === currentUser || uid === ADMIN_UID) return;
  showConfirmModal({
    icon: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff5d78" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
    title: 'Effacer les données de ce compte ?',
    body: 'Efface toutes les données Firestore de « ' + label + ' » (portefeuille, transactions, support, rôle). Le compte de connexion (Auth) doit être supprimé côté serveur. Action irréversible.',
    okLabel: 'Effacer', cancelLabel: 'Annuler', danger: true,
    onConfirm: () => _doAdminDeleteUser(uid),
  });
}

async function _doAdminDeleteUser(uid) {
  const del = ref => deleteFirestoreDoc(ref).catch(e => console.warn('[rgpd] skip', e && e.message));
  // Données utilisateur (nécessite la règle admin sur users/{uid})
  const dataDocs = ['portfolio', 'transactions', 'versements', 'settings', 'recap', 'weeklyRecap', 'security'];
  await Promise.all(dataDocs.map(c => del(firestoreDoc(db, 'users', uid, 'data', c))));
  // Support : messages + thread
  try {
    const msgs = await getDocs(firestoreCollection(db, 'supportChats', uid, 'messages'));
    await Promise.all(msgs.docs.map(m => del(m.ref)));
  } catch (_) {}
  await del(firestoreDoc(db, 'supportThreads', uid));
  // Rôle + présence
  await del(firestoreDoc(db, 'roles', uid));
  await del(firestoreDoc(db, 'presence', uid));
  _audit('rgpd_delete', 'uid=' + uid);
  renderAdminUsers();
}

// ─── Réinitialisation mot de passe (admin) ───
async function adminResetPassword(uid, label) {
  if (!isAdmin() || uid === currentUser || uid === ADMIN_UID) return;
  showConfirmModal({
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    title: 'Réinitialiser le mot de passe ?',
    body: 'Un mot de passe temporaire sera généré pour « ' + label + ' ». Il devra le changer à sa prochaine connexion. Transmettez-le-lui de façon sécurisée (jamais par un canal public).',
    okLabel: 'Générer', cancelLabel: 'Annuler',
    onConfirm: () => _doAdminResetPassword(uid, label),
  });
}
async function _doAdminResetPassword(uid, label) {
  try {
    const r = await _adminAuthPost('/admin/reset-password', { uid });
    if (!r || !r.ok) { _showTempPasswordModal(label, null, (r && r.error) || 'Erreur.'); return; }
    _audit('reset_password', 'uid=' + uid);
    _showTempPasswordModal(label, r.tempPassword, null);
  } catch (e) {
    _showTempPasswordModal(label, null, 'Worker injoignable.');
  }
}
function _showTempPasswordModal(label, temp, error) {
  let el = document.getElementById('temp-pw-modal');
  if (!el) { el = document.createElement('div'); el.id = 'temp-pw-modal'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);padding:20px;box-sizing:border-box';
  const close = "document.getElementById('temp-pw-modal').remove()";
  if (error) {
    el.innerHTML =
      '<div style="max-width:400px;width:100%;background:#12141e;border:1px solid rgba(255,93,120,.25);border-radius:20px;padding:28px;font-family:var(--sans,sans-serif);text-align:center">' +
        '<div style="font-size:16px;font-weight:800;color:#ff5d78;margin-bottom:10px">Échec</div>' +
        '<div style="font-size:13px;color:#98a1b5;margin-bottom:20px">' + error + '</div>' +
        '<button onclick="' + close + '" style="padding:11px 22px;border:none;border-radius:10px;background:#2a2d3a;color:#f0f2f8;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Fermer</button>' +
      '</div>';
    return;
  }
  const safeTemp = String(temp).replace(/"/g, '&quot;');
  el.innerHTML =
    '<div style="max-width:420px;width:100%;box-sizing:border-box;background:#12141e;border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:28px;font-family:var(--sans,sans-serif)">' +
      '<div style="font-size:19px;font-weight:800;color:#f0f2f8;margin-bottom:6px">Mot de passe temporaire</div>' +
      '<div style="font-size:13px;color:#98a1b5;line-height:1.6;margin-bottom:18px">Pour « ' + label + ' ». Transmettez-le de façon sécurisée. L\'utilisateur devra le changer à sa prochaine connexion.</div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">' +
        '<code id="temp-pw-value" style="flex:1;background:#0a0c14;border:1px solid rgba(255,255,255,.10);border-radius:10px;color:#7c6df5;font-size:18px;font-weight:700;letter-spacing:1px;padding:12px 14px;text-align:center;font-family:var(--mono,monospace)">' + safeTemp + '</code>' +
        '<button id="temp-pw-copy" onclick="_copyTempPassword()" style="padding:12px 14px;border:1px solid rgba(124,109,245,.35);border-radius:10px;background:rgba(124,109,245,.12);color:#b3a9ff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">Copier</button>' +
      '</div>' +
      '<button onclick="' + close + '" style="width:100%;padding:12px;border:none;border-radius:12px;background:#7c6df5;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Fermer</button>' +
    '</div>';
}
function _copyTempPassword() {
  const v = document.getElementById('temp-pw-value'); const b = document.getElementById('temp-pw-copy');
  if (!v) return;
  const txt = v.textContent;
  const done = () => { if (b) { b.textContent = 'Copié ✓'; setTimeout(() => { if (b) b.textContent = 'Copier'; }, 1800); } };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => {});
  else { try { const r = document.createRange(); r.selectNode(v); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); done(); } catch (_) {} }
}

// ─── Changement de mot de passe imposé (après reset admin) ───
async function _enforcePasswordChange(user) {
  if (window.IS_DEMO || !user) return;
  // Comptes uniquement Google : pas de mot de passe à changer.
  const providers = (user.providerData || []).map(p => p.providerId);
  if (providers.includes('google.com') && !providers.includes('password')) return;
  let snap;
  try { snap = await getDocFromServer(firestoreDoc(db, 'roles', user.uid)); }
  catch (_) { return; } // pas de confirmation serveur → on ne bloque pas
  const d = snap.exists() ? (snap.data() || {}) : {};
  if (d.mustChangePassword === true) _showForcedPasswordModal(user);
}
function _showForcedPasswordModal(user) {
  let el = document.getElementById('forced-password-modal');
  if (!el) { el = document.createElement('div'); el.id = 'forced-password-modal'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;inset:0;z-index:100002;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(6px);padding:20px;box-sizing:border-box';
  const inp = 'width:100%;box-sizing:border-box;background:#0a0c14;border:1px solid rgba(255,255,255,.10);border-radius:10px;color:#f0f2f8;font-size:14px;padding:11px 13px;outline:none;font-family:inherit;margin-bottom:11px';
  el.innerHTML =
    '<div style="max-width:400px;width:100%;box-sizing:border-box;background:#12141e;border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:28px;font-family:var(--sans,sans-serif)">' +
      '<div style="font-size:20px;font-weight:800;color:#f0f2f8;margin-bottom:8px">Changement de mot de passe requis</div>' +
      '<div style="font-size:13px;color:#98a1b5;line-height:1.6;margin-bottom:20px">Votre mot de passe a été réinitialisé par un administrateur. Choisissez un nouveau mot de passe pour continuer.</div>' +
      '<input id="fp-current" type="password" placeholder="Mot de passe temporaire" autocomplete="current-password" style="' + inp + '">' +
      '<input id="fp-new" type="password" placeholder="Nouveau mot de passe (8 caractères min.)" autocomplete="new-password" style="' + inp + '">' +
      '<input id="fp-confirm" type="password" placeholder="Confirmer le nouveau mot de passe" autocomplete="new-password" style="' + inp + '">' +
      '<div id="fp-error" style="display:none;color:#ff5d78;font-size:12px;margin-bottom:10px"></div>' +
      '<button id="fp-btn" onclick="saveForcedPassword(\'' + user.uid + '\')" style="width:100%;box-sizing:border-box;padding:12px;border:none;border-radius:12px;background:#7c6df5;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Valider</button>' +
    '</div>';
}
async function saveForcedPassword(uid) {
  const cur = document.getElementById('fp-current').value;
  const np  = document.getElementById('fp-new').value;
  const np2 = document.getElementById('fp-confirm').value;
  const errEl = document.getElementById('fp-error');
  const btn = document.getElementById('fp-btn');
  const fail = m => { if (errEl) { errEl.textContent = m; errEl.style.display = 'block'; } };
  if (errEl) errEl.style.display = 'none';
  if (!cur) return fail('Saisissez le mot de passe temporaire.');
  if (np.length < 8) return fail('Nouveau mot de passe : 8 caractères minimum.');
  if (np !== np2) return fail('Les mots de passe ne correspondent pas.');
  if (np === cur) return fail('Choisissez un mot de passe différent du temporaire.');
  if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }
  try {
    const user = fbAuth.currentUser;
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, cur));
    await updatePassword(user, np);
    await setFirestoreDoc(firestoreDoc(db, 'roles', uid), { mustChangePassword: false }, { merge: true });
    const el = document.getElementById('forced-password-modal'); if (el) el.remove();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Valider'; }
    const code = (e && e.code) || '';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') fail('Mot de passe temporaire incorrect.');
    else if (code === 'auth/weak-password') fail('Mot de passe trop faible.');
    else fail('Erreur : ' + ((e && e.message) || code));
  }
}

// ─── Journal d'audit ───
async function _audit(action, details) {
  try {
    await addFirestoreDoc(firestoreCollection(db, 'auditLog'), {
      action, details: details || '', by: currentUser || null, at: serverTimestamp(),
    });
  } catch (e) { console.warn('[audit]', e && e.message); }
}
async function renderAuditLog() {
  const box = document.getElementById('admin-audit');
  if (!box) return;
  box.innerHTML = 'Chargement…';
  try {
    const q = firestoreQuery(firestoreCollection(db, 'auditLog'), firestoreOrderBy('at', 'desc'));
    const snap = await getDocs(q);
    const rows = snap.docs.slice(0, 30).map(d => {
      const a = d.data();
      const t = a.at && a.at.toDate ? a.at.toDate() : null;
      const when = t ? t.toLocaleString('fr-FR') : '—';
      return '<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">' +
        '<div style="min-width:0"><span style="color:var(--text);font-weight:600">' + (a.action || '?') + '</span> <span style="color:var(--text3)">' + (a.details || '') + '</span></div>' +
        '<div style="color:var(--text3);font-family:var(--mono);font-size:11px;white-space:nowrap">' + when + '</div>' +
      '</div>';
    });
    box.innerHTML = rows.length ? rows.join('') : 'Aucune action enregistrée.';
  } catch (e) { box.innerHTML = 'Journal indisponible (droits Firestore ?).'; }
}

// ─── Tableau de stats ───
async function renderAdminStats() {
  const box = document.getElementById('admin-stats');
  if (!box) return;
  const empty = { forEach() {} };
  try {
    const [roles, pres, threads, dstats] = await Promise.all([
      getDocs(firestoreCollection(db, 'roles')).catch(() => empty),
      getDocs(firestoreCollection(db, 'presence')).catch(() => empty),
      getDocs(firestoreCollection(db, 'supportThreads')).catch(() => empty),
      getFirestoreDoc(firestoreDoc(db, 'config', 'discordStats')).catch(() => null),
    ]);
    let inscrits = 0; roles.forEach(() => inscrits++);
    let actifs24 = 0; const now = Date.now();
    pres.forEach(d => { const p = d.data(); const ls = p.lastSeen && p.lastSeen.toDate ? p.lastSeen.toDate().getTime() : 0; if (now - ls < 86400000) actifs24++; });
    // Tickets ouverts = support in-app (Capital Board) + salons Discord de la
    // catégorie ticket (compteur écrit par le bot dans config/discordStats).
    let cbTickets = 0; threads.forEach(d => { const t = d.data(); if (t && t.closed !== true) cbTickets++; });
    const discKnown = !!(dstats && dstats.exists() && typeof dstats.data().openTickets === 'number');
    const discTickets = discKnown ? dstats.data().openTickets : 0;
    const totalTickets = cbTickets + discTickets;
    const tile = (l, v, c, sub) => '<div style="background:#0f1119;border:1px solid var(--border);border-radius:14px;padding:14px 16px">' +
      '<div style="font-size:10.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.6px">' + l + '</div>' +
      '<div style="font-size:22px;font-weight:800;margin-top:6px;font-family:var(--mono);color:' + (c || 'var(--text)') + '">' + v + '</div>' +
      (sub ? '<div style="font-size:10.5px;color:var(--text3);margin-top:5px;font-family:var(--mono)">' + sub + '</div>' : '') +
      '</div>';
    const ticketSub = 'CB ' + cbTickets + ' · Discord ' + (discKnown ? discTickets : '—');
    box.innerHTML = tile('Inscrits', inscrits) + tile('Actifs 24 h', actifs24, 'var(--positive)') + tile('Tickets ouverts', totalTickets, 'var(--gold)', ticketSub);
  } catch (e) { box.innerHTML = '<div style="color:var(--text3)">Stats indisponibles.</div>'; }
}

// ─── Forcer la mise à jour (éjecte les versions obsolètes) ───
async function adminForceUpdate(btn) {
  if (!isAdmin()) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    await _setAppConfig({ minVersion: APP_VERSION });
    _audit('force_update', 'minVersion=' + APP_VERSION);
    const s = document.getElementById('admin-version-status');
    if (s) s.innerHTML = '<span style="color:var(--positive)">● MAJ forcée — les clients sur une autre version sont bloqués jusqu\'au rechargement.</span>';
  } catch (e) {
    const s = document.getElementById('admin-version-status');
    if (s) s.textContent = 'Échec de l\'enregistrement.';
  } finally { if (btn) { btn.disabled = false; btn.textContent = '↻ Forcer la MAJ'; } }
}

// ─── Diffusion + état des services (worker) ───
async function _adminAuthPost(path, payload) {
  const idToken = await fbAuth.currentUser.getIdToken();
  const res = await fetch(WORKER_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ idToken }, payload)),
  });
  return res.json();
}
// Lance l'affichage temps réel de l'état des services : charge tout de suite
// puis rafraîchit tant que la page Admin est visible (auto-stop sinon).
function _startHealthAuto() {
  adminCheckHealth(true);
  if (window._healthTimer) { clearInterval(window._healthTimer); window._healthTimer = null; }
  window._healthTimer = setInterval(() => {
    const p = document.getElementById('page-admin');
    if (!p || !p.classList.contains('active') || !isAdmin()) {
      clearInterval(window._healthTimer); window._healthTimer = null; return;
    }
    adminCheckHealth(true);
  }, 20000);
}
async function adminCheckHealth(silent) {
  const box = document.getElementById('admin-health');
  if (!box) return;
  if (!silent || box.textContent === '—' || !box.textContent) box.innerHTML = 'Vérification…';
  try {
    const r = await _adminAuthPost('/admin/health', {});
    if (!r || !r.services) { box.textContent = r && r.error ? r.error : 'Erreur.'; return; }
    const dot = s => s === 'ok' ? '<span style="color:var(--positive)">● OK</span>' : '<span style="color:var(--negative)">● KO</span>';
    const s = r.services;
    box.innerHTML = [
      'Firestore ' + dot(s.firestore),
      'Google / FCM ' + dot(s.google),
      'Email (Resend) ' + dot(s.email),
      'Cours (Yahoo) ' + dot(s.yahoo),
    ].map(x => '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span>' + x.split(' <')[0] + '</span><span>' + x.slice(x.indexOf('<')) + '</span></div>').join('');
    const auto = document.getElementById('admin-health-auto');
    if (auto) auto.textContent = '· mis à jour à ' + new Date().toLocaleTimeString('fr-FR');
  } catch (e) { box.textContent = 'Worker injoignable.'; }
}
function adminBroadcastPush() {
  if (!isAdmin()) return;
  const body = (document.getElementById('bc-push-body').value || '').trim();
  const st = document.getElementById('bc-push-status');
  if (!body) { st.textContent = 'Message requis.'; return; }
  showConfirmModal({
    icon: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7c6df5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    title: 'Diffusion push',
    body: 'Envoyer cette notification push à TOUS les utilisateurs abonnés ?',
    okLabel: 'Envoyer',
    danger: true,
    onConfirm: async () => {
      st.textContent = 'Envoi…';
      try {
        // Titre fixe (l'admin ne saisit que le message) : nom de l'app.
        const r = await _adminAuthPost('/admin/broadcast-push', { title: 'Capital Board', body });
        st.textContent = r && r.ok ? ('Envoyé : ' + r.sent + '/' + r.total + (r.failed ? ' (échecs ' + r.failed + ')' : '')) : ((r && r.error) || 'Erreur.');
        if (r && r.ok) _audit('broadcast_push', body.slice(0, 40));
      } catch (e) { st.textContent = 'Échec (worker injoignable ?).'; }
    },
  });
}

// Test push : envoie une notification PWA à UN SEUL email (vérif push système).
async function adminTestPush() {
  if (!isAdmin()) return;
  const email = (document.getElementById('bc-push-test-email').value || '').trim();
  const body = (document.getElementById('bc-push-body').value || '').trim();
  const st = document.getElementById('bc-push-status');
  if (!email) { st.textContent = 'Email de test requis.'; return; }
  st.textContent = 'Envoi du test…';
  try {
    const r = await _adminAuthPost('/admin/test-push', { email, title: 'Capital Board', body });
    if (r && r.ok) { st.textContent = 'Test envoyé à ' + (r.email || email) + ' ✅'; _audit('test_push', email); }
    else { st.textContent = (r && r.error) || 'Erreur.'; }
  } catch (e) { st.textContent = 'Échec (worker injoignable ?).'; }
}
// Liens utiles (footer email diffusion). [label, url, fichier icône].
// Icônes = PNG hébergés (URL absolue obligatoire : les emails ne rendent ni
// SVG ni data:URI). Générés dans assets/email/. L'alt sert de repli quand le
// client bloque les images.
const _MAIL_ICON_BASE = 'https://capitalboard.fr/assets/email/';
const _MAIL_FOOTER_LINKS = [
  ['Site',      'https://capitalboard.fr',                         'site.png'],
  ['Discord',   'https://discord.gg/ZN9459TCTQ',                   'discord.png'],
  ['Instagram', 'https://www.instagram.com/capitalboard',          'instagram.png'],
  ['TikTok',    'https://www.tiktok.com/@capitalboard',            'tiktok.png'],
  ['GitHub',    'https://github.com/arrmel-capitalboard/Capital-Board', 'github.png'],
];
// Construit le HTML de l'email de diffusion à partir du texte saisi.
function _bcMailHtml(text) {
  const cells = _MAIL_FOOTER_LINKS.map(([label, url, icon]) =>
    '<td style="padding:0 7px"><a href="' + url + '" target="_blank" rel="noopener">' +
    '<img src="' + _MAIL_ICON_BASE + icon + '" width="34" height="34" alt="' + label + '" ' +
    'style="display:block;border:0;border-radius:9px;width:34px;height:34px"></a></td>'
  ).join('');
  return '<div style="font-family:sans-serif;background:#0f0f13;color:#e8eaf0;padding:32px">' +
    '<div style="max-width:480px;margin:0 auto;background:#1a1a24;border-radius:16px;padding:32px;border:1px solid #2a2a3a">' +
    '<div style="font-size:18px;font-weight:700;color:#7c6df5;margin-bottom:20px">Capital Board</div>' +
    '<div style="color:#e8eaf0;line-height:1.7;font-size:15px;white-space:pre-wrap">' + _escapeHtmlChat(text) + '</div>' +
    '</div>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto 0"><tr>' + cells + '</tr></table>' +
    '<div style="max-width:480px;margin:12px auto 0;text-align:center;font-size:11px;color:#4a5266">Capital Board · Ne pas répondre à cet email.</div>' +
    '</div>';
}
// Lit sujet + texte, valide, retourne {subject, text, html} ou null (message d'erreur affiché).
function _bcMailPayload(st) {
  const subject = (document.getElementById('bc-mail-subject').value || '').trim();
  const text = (document.getElementById('bc-mail-body').value || '').trim();
  if (!subject || !text) { st.textContent = 'Sujet et message requis.'; return null; }
  return { subject, text, html: _bcMailHtml(text) };
}
// Rend l'aperçu du mail dans l'iframe (seulement s'il est visible).
function _renderMailPreview() {
  const ifr = document.getElementById('bc-mail-preview');
  if (!ifr || ifr.style.display === 'none') return;
  const text = (document.getElementById('bc-mail-body').value || '');
  const subject = (document.getElementById('bc-mail-subject').value || '').trim();
  const inner = _bcMailHtml(text.trim() ? text : '(votre message ici)');
  ifr.srcdoc = '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">' +
    '<div style="font-family:sans-serif;background:#0f0f13;color:#8a93a8;font-size:12px;padding:12px 16px 0">Sujet : <strong style="color:#e8eaf0">' + (subject ? _escapeHtmlChat(subject) : '(sans sujet)') + '</strong></div>' +
    inner + '</body></html>';
}
// Affiche/masque l'aperçu.
function adminToggleMailPreview() {
  const ifr = document.getElementById('bc-mail-preview');
  const btn = document.getElementById('bc-mail-preview-btn');
  if (!ifr) return;
  const show = ifr.style.display === 'none';
  ifr.style.display = show ? 'block' : 'none';
  if (btn) btn.textContent = show ? '✕ Masquer l’aperçu' : '👁 Aperçu';
  if (show) _renderMailPreview();
}
async function adminBroadcastEmail() {
  if (!isAdmin()) return;
  const st = document.getElementById('bc-mail-status');
  const p = _bcMailPayload(st);
  if (!p) return;
  if (!confirm('Envoyer cet email à TOUS les comptes ?')) return;
  st.textContent = 'Envoi…';
  try {
    const r = await _adminAuthPost('/admin/broadcast-email', { subject: p.subject, html: p.html });
    st.textContent = r && r.ok ? ('Envoyé : ' + r.sent + '/' + r.total + (r.failed ? ' (échecs ' + r.failed + ')' : '')) : ((r && r.error) || 'Erreur.');
    if (r && r.ok) _audit('broadcast_email', p.subject);
  } catch (e) { st.textContent = 'Échec (worker injoignable ?).'; }
}
// Envoi test : une seule adresse.
async function adminBroadcastEmailTest() {
  if (!isAdmin()) return;
  const st = document.getElementById('bc-mail-status');
  const p = _bcMailPayload(st);
  if (!p) return;
  const testEmail = (document.getElementById('bc-mail-test').value || '').trim();
  if (!testEmail) { st.textContent = 'Renseignez une adresse de test.'; return; }
  st.textContent = 'Envoi test…';
  try {
    const r = await _adminAuthPost('/admin/broadcast-email', { subject: p.subject, html: p.html, testEmail });
    st.textContent = r && r.ok ? ('Test envoyé à ' + testEmail) : ((r && r.error) || 'Erreur.');
  } catch (e) { st.textContent = 'Échec (worker injoignable ?).'; }
}
// Programme la diffusion pour une date/heure future.
async function adminScheduleEmail() {
  if (!isAdmin()) return;
  const st = document.getElementById('bc-mail-status');
  const p = _bcMailPayload(st);
  if (!p) return;
  const whenVal = document.getElementById('bc-mail-when').value;
  if (!whenVal) { st.textContent = 'Choisissez une date/heure d\'envoi.'; return; }
  const sendAt = new Date(whenVal).getTime(); // heure locale du navigateur
  if (!sendAt || sendAt < Date.now() + 30000) { st.textContent = 'La date doit être dans le futur.'; return; }
  const when = new Date(sendAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  if (!confirm('Programmer cet email à TOUS les comptes pour le ' + when + ' ?')) return;
  st.textContent = 'Programmation…';
  try {
    const r = await _adminAuthPost('/admin/schedule-email', { subject: p.subject, html: p.html, sendAt });
    if (r && r.ok) {
      st.textContent = 'Programmé pour le ' + when + '.';
      _audit('schedule_email', p.subject + ' → ' + when);
      document.getElementById('bc-mail-when').value = '';
      adminLoadScheduled();
    } else { st.textContent = (r && r.error) || 'Erreur.'; }
  } catch (e) { st.textContent = 'Échec (worker injoignable ?).'; }
}
// Charge et affiche les diffusions programmées.
async function adminLoadScheduled() {
  if (!isAdmin()) return;
  const box = document.getElementById('bc-mail-scheduled');
  if (!box) return;
  try {
    const r = await _adminAuthPost('/admin/schedule-list', {});
    if (!r || !r.ok) { box.textContent = ''; return; }
    if (!r.items.length) { box.innerHTML = '<span style="color:var(--text3)">Aucun email programmé.</span>'; return; }
    box.innerHTML = '<div style="font-weight:600;color:var(--text);margin-bottom:6px">Programmés (' + r.items.length + ')</div>' +
      r.items.map(it => {
        const when = new Date(it.sendAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--border)">' +
          '<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>' + when + '</strong> — ' + _escapeHtmlChat(it.subject || '') + '</span>' +
          '<button class="pf-btn ghost" onclick="adminCancelScheduled(\'' + it.id + '\')" style="font-size:11px;flex-shrink:0">Annuler</button>' +
          '</div>';
      }).join('');
  } catch (e) { box.textContent = ''; }
}
// Annule une diffusion programmée.
async function adminCancelScheduled(id) {
  if (!isAdmin()) return;
  if (!confirm('Annuler cet email programmé ?')) return;
  try {
    const r = await _adminAuthPost('/admin/schedule-cancel', { id });
    if (r && r.ok) { _audit('schedule_cancel', id); adminLoadScheduled(); }
  } catch (e) {}
}

function _adminMaintStatus(on) {
  const s = document.getElementById('admin-maint-status');
  if (!s) return;
  s.innerHTML = on
    ? '<span style="color:var(--negative)">● Maintenance ACTIVE — app bloquée pour les utilisateurs.</span>'
    : '<span style="color:var(--positive)">● App accessible normalement.</span>';
}
function _adminSignupStatus(open) {
  const s = document.getElementById('admin-signup-status');
  if (!s) return;
  s.innerHTML = open
    ? '<span style="color:var(--positive)">● Inscriptions ouvertes.</span>'
    : '<span style="color:var(--negative)">● Inscriptions fermées — accès sur invitation.</span>';
}

async function adminToggleMaintenance(el) {
  if (!isAdmin()) return;
  const wanted = el.checked;
  el.disabled = true;
  try {
    const msg = (document.getElementById('admin-maint-msg') || {}).value || '';
    await _setAppConfig({ maintenance: wanted, maintenanceMsg: msg });
    _audit('maintenance', wanted ? 'ON' : 'OFF');
    _adminMaintStatus(wanted);
  } catch (e) {
    console.error('[admin] maintenance:', e);
    el.checked = !wanted;
    const s = document.getElementById('admin-maint-status');
    if (s) s.textContent = 'Échec de l\'enregistrement.';
  } finally { el.disabled = false; }
}
async function adminSaveMaintenanceMsg() {
  if (!isAdmin()) return;
  const s = document.getElementById('admin-maint-status');
  try {
    const msg = (document.getElementById('admin-maint-msg') || {}).value || '';
    await _setAppConfig({ maintenanceMsg: msg });
    if (s) { const prev = s.innerHTML; s.textContent = '✓ Message enregistré.'; setTimeout(() => { s.innerHTML = prev; }, 1800); }
  } catch (e) {
    if (s) s.textContent = 'Échec de l\'enregistrement du message.';
  }
}
async function adminToggleSignup(el) {
  if (!isAdmin()) return;
  const open = el.checked;
  el.disabled = true;
  try {
    await _setAppConfig({ signupOpen: open });
    _audit('signup', open ? 'ouvert' : 'fermé');
    _adminSignupStatus(open);
  } catch (e) {
    console.error('[admin] signup:', e);
    el.checked = !open;
    const s = document.getElementById('admin-signup-status');
    if (s) s.textContent = 'Échec de l\'enregistrement.';
  } finally { el.disabled = false; }
}

function _adminPinStatusText(disabled) {
  const status = document.getElementById('admin-pin-status');
  if (!status) return;
  status.innerHTML = disabled
    ? '<span style="color:var(--negative)">● PIN désactivé pour tous les comptes.</span>'
    : '<span style="color:var(--positive)">● PIN actif — chaque compte doit saisir son code.</span>';
}

async function adminTogglePinGlobal(el) {
  if (!isAdmin()) return;
  const wanted = el.checked;
  el.disabled = true;
  const status = document.getElementById('admin-pin-status');
  if (status) status.textContent = 'Enregistrement…';
  try {
    await _setPinGloballyDisabled(wanted);
    _adminPinStatusText(wanted);
  } catch (e) {
    console.error('[admin] toggle PIN global échoué:', e);
    el.checked = !wanted; // rollback UI
    if (status) status.textContent = 'Échec de l\'enregistrement. Réessayez.';
  } finally {
    el.disabled = false;
  }
}

function _escapeHtmlChat(s) {
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function renderSupportPage() {
  if (window.IS_DEMO) { _renderDemoBlocked("page-support", "Support"); return; }
  if (isAdmin()) renderSupportAdmin();
  else { window._supportUserView = "list"; renderSupportUser(); }
  _showSupportDiscordReco();
}

// Modale à l'entrée de l'onglet Support : recommander le Discord.
const DISCORD_INVITE_URL = "https://discord.gg/DpYjWWegR";
const DISCORD_LOGO_SVG = '<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>';

function _showSupportDiscordReco() {
  // Modale dédiée (retirée à la fermeture) — CSS soigné, branding Discord.
  const prev = document.getElementById("discord-reco-modal");
  if (prev) prev.remove();
  const close = () => { const m = document.getElementById("discord-reco-modal"); if (m) m.remove(); };
  const wrap = document.createElement("div");
  wrap.id = "discord-reco-modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.62);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;animation:dscFade .18s ease";
  wrap.innerHTML =
    '<style>'
    + '@keyframes dscFade{from{opacity:0}to{opacity:1}}'
    + '@keyframes dscPop{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}'
    + '#discord-reco-modal .dsc-card{animation:dscPop .22s cubic-bezier(.2,.8,.2,1)}'
    + '#discord-reco-modal .dsc-btn-primary{transition:transform .12s,box-shadow .12s,background .12s}'
    + '#discord-reco-modal .dsc-btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(88,101,242,.45);background:#4752e6}'
    + '#discord-reco-modal .dsc-btn-ghost{transition:background .12s,color .12s,border-color .12s}'
    + '#discord-reco-modal .dsc-btn-ghost:hover{background:#20222e;color:#fff;border-color:#3a3c50}'
    + '</style>'
    + '<div class="dsc-card" style="position:relative;width:100%;max-width:400px;background:#181923;border:1px solid #2a2b3d;border-radius:20px;overflow:hidden;box-shadow:0 28px 70px rgba(0,0,0,.65)">'
    // bandeau blurple
    + '<div style="background:linear-gradient(135deg,#5865F2 0%,#7c6df5 100%);padding:26px 24px 22px;display:flex;flex-direction:column;align-items:center;text-align:center">'
    + '<div style="width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;margin-bottom:12px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)">' + DISCORD_LOGO_SVG + '</div>'
    + '<div style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-.2px">Support plus rapide sur Discord</div>'
    + '</div>'
    // corps
    + '<div style="padding:20px 24px 24px;text-align:center">'
    + '<p style="font-size:13px;color:#a4abc0;line-height:1.65;margin:0 0 16px">Pour une réponse plus rapide, ouvrez un ticket sur notre Discord dans le salon <b style="color:#c9cef0">#ticket</b>. Vous pouvez aussi faire votre demande directement ici si vous préférez.</p>'
    + '<button class="dsc-btn-primary" id="dsc-open" style="width:100%;padding:12px;border:none;border-radius:11px;background:#5865F2;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--sans);display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:9px"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>Ouvrir Discord</button>'
    + '<button class="dsc-btn-ghost" id="dsc-stay" style="width:100%;padding:11px;border:1px solid #2a2b3d;border-radius:11px;background:transparent;color:#8892a8;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--sans)">Continuer ici</button>'
    + '</div></div>';
  document.body.appendChild(wrap);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  wrap.querySelector("#dsc-open").onclick = () => { window.open(DISCORD_INVITE_URL, "_blank", "noopener"); close(); };
  wrap.querySelector("#dsc-stay").onclick = close;
}

async function renderSupportUser() {
  const u = fbAuth.currentUser;
  _currentThreadMeta = {
    userUid: currentUser,
    userName: (u && (u.displayName || (u.email || "").split("@")[0])) || "Vous",
    userEmail: (u && u.email) || "",
  };
  // Si on est en mode "vue chat" pour cet user, on rend le chat. Sinon landing.
  if (window._supportUserView === "chat") {
    _renderSupportUserChat();
    return;
  }
  // Landing = liste des tickets de l'user + bouton nouveau
  let exists = false, closed = false, data = {};
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, "supportThreads", currentUser));
    if (snap.exists()) {
      data = snap.data();
      // On considère qu'un ticket existe seulement si une raison ou un msg a été posté
      // (évite d'afficher un thread vide créé par du legacy)
      exists = !!(data.reason || data.lastMsg);
      closed = data.closed === true;
    }
  } catch(_) {}
  window._supportNoThread = !exists;
  window._supportUserClosed = closed;

  const ticketId = data.ticketId || _genTicketId(currentUser);
  const reason = data.reason || "(sans sujet)";
  const lastMsg = data.lastMsg || "—";
  const unread = data.unreadUser || 0;

  let ticketCard = "";
  if (exists) {
    const stateBadge = closed
      ? '<span style="font-size:10px;color:#f5b731;background:rgba(245,183,49,0.15);padding:3px 9px;border-radius:999px;font-weight:600">Fermé</span>'
      : '<span style="font-size:10px;color:#00e09e;background:rgba(0,224,158,0.12);padding:3px 9px;border-radius:999px;font-weight:600">Ouvert</span>';
    const unreadBadge = unread > 0
      ? '<span style="background:#ff4d6a;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;margin-left:8px">' + unread + '</span>'
      : '';
    const action = closed
      ? '<button onclick="_openExistingTicket()" class="btn-outline" style="font-size:12px;padding:6px 14px">Voir</button>'
      : '<button onclick="_openExistingTicket()" style="font-size:12px;padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer">Ouvrir le chat →</button>';
    ticketCard =
      '<div style="background:var(--s2);border:1px solid var(--border2);border-radius:14px;padding:18px;margin-bottom:18px;text-align:left">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">'
      + '<span style="font-family:monospace;font-size:11px;color:var(--text2);background:var(--s3);padding:3px 8px;border-radius:6px">#' + ticketId + '</span>'
      + stateBadge + unreadBadge
      + '</div>'
      + '<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">' + _escapeHtmlChat(reason) + '</div>'
      + '<div style="font-size:12px;color:var(--text3);margin-bottom:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _escapeHtmlChat(lastMsg) + '</div>'
      + '<div style="display:flex;justify-content:flex-end">' + action + '</div>'
      + '</div>';
  }

  const newBtnLabel = exists ? (closed ? "+ Nouveau ticket" : "+ Ouvrir un autre ticket") : "+ Ouvrir un ticket";
  const newBtnDisabled = exists && !closed;
  const el = document.getElementById("support-content");
  el.innerHTML =
    '<div style="max-width:560px;margin:30px auto;padding:0 16px">'
    + '<div style="text-align:center;margin-bottom:24px">'
    + '<div style="font-size:34px;margin-bottom:10px">💬</div>'
    + '<div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:6px">Support</div>'
    + '<div style="font-size:12px;color:var(--text2)">Vos tickets et conversations avec l\'équipe.</div>'
    + '</div>'
    + ticketCard
    + (newBtnDisabled
        ? '<div style="text-align:center;font-size:12px;color:var(--text3)">Fermez votre ticket en cours pour en ouvrir un nouveau.</div>'
        : '<button onclick="openNewTicketForm()" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer">' + newBtnLabel + '</button>')
    + '</div>';
}

window._openExistingTicket = function() {
  window._supportUserView = "chat";
  _renderSupportUserChat();
};

window._backToSupportList = function() {
  window._supportUserView = "list";
  if (_supportUnsub) { _supportUnsub(); _supportUnsub = null; }
  if (_supportThreadDocUnsub) { _supportThreadDocUnsub(); _supportThreadDocUnsub = null; }
  renderSupportUser();
};

async function _renderSupportUserChat() {
  let closed = false, exists = false;
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, "supportThreads", currentUser));
    exists = snap.exists();
    closed = exists && snap.data().closed === true;
  } catch(_) {}
  const ticketId = _genTicketId(currentUser);
  _currentThreadMeta.ticketId = ticketId;
  const el = document.getElementById("support-content");

  if (closed) {
    el.innerHTML =
      '<div class="chat-wrap" style="align-items:center;justify-content:center;text-align:center;padding:40px">'
      + '<div style="max-width:440px">'
      + '<button onclick="_backToSupportList()" class="btn-outline" style="position:absolute;top:14px;left:14px;font-size:11px;padding:5px 10px">← Retour</button>'
      + '<div style="font-size:32px;margin-bottom:14px">🔒</div>'
      + '<div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px">Conversation fermée</div>'
      + '<div style="font-family:monospace;font-size:11px;color:var(--text2);background:var(--s3);padding:3px 8px;border-radius:6px;display:inline-block;margin-bottom:18px">#' + ticketId + '</div>'
      + '<div style="font-size:13px;color:var(--text2);margin-bottom:24px;line-height:1.6">Ce ticket a été fermé. Seul l\'admin peut le rouvrir.<br>Vous pouvez télécharger la transcription pour archive personnelle.</div>'
      + '<button onclick="downloadSupportTranscript()" class="btn-outline" style="padding:9px 18px;font-size:13px">📄 Télécharger transcription</button>'
      + '</div></div>';
    return;
  }
  el.innerHTML =
    '<div class="chat-wrap">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--border)">'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<button onclick="_backToSupportList()" class="btn-outline" style="font-size:11px;padding:5px 10px">← Retour</button>'
    + '<span style="font-family:monospace;font-size:11px;color:var(--text2);background:var(--s3);padding:3px 8px;border-radius:6px">#' + ticketId + '</span>'
    + '</div>'
    + '<div style="display:flex;gap:6px">'
    + '<button onclick="downloadSupportTranscript()" class="btn-outline" style="font-size:11px;padding:5px 10px">📄 Transcription</button>'
    + '<button onclick="closeSupportThreadUser()" class="btn-outline" style="font-size:11px;padding:5px 10px;color:var(--negative);border-color:rgba(255,77,106,0.3)">✕ Fermer</button>'
    + '</div></div>'
    + '<div class="chat-messages" id="chat-messages"></div>'
    + _chatInputBarHtml("Écrivez votre message…", null, false)
    + '</div>';
  _subscribeSupportThread(currentUser);
  _markThreadReadByUser(currentUser);
  _subscribeThreadDoc(currentUser);
  _playOpenChatSound();
}

function renderSupportAdmin() {
  const el = document.getElementById("support-content");
  const tabActive   = _supportAdminTab === "active";
  el.innerHTML =
    '<div class="chat-wrap"><div class="chat-admin-layout">'
    + '<div class="chat-threads">'
    + '<div style="padding:10px;border-bottom:1px solid var(--border2);background:var(--s3)">'
    + '<button onclick="_openNewChatPrompt()" style="width:100%;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:8px">+ Nouveau chat</button>'
    + '<div style="display:flex;gap:4px">'
    + '<button onclick="_setAdminTab(\'active\')" class="chat-tab' + (tabActive ? ' active' : '') + '">Actifs</button>'
    + '<button onclick="_setAdminTab(\'archived\')" class="chat-tab' + (!tabActive ? ' active' : '') + '">Archivés</button>'
    + '</div></div>'
    + '<div id="chat-threads"><div class="chat-empty">Chargement…</div></div></div>'
    + '<div class="chat-messages-pane" style="display:flex;flex-direction:column;height:100%">'
    + '<div id="chat-actions-bar" style="display:none;padding:8px 12px;border-bottom:1px solid var(--border);gap:6px;justify-content:flex-end"></div>'
    + '<div class="chat-messages" id="chat-messages">' + _chatEmptyState(_CE_ICON_CHAT, "Aucune conversation ouverte", "Sélectionnez un ticket dans la liste de gauche pour afficher les messages.") + '</div>'
    + _chatInputBarHtml("Répondre…", "chat-send", true)
    + '</div></div></div>';
  _subscribeAdminThreads();
}

window._setAdminTab = function(tab) {
  _supportAdminTab = tab;
  _activeSupportThread = null;
  renderSupportAdmin();
};

let _lastMsgCount = 0;
let _lastMsgId = null;
function _subscribeSupportThread(uid) {
  if (_supportUnsub) { _supportUnsub(); _supportUnsub = null; }
  _lastMsgCount = 0;
  _lastMsgId = null;
  const q = firestoreQuery(firestoreCollection(db, "supportChats", uid, "messages"), firestoreOrderBy("createdAt", "asc"));
  _supportUnsub = onSnapshot(q, snap => {
    const msgs = [];
    snap.forEach(d => msgs.push(Object.assign({ id: d.id }, d.data())));
    // Son si nouveau message reçu de l'autre partie (skip premier rendu)
    if (_lastMsgCount > 0 && msgs.length > _lastMsgCount) {
      const last = msgs[msgs.length - 1];
      const myRole = isAdmin() ? "admin" : "user";
      if (last.from !== myRole && last.from !== "system" && last.id !== _lastMsgId) {
        _playMessageSound();
      }
    }
    _lastMsgCount = msgs.length;
    _lastMsgId = msgs.length ? msgs[msgs.length - 1].id : null;
    _renderChatMessages(msgs);
  }, err => console.error("support msg snap:", err));
}

function _subscribeAdminThreads() {
  if (_supportThreadsUnsub) { _supportThreadsUnsub(); _supportThreadsUnsub = null; }
  const q = firestoreQuery(firestoreCollection(db, "supportThreads"), firestoreOrderBy("lastAt", "desc"));
  _supportThreadsUnsub = onSnapshot(q, snap => {
    const threads = [];
    snap.forEach(d => threads.push(Object.assign({ uid: d.id }, d.data())));
    _renderAdminThreads(threads);
  }, err => console.error("threads snap:", err));
}

// État vide illustré (icône + titre + sous-texte).
function _chatEmptyState(iconSvg, title, sub) {
  return '<div class="chat-empty-rich">'
    + '<div class="ce-icon">' + iconSvg + '</div>'
    + '<div class="ce-title">' + title + '</div>'
    + (sub ? '<div class="ce-sub">' + sub + '</div>' : '')
    + '</div>';
}
const _CE_ICON_CHAT = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const _CE_ICON_INBOX = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';

function _renderAdminThreads(threads) {
  const el = document.getElementById("chat-threads");
  if (!el) return;
  const filtered = threads.filter(t => _supportAdminTab === "archived" ? t.archived === true : t.archived !== true);
  if (!filtered.length) {
    el.innerHTML = _chatEmptyState(_CE_ICON_INBOX,
      _supportAdminTab === "archived" ? "Aucune archive" : "Aucune conversation",
      _supportAdminTab === "archived" ? "Les tickets fermés apparaîtront ici." : "Les nouveaux tickets s'afficheront ici.");
    return;
  }
  el.innerHTML = filtered.map(t => {
    const unread = (t.unreadAdmin > 0) ? '<span class="ct-unread">' + t.unreadAdmin + '</span>' : "";
    const cls = (t.uid === _activeSupportThread) ? "chat-thread-item active" : "chat-thread-item";
    const preview = _escapeHtmlChat(t.lastMsg || "").slice(0, 50);
    const email = t.userEmail || t.uid;
    const name = t.userName || (email.includes("@") ? email.split("@")[0] : email);
    return '<div class="' + cls + '" onclick="_openAdminThread(\'' + t.uid + '\')">'
      + '<div class="ct-name">' + _escapeHtmlChat(name) + unread + '</div>'
      + '<div class="ct-preview" style="color:var(--text2);font-size:11px;margin-bottom:3px">' + _escapeHtmlChat(email) + '</div>'
      + '<div class="ct-preview">' + preview + '</div></div>';
  }).join("");
}

window._openNewChatPrompt = function() {
  showPromptModal({
    title: "Nouveau chat",
    body: "Initier une conversation avec un utilisateur.",
    okLabel: "Créer",
    fields: [
      { name: "contact", label: "Email ou UID Firebase", placeholder: "email@exemple.com ou UID", type: "text", required: true },
      { name: "reason",  label: "Raison du chat",         placeholder: "Ex : suivi inscription, retour bug…", type: "textarea", required: true },
    ],
    onConfirm: async (out) => {
      const v = out.contact;
      const reason = out.reason;
      let uid = v;
      if (v.includes("@")) {
        try {
          const snap = await getDocs(firestoreQuery(firestoreCollection(db, "users"), firestoreWhere("email", "==", v)));
          if (snap.empty) { alert("Aucun user avec cet email."); return; }
          uid = snap.docs[0].id;
        } catch(e) {
          alert("Recherche email impossible. Tape directement l'UID.");
          return;
        }
      }
      try {
        const threadRef = firestoreDoc(db, "supportThreads", uid);
        const existing = await getFirestoreDoc(threadRef);
        if (!existing.exists()) {
          await setFirestoreDoc(threadRef, {
            lastMsg: "📝 " + reason.slice(0, 60),
            lastAt: serverTimestamp(),
            lastFrom: "admin",
            unreadAdmin: 0, unreadUser: 1,
            userEmail: v.includes("@") ? v : "",
            ticketId: _genTicketId(uid),
            reason: reason,
          });
          await _postSystemMessage(uid, "🆕 Conversation initiée par l'admin");
          await _postSystemMessage(uid, "📝 Sujet : " + reason);
        }
        _openAdminThread(uid);
      } catch(e) {
        console.error(e);
        alert("Erreur création thread.");
      }
    },
  });
};

window._openAdminThread = async function(uid) {
  _activeSupportThread = uid;
  let closed = false;
  let archived = false;
  let ticketId = "";
  try {
    const snap = await getFirestoreDoc(firestoreDoc(db, "supportThreads", uid));
    const d = snap.exists() ? snap.data() : {};
    closed = d.closed === true;
    archived = d.archived === true;
    ticketId = d.ticketId || _genTicketId(uid);
    _currentThreadMeta = {
      userUid: uid,
      userName: d.userName || (d.userEmail ? d.userEmail.split("@")[0] : uid.slice(0, 6)),
      userEmail: d.userEmail || "",
      ticketId: ticketId,
    };
  } catch(_) {
    ticketId = _genTicketId(uid);
    _currentThreadMeta = { userUid: uid, userName: uid.slice(0, 6), userEmail: "", ticketId };
  }
  // Subscribe presence du user pour cette conv
  if (_supportPresenceUnsub) { _supportPresenceUnsub(); _supportPresenceUnsub = null; }
  _supportPresenceUnsub = onSnapshot(firestoreDoc(db, "presence", uid), snap => {
    const p = snap.exists() ? snap.data() : {};
    _renderPresenceBadge(p);
  }, () => {});
  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");
  if (input) { input.disabled = closed; if (!closed) input.focus(); }
  if (send) send.disabled = closed;

  const bar = document.getElementById("chat-actions-bar");
  if (bar) {
    bar.style.display = "flex";
    const stateBadge = archived ? '<span style="font-size:10px;color:#aab2c3;background:#2a2638;padding:2px 8px;border-radius:999px">Archivé</span>'
      : closed ? '<span style="font-size:10px;color:#f5b731;background:rgba(245,183,49,0.15);padding:2px 8px;border-radius:999px">Fermé</span>'
      : '<span style="font-size:10px;color:#00e09e;background:rgba(0,224,158,0.12);padding:2px 8px;border-radius:999px">Ouvert</span>';
    const leftInfo =
      '<div style="margin-right:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
      + '<span style="font-family:monospace;font-size:11px;color:var(--text2);background:var(--s3);padding:3px 8px;border-radius:6px">#' + ticketId + '</span>'
      + stateBadge
      + '<span id="presence-badge" style="font-size:11px;color:var(--text3)">…</span>'
      + '</div>';
    let actions = '<button onclick="downloadSupportTranscript()" class="btn-outline" style="font-size:11px;padding:5px 10px">📄 Transcription</button>';
    if (!closed) {
      actions += '<button onclick="closeSupportThreadAdmin()" class="btn-outline" style="font-size:11px;padding:5px 10px;color:#f5b731;border-color:rgba(245,183,49,0.3)">✕ Fermer le ticket</button>';
    } else {
      // Fermé (= archivé) → réouvrir ou supprimer
      actions += '<button onclick="reopenSupportThreadAdmin()" class="btn-outline" style="font-size:11px;padding:5px 10px">↺ Réouvrir</button>';
      actions += '<button onclick="deleteSupportThreadAdmin()" class="btn-outline" style="font-size:11px;padding:5px 10px;color:var(--negative);border-color:rgba(255,77,106,0.3)">🗑 Supprimer définitivement</button>';
    }
    bar.innerHTML = leftInfo + actions;
  }

  _subscribeSupportThread(uid);
  _markThreadReadByAdmin(uid);
  _subscribeAdminThreads();
  _subscribeThreadDoc(uid);
  _playOpenChatSound();
};

function _renderPresenceBadge(p) {
  const el = document.getElementById("presence-badge");
  if (!el) return;
  if (!p) { el.textContent = ""; return; }
  const lastSeenMs = p.lastSeen && p.lastSeen.toDate ? p.lastSeen.toDate().getTime() : 0;
  const isOnline = p.online === true && lastSeenMs > 0 && (Date.now() - lastSeenMs) < 60000;
  if (isOnline) {
    el.innerHTML = '<span style="display:inline-block;width:8px;height:8px;background:#00e09e;border-radius:50%;margin-right:5px;vertical-align:middle"></span>En ligne';
  } else {
    el.innerHTML = '<span style="display:inline-block;width:8px;height:8px;background:#6b7385;border-radius:50%;margin-right:5px;vertical-align:middle"></span>Hors ligne · ' + _formatLastSeen(p.lastSeen);
  }
}

function _renderChatMessages(msgs) {
  const c = document.getElementById("chat-messages");
  if (!c) return;
  if (!msgs.length) {
    c.innerHTML = _chatEmptyState(_CE_ICON_CHAT, "Aucun message", "Envoyez le premier message pour démarrer la conversation.");
    return;
  }
  const meta = _currentThreadMeta || {};
  const myRole = isAdmin() ? "admin" : "user";
  c.innerHTML = msgs.map(m => {
    // Message système (ouverture/fermeture ticket)
    if (m.type === "system" || m.from === "system") {
      let time = "";
      try {
        const t = (m.createdAt && m.createdAt.toDate) ? m.createdAt.toDate() : null;
        if (t) time = t.toLocaleString("fr-FR", {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
      } catch(_) {}
      return '<div class="chat-system">' + _escapeHtmlChat(m.text || "") + (time ? ' · <span style="opacity:0.7">' + time + '</span>' : '') + '</div>';
    }
    const isAdminMsg = m.from === "admin";
    let sideCls;
    if (isAdmin()) sideCls = isAdminMsg ? "from-user" : "from-admin";
    else           sideCls = isAdminMsg ? "from-admin" : "from-user";
    const isRight = sideCls === "from-user";

    const authorName = isAdminMsg ? ADMIN_DISPLAY_NAME : (meta.userName || "User");
    const authorRole = isAdminMsg ? "Admin" : "Utilisateur";
    const authorUid  = m.authorUid || (isAdminMsg ? ADMIN_UID : meta.userUid);
    const roleColor  = isAdminMsg ? "var(--accent)" : "var(--text3)";

    let time = "";
    try {
      const t = (m.createdAt && m.createdAt.toDate) ? m.createdAt.toDate() : (m.createdAt ? new Date(m.createdAt) : null);
      if (t) time = t.toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"});
    } catch(_) {}

    // Contenu (texte ou image)
    let body;
    if (m.type === "image" && m.imageUrl) {
      body = '<a href="' + m.imageUrl + '" target="_blank" rel="noopener"><img src="' + m.imageUrl + '" alt="img" style="max-width:240px;max-height:240px;border-radius:8px;display:block"></a>';
      if (m.text) body += '<div style="margin-top:6px">' + _escapeHtmlChat(m.text) + '</div>';
    } else {
      body = _escapeHtmlChat(m.text || "");
    }

    const avatar = '<div class="chat-avatar">' + defaultAvatarHtml(authorUid) + '</div>';
    const header =
      '<div class="chat-author">'
      + '<span class="chat-author-name">' + _escapeHtmlChat(authorName) + '</span>'
      + '<span class="chat-author-role" style="color:' + roleColor + '">' + authorRole + '</span>'
      + '</div>';
    const bubble =
      '<div class="chat-msg ' + sideCls + '">' + body
      + '<div class="msg-meta">' + time + '</div></div>';
    const inner = '<div class="chat-msg-content">' + header + bubble + '</div>';

    return '<div class="chat-row ' + (isRight ? 'right' : 'left') + '">'
      + (isRight ? inner + avatar : avatar + inner)
      + '</div>';
  }).join("");
  c.scrollTop = c.scrollHeight;
}

// Construit la barre input (emoji + image + texte + send).
function _chatInputBarHtml(placeholder, sendId, sendDisabled) {
  const emojis = ["😀","😂","😍","🤔","👍","👎","🙏","🎉","🔥","💯","✨","❤️","😢","😡","✅","❌","💡","💰","📈","📉","⭐","🚀","🤝","👀","🎯","🤷","🤯"];
  const panel = '<div id="emoji-panel" class="emoji-panel">'
    + emojis.map(e => '<button onclick="insertEmoji(\'' + e + '\')" class="emoji-btn">' + e + '</button>').join("")
    + '</div>';
  return '<div id="typing-indicator" class="typing-indicator"></div>'
    + panel
    + '<div class="chat-input-bar">'
    + '<button type="button" onclick="toggleEmojiPanel()" class="chat-tool-btn" title="Emoji">😀</button>'
    + '<label class="chat-tool-btn" title="Joindre image">📎'
    + '<input type="file" accept="image/*" onchange="uploadSupportImage(this)" style="display:none">'
    + '</label>'
    + '<input id="chat-input" placeholder="' + placeholder + '" ' + (sendDisabled ? "disabled " : "") + 'oninput="signalTyping()" onkeydown="if(event.key===&quot;Enter&quot;)sendSupportMessage()">'
    + '<button ' + (sendId ? 'id="' + sendId + '" ' : '') + 'onclick="sendSupportMessage()" ' + (sendDisabled ? "disabled" : "") + '>Envoyer</button>'
    + '</div>';
}

async function _sendSupportPayload(targetUid, payload) {
  await addFirestoreDoc(firestoreCollection(db, "supportChats", targetUid, "messages"), Object.assign({
    from: isAdmin() ? "admin" : "user",
    createdAt: serverTimestamp(),
    authorUid: currentUser,
    read: false,
  }, payload));
  const u = fbAuth.currentUser;
  const userEmail = isAdmin() ? null : ((u && u.email) || "");
  const userName  = isAdmin() ? null : ((u && (u.displayName || (u.email || "").split("@")[0])) || "");
  const threadRef = firestoreDoc(db, "supportThreads", targetUid);
  const existing = await getFirestoreDoc(threadRef);
  const prev = existing.exists() ? existing.data() : {};
  const preview = payload.type === "image" ? "📎 Image" : (payload.text || "");
  const update = {
    lastMsg: preview,
    lastAt: serverTimestamp(),
    lastFrom: isAdmin() ? "admin" : "user",
    unreadAdmin: isAdmin() ? 0 : ((prev.unreadAdmin || 0) + 1),
    unreadUser: isAdmin() ? ((prev.unreadUser || 0) + 1) : 0,
  };
  if (userEmail && !prev.userEmail) update.userEmail = userEmail;
  if (userName  && !prev.userName)  update.userName  = userName;
  if (!prev.ticketId) update.ticketId = _genTicketId(targetUid);
  await setFirestoreDoc(threadRef, update, { merge: true });
}

window.sendSupportMessage = async function() {
  const input = document.getElementById("chat-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const targetUid = isAdmin() ? _activeSupportThread : currentUser;
  if (!targetUid) return;

  // User : si nouveau ticket (inexistant uniquement), demander raison d'abord.
  // Si fermé, user ne peut pas réouvrir (page bloquée en lecture seule).
  if (!isAdmin() && window._supportNoThread === true) {
    showPromptModal({
      title: "Raison du contact",
      body: "Précisez brièvement le sujet de votre message. L'admin en aura connaissance.",
      placeholder: "Ex : problème de connexion, question facturation…",
      okLabel: "Continuer",
      onConfirm: async (reason) => {
        input.value = "";
        try {
          await setFirestoreDoc(firestoreDoc(db, "supportThreads", currentUser), {
            closed: false, reason: reason, ticketId: _genTicketId(currentUser),
          }, { merge: true });
          await _postSystemMessage(currentUser, "🆕 Nouvelle conversation ouverte");
          await _postSystemMessage(currentUser, "📝 Sujet : " + reason);
          window._supportNoThread = false;
          await _sendSupportPayload(targetUid, { type: "text", text });
          renderSupportUser();
        } catch(e) { console.error(e); alert("Erreur envoi"); input.value = text; }
      },
    });
    return;
  }

  input.value = "";
  try {
    await _sendSupportPayload(targetUid, { type: "text", text });
  }
  catch(e) { console.error("send support:", e); alert("Erreur envoi"); input.value = text; }
};

window.uploadSupportImage = async function(fileInput) {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) { alert("Image uniquement."); return; }
  if (file.size > 5 * 1024 * 1024) { alert("Max 5 Mo."); return; }
  if (!fbStorage) { alert("Storage non disponible."); return; }
  const targetUid = isAdmin() ? _activeSupportThread : currentUser;
  if (!targetUid) return;
  const sendBtn = document.getElementById("chat-send");
  if (sendBtn) sendBtn.disabled = true;
  try {
    const path = "support-attachments/" + targetUid + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const sref = fbStorageRef(fbStorage, path);
    await fbStorageUploadBytes(sref, file);
    const url = await fbStorageGetDownloadURL(sref);
    await _sendSupportPayload(targetUid, { type: "image", imageUrl: url, fileName: file.name });
  } catch(e) {
    console.error("upload:", e);
    alert("Erreur upload : " + (e.message || e));
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
};

window.insertEmoji = function(emo) {
  const input = document.getElementById("chat-input");
  if (!input) return;
  input.value = (input.value || "") + emo;
  input.focus();
  const panel = document.getElementById("emoji-panel");
  if (panel) panel.style.display = "none";
};

window.toggleEmojiPanel = function() {
  const panel = document.getElementById("emoji-panel");
  if (!panel) return;
  panel.style.display = panel.style.display === "block" ? "none" : "block";
};

async function _postSystemMessage(uid, text) {
  try {
    await addFirestoreDoc(firestoreCollection(db, "supportChats", uid, "messages"), {
      type: "system", text, createdAt: serverTimestamp(), from: "system", authorUid: currentUser, read: true,
    });
  } catch(e) { console.warn("system msg:", e); }
}

window.openNewTicketForm = function() {
  showPromptModal({
    title: "Nouveau ticket",
    body: "Décrivez votre demande pour ouvrir une conversation avec le support.",
    okLabel: "Ouvrir le ticket",
    fields: [
      { name: "subject", label: "Sujet", placeholder: "Ex : problème de connexion", type: "text", required: true },
      { name: "message", label: "Votre message", placeholder: "Détaillez votre demande…", type: "textarea", required: true },
    ],
    onConfirm: async (out) => {
      try {
        await setFirestoreDoc(firestoreDoc(db, "supportThreads", currentUser), {
          closed: false, archived: false,
          reason: out.subject,
          ticketId: _genTicketId(currentUser),
          createdAt: serverTimestamp(),
        }, { merge: true });
        await _postSystemMessage(currentUser, "🆕 Ticket ouvert");
        await _postSystemMessage(currentUser, "📝 Sujet : " + out.subject);
        await _sendSupportPayload(currentUser, { type: "text", text: out.message });
        window._supportNoThread = false;
        window._supportUserView = "chat";
        renderSupportUser();
      } catch(e) { console.error(e); alert("Erreur ouverture ticket."); }
    },
  });
};

window.closeSupportThreadUser = function() {
  showConfirmModal({
    title: "Fermer la conversation",
    body: "Cette action coupe votre accès au chat. Seul l'admin pourra le rouvrir.",
    okLabel: "Fermer", cancelLabel: "Annuler", danger: true,
    onConfirm: async () => {
      try {
        await _postSystemMessage(currentUser, "🔒 Ticket fermé par l'utilisateur");
        await setFirestoreDoc(firestoreDoc(db, "supportThreads", currentUser), {
          closed: true, closedAt: serverTimestamp(), closedBy: "user"
        }, { merge: true });
        if (_supportUnsub) { _supportUnsub(); _supportUnsub = null; }
        renderSupportUser();
      } catch(e) { console.error(e); alert("Erreur fermeture."); }
    },
  });
};

window.reopenSupportThread = async function() {
  try {
    await _postSystemMessage(currentUser, "🔓 Ticket rouvert par l'utilisateur");
    await setFirestoreDoc(firestoreDoc(db, "supportThreads", currentUser), {
      closed: false, reopenedAt: serverTimestamp()
    }, { merge: true });
    renderSupportUser();
  } catch(e) { console.error(e); alert("Erreur réouverture."); }
};

window.closeSupportThreadAdmin = function() {
  if (!_activeSupportThread) return;
  const uid = _activeSupportThread;
  showConfirmModal({
    title: "Fermer le ticket",
    body: "Le chat sera coupé et le ticket archivé. Vous pourrez le rouvrir ou le supprimer depuis l'onglet Archivés.",
    okLabel: "Fermer", cancelLabel: "Annuler",
    onConfirm: async () => {
      try {
        await _postSystemMessage(uid, "🔒 Ticket fermé par l'admin");
        await setFirestoreDoc(firestoreDoc(db, "supportThreads", uid), {
          closed: true, archived: true,
          closedAt: serverTimestamp(), archivedAt: serverTimestamp(),
          closedBy: "admin",
        }, { merge: true });
        _activeSupportThread = null;
        _supportAdminTab = "active";
        renderSupportAdmin();
      } catch(e) { console.error(e); alert("Erreur fermeture."); }
    },
  });
};

window.reopenSupportThreadAdmin = async function() {
  if (!_activeSupportThread) return;
  const uid = _activeSupportThread;
  try {
    await _postSystemMessage(uid, "🔓 Ticket rouvert par l'admin");
    await setFirestoreDoc(firestoreDoc(db, "supportThreads", uid), {
      closed: false, archived: false, reopenedAt: serverTimestamp()
    }, { merge: true });
    _supportAdminTab = "active";
    _openAdminThread(uid);
  } catch(e) { console.error(e); alert("Erreur réouverture."); }
};

window.deleteSupportThreadAdmin = function() {
  if (!_activeSupportThread) return;
  const uid = _activeSupportThread;
  showConfirmModal({
    title: "Suppression définitive",
    body: "Cette conversation et tous ses messages seront supprimés. Action irréversible.",
    okLabel: "Supprimer", cancelLabel: "Annuler", danger: true,
    onConfirm: async () => {
      try {
        const msgsCol = firestoreCollection(db, "supportChats", uid, "messages");
        const snap = await getDocs(msgsCol);
        await Promise.all(snap.docs.map(d => deleteFirestoreDoc(firestoreDoc(db, "supportChats", uid, "messages", d.id))));
        await deleteFirestoreDoc(firestoreDoc(db, "supportThreads", uid));
        _activeSupportThread = null;
        renderSupportAdmin();
      } catch(e) { console.error(e); alert("Erreur suppression."); }
    },
  });
};

window.downloadSupportTranscript = async function() {
  const uid = isAdmin() ? _activeSupportThread : currentUser;
  if (!uid) return;
  try {
    const q = firestoreQuery(firestoreCollection(db, "supportChats", uid, "messages"), firestoreOrderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    const lines = ["=== Transcription support Capital Board ===\n"];
    snap.forEach(d => {
      const m = d.data();
      let time = "";
      try {
        const t = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate() : null;
        if (t) time = t.toLocaleString("fr-FR");
      } catch(_) {}
      const author = m.from === "admin" ? ADMIN_DISPLAY_NAME + " (Admin)" : ((_currentThreadMeta && _currentThreadMeta.userName) || "Utilisateur");
      lines.push("[" + time + "] " + author + " :\n" + (m.text || "") + "\n");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "support-" + uid.slice(0, 8) + "-" + new Date().toISOString().slice(0, 10) + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch(e) { console.error(e); alert("Erreur transcription."); }
};

async function _markThreadReadByUser(uid) {
  try { await setFirestoreDoc(firestoreDoc(db, "supportThreads", uid), { unreadUser: 0 }, { merge: true }); } catch(_) {}
}
async function _markThreadReadByAdmin(uid) {
  try { await setFirestoreDoc(firestoreDoc(db, "supportThreads", uid), { unreadAdmin: 0 }, { merge: true }); } catch(_) {}
}

// Badge non-lu sur item nav Support
function _initSupportBadge() {
  if (window.IS_DEMO || !db || !currentUser) return;
  if (isAdmin()) {
    onSnapshot(firestoreCollection(db, "supportThreads"), snap => {
      let total = 0;
      snap.forEach(d => total += (d.data().unreadAdmin || 0));
      const b = document.getElementById("support-badge");
      if (b) { b.textContent = total; b.style.display = total > 0 ? "inline-block" : "none"; }
    });
  } else {
    onSnapshot(firestoreDoc(db, "supportThreads", currentUser), snap => {
      const n = snap.exists() ? (snap.data().unreadUser || 0) : 0;
      const b = document.getElementById("support-badge");
      if (b) { b.textContent = n; b.style.display = n > 0 ? "inline-block" : "none"; }
    });
  }
}
window.renderSupportPage = renderSupportPage;
window._initSupportBadge = _initSupportBadge;

// Version-lock strict : vérifie dès l'accès/refresh (avant même le login)
try { _checkVersion(); } catch(_) {}

