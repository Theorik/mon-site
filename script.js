/* ===========================================================
   script.js - interactions & comportements
   Version restaurée + petites améliorations demandées
   - Particules (clic = répulsion)
   - Curseur personnalisé (dot + follower)
   - Loader, Modal projets, Témoignages (localStorage)
   - Header cache/reapparaît, back-to-top, smooth scroll
   - Theme toggle (stocké en localStorage)
   =========================================================== */

/* --- raccourcis DOM --- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* --- éléments utilisés --- */
const loader = $('#loader');
const header = $('#site-header');
const themeToggle = $('#themeToggle');
const body = document.body;
const navLinks = $$('.nav-link');
const menuToggle = $('#menuToggle');
const nav = $('#nav');
const backTop = $('#backTop');
const yearEl = $('#year');
const projectsGrid = $('#projectsGrid');
const projectModal = $('#projectModal');
const modalClose = $('#modalClose');
const modalTitle = $('#modalTitle');
const modalDesc = $('#modalDesc');
const modalRepo = $('#modalRepo');
// EmailJS configuration (optional - fill these values to enable direct sending)
const EMAILJS_USER = ''; // ex: 'user_xxx'
const EMAILJS_SERVICE = ''; // ex: 'service_xxx'
const EMAILJS_TEMPLATE = ''; // ex: 'template_xxx'

/* =========================
   INITIALISATION DOM
   ========================= */
document.addEventListener('DOMContentLoaded', () => {

  // année dans le footer (si l'élément existe)
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // loader : on le masque après un court délai
  setTimeout(() => loader.classList.add('hidden'), 700);

  // IntersectionObserver pour les .fade-in
  const fadeEls = $$('.fade-in');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.18 });
  fadeEls.forEach(el => io.observe(el));

  /* ===== Animations séquentielles des stats (À propos) =====
     Objectif : quand la section #about apparaît, animer :
       1) âge (stat1) => compter de 0 à data-target
       2) projets (stat2) => compter de 0 à data-target
       3) langues (stat3) => faire défiler les codes de langue et finir sur la dernière
     Les animations se lancent une seule fois et se font à la suite.
  */
  (function statsAnimations(){
    const stat1 = $('#stat1');
    const stat2 = $('#stat2');
    const stat3 = $('#stat3');
    if (!stat1 || !stat2 || !stat3) return;
    let played = false;

    function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

    function animateNumber(el, target, duration = 200){
      return new Promise(resolve => {
        const start = performance.now();
        const from = 0;
        function step(now){
          const t = Math.min((now - start) / duration, 1);
          const v = Math.floor((from + (target - from) * easeOutCubic(t)));
          el.textContent = v;
          if (t < 1) requestAnimationFrame(step);
          else { el.textContent = target; resolve(); }
        }
        requestAnimationFrame(step);
      });
    }

    // totalDuration in ms will be split across all langs (and cycles)
    function animateLanguages(el, langs, totalDuration = 400, cycles = 1){
      return new Promise(resolve => {
        if (!Array.isArray(langs) || langs.length === 0){ resolve(); return; }
        let i = 0;
        let pass = 0;
        const totalItems = Math.max(1, langs.length * Math.max(1, cycles));
        // compute per-item delay to fit totalDuration (min 8ms to avoid zero)
        const per = Math.max(8, Math.floor(totalDuration / totalItems));
        function next(){
          // small flash pop: toggle classes quickly
          try {
            el.classList.remove('active');
            void el.offsetWidth;
            el.classList.add('flash');
            setTimeout(() => el.classList.add('active'), 6);
          } catch (err) {}
          el.textContent = langs[i];
          i++;
          if (i >= langs.length) {
            pass++;
            if (pass < cycles) i = 0;
          }
          if (i < langs.length || pass < cycles){ setTimeout(next, per); }
          else { setTimeout(() => { el.textContent = langs[langs.length - 1]; resolve(); }, per); }
        }
        next();
      });
    }

    const about = document.getElementById('about');
    if (!about) return;
    const ioStats = new IntersectionObserver((entries) => {
      entries.forEach(async ent => {
        // Trigger when section is visible and its top has reached ~1/3 of the viewport height
        const top = ent.boundingClientRect.top;
        const triggerAt = window.innerHeight * 0.66; // when top <= 66% of viewport height (i.e. about 1/3 visible)
        if (!played && ent.isIntersecting && top <= triggerAt) {
          played = true;
          // read targets
          const ageTarget = parseInt(stat1.dataset.target, 10) || parseInt(stat1.textContent,10) || 16;
          const projTarget = parseInt(stat2.dataset.target, 10) || parseInt(stat2.textContent,10) || 5;
          const langs = (stat3.dataset.langs || stat3.textContent || 'FR').split(',').map(s => s.trim()).filter(Boolean);
          // starting values
          stat1.textContent = '0'; stat2.textContent = '0';
          try {
            // reveal & animate top -> bottom in sequence
            // add the reveal class directly on the h3 elements (stat1/stat2/stat3 are the h3 elements)
            stat1.classList.add('reveal');
            // small delay so the reveal animation is visible before counting
            // total time requested for the whole sequence (ms)
            const TOTAL_MS = 1500;
            // small reveal spacers (ms)
            const reveal1 = 30, reveal2 = 20, reveal3 = 20;
            const remaining = Math.max(0, TOTAL_MS - (reveal1 + reveal2 + reveal3));
            // allocate proportions: age 35%, projects 25%, languages 40%
            const ageDur = Math.max(30, Math.floor(remaining * 0.35));
            const projDur = Math.max(30, Math.floor(remaining * 0.25));
            const langsDur = Math.max(40, remaining - ageDur - projDur);

            await new Promise(r => setTimeout(r, reveal1));
            await animateNumber(stat1, ageTarget, ageDur);

            stat2.classList.add('reveal');
            await new Promise(r => setTimeout(r, reveal2));
            await animateNumber(stat2, projTarget, projDur);

            stat3.classList.add('reveal');
            await new Promise(r => setTimeout(r, reveal3));
            // languages: run once, fitting into langsDur
            await animateLanguages(stat3, langs, langsDur, 1);
          } catch (e) { console.error('Stat animation error', e); }
          ioStats.disconnect();
        }
      });
    }, { threshold: 0.05 });
    ioStats.observe(about);
  })();

  // smooth scroll pour les liens du nav
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
      nav.classList.remove('active'); // ferme nav mobile si ouvert
    });
  });

  // menu mobile
  if (menuToggle) {
    // initialize aria state
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.addEventListener('click', () => {
      const opened = nav.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
      // toggle icon between hamburger and close
      try { menuToggle.textContent = opened ? '✕' : '☰'; } catch (e) {}
    });
  }

  // back-to-top : affichage selon scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 450) backTop.style.display = 'block';
    else backTop.style.display = 'none';
  });
  backTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

  // header : cache quand on scroll vers le bas, réapparait vers le haut
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 80) header.classList.add('hidden');
    else header.classList.remove('hidden');
    lastScroll = current;
  });

  /* ===== projets : ouverture modal (clic sur la carte) ===== */
  $$('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // éviter d'ouvrir le modal si l'utilisateur clique sur un lien ou un contrôle dans la card
      if (e.target.closest('a, button')) return;
      const title = card.dataset.title || card.querySelector('h3').innerText;
      const desc = card.dataset.desc || '';
      modalTitle.textContent = title;
      modalDesc.textContent = desc;
      modalRepo.href = card.dataset.repo || '#';
      projectModal.setAttribute('aria-hidden','false');
    });
  });
  if (modalClose) modalClose.addEventListener('click', () => projectModal.setAttribute('aria-hidden','true'));
  projectModal.addEventListener('click', (e) => { if (e.target === projectModal) projectModal.setAttribute('aria-hidden','true'); });

  /* ===== Témoignages (client-side, localStorage) ===== */
  const testiForm = $('#testimonialForm');
  const testiList = $('#testimonialsList');
  const adminLoginBtn = $('#adminLogin');
  const adminLogoutBtn = $('#adminLogout');

  // --- utilitaires admin (local, non sécurisé pour le web public) ---
  // hash mot de passe via SubtleCrypto (SHA-256)
  async function hashPwd(pwd) {
    const enc = new TextEncoder();
    const data = enc.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function ensureAdminAuth() {
    // session flag
    if (sessionStorage.getItem('testiAdminAuth') === '1') return true;
    const stored = localStorage.getItem('testiAdminHash');
    if (!stored) {
      const pwd = prompt('Aucun mot de passe administrateur défini. Crée ton mot de passe administrateur :');
      if (!pwd) return false;
      const pwd2 = prompt('Confirme le mot de passe :');
      if (pwd !== pwd2) { alert('Les mots de passe ne correspondent pas.'); return false; }
      const h = await hashPwd(pwd);
      localStorage.setItem('testiAdminHash', h);
      sessionStorage.setItem('testiAdminAuth', '1');
      alert('Mot de passe administrateur défini et connecté.');
      return true;
    } else {
      const pwd = prompt('Mot de passe administrateur :');
      if (!pwd) return false;
      const h = await hashPwd(pwd);
      if (h === stored) { sessionStorage.setItem('testiAdminAuth','1'); return true; }
      alert('Mot de passe incorrect.');
      return false;
    }
  }

  function updateAdminUI() {
    const isAdmin = sessionStorage.getItem('testiAdminAuth') === '1';
    if (adminLoginBtn) adminLoginBtn.style.display = isAdmin ? 'none' : 'inline-block';
    if (adminLogoutBtn) adminLogoutBtn.style.display = isAdmin ? 'inline-block' : 'none';
  }

  // charge les témoignages depuis localStorage
  const loadTestimonials = () => {
    testiList.innerHTML = '';
    const stored = JSON.parse(localStorage.getItem('testimonials') || '[]');
    const isAdmin = sessionStorage.getItem('testiAdminAuth') === '1';
    if (!stored || stored.length === 0) {
      const p = document.createElement('p');
      p.className = 'muted small no-testimonials';
      p.textContent = "Aucun témoignage pour le moment. Sois le premier !";
      testiList.appendChild(p);
    } else {
      stored.forEach(t => appendTestimonialToDOM(t.name, t.text, t.date, isAdmin));
    }
    updateAdminUI();
  };
  const saveTestimonials = (arr) => localStorage.setItem('testimonials', JSON.stringify(arr));
  const appendTestimonialToDOM = (name, text, date, isAdmin=false) => {
    const div = document.createElement('div');
    div.className = 'testi-card';
    div.dataset.id = date;
    const d = new Date(Number(date) || Date.now());
    const formatted = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    const meta = `<div class="testi-meta"><strong>${escapeHtml(name)}</strong><time datetime="${d.toISOString()}">${formatted}</time></div>`;
    const body = `<p class="testi-text">${escapeHtml(text)}</p>`;
    div.innerHTML = meta + body;
    if (isAdmin) {
      const del = document.createElement('button');
      del.className = 'testi-delete';
      del.textContent = 'Supprimer';
      del.dataset.id = date;
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Supprimer ce témoignage ?')) return;
        const arr = JSON.parse(localStorage.getItem('testimonials') || '[]');
        const idx = arr.findIndex(x => String(x.date) === String(e.target.dataset.id));
        if (idx > -1) {
          arr.splice(idx,1);
          saveTestimonials(arr);
          loadTestimonials();
        }
      });
      // place le bouton en haut à droite
      div.appendChild(del);
    }
    testiList.prepend(div);
  };

  if (testiForm) {
    testiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#tName').value.trim();
      const text = $('#tText').value.trim();
      if (!name || !text) return alert('Remplis les champs.');
      const arr = JSON.parse(localStorage.getItem('testimonials') || '[]');
      const entry = {name, text, date: Date.now()};
      arr.unshift(entry);
      saveTestimonials(arr);
      // si admin connecté, passer true pour afficher bouton
      const isAdmin = sessionStorage.getItem('testiAdminAuth') === '1';
      appendTestimonialToDOM(name, text, entry.date, isAdmin);
      testiForm.reset();
    });
  }

  if (adminLoginBtn) adminLoginBtn.addEventListener('click', async () => {
    const ok = await ensureAdminAuth();
    if (!ok) return;
    updateAdminUI();
    loadTestimonials();
  });
  if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('testiAdminAuth');
    updateAdminUI();
    loadTestimonials();
  });

  // load at start
  loadTestimonials();

  /* ===== Contact form : envoi (EmailJS si configuré) ===== */
  const contactForm = $('#contactForm');
  const contactStatus = $('#contactStatus');

  function showContactStatus(msg, type = 'info', timeout = 6000) {
    if (!contactStatus) return; // no UI to show
    contactStatus.textContent = msg;
    contactStatus.classList.remove('success','error');
    if (type === 'success') contactStatus.classList.add('success');
    if (type === 'error') contactStatus.classList.add('error');
    contactStatus.style.display = 'block';
    if (timeout > 0) setTimeout(() => { contactStatus.style.display = 'none'; }, timeout);
  }

  // init EmailJS if keys provided
  try { if (typeof emailjs !== 'undefined' && EMAILJS_USER) emailjs.init(EMAILJS_USER); } catch (e) {}

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#cName').value.trim();
      const email = $('#cEmail').value.trim();
      const message = $('#cMessage').value.trim();
      if (!name || !email || !message) { showContactStatus('Remplis tous les champs.', 'error'); return; }

      // If EmailJS configured, send via EmailJS to get real success/error callbacks
      if (typeof emailjs !== 'undefined' && EMAILJS_USER && EMAILJS_SERVICE && EMAILJS_TEMPLATE) {
        showContactStatus('Envoi en cours...', 'info', 0);
        const templateParams = {
          from_name: name,
          from_email: email,
          message: message,
          to_email: 'cyprien.thuillez0505@gmail.com'
        };
        try {
          await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, templateParams);
          showContactStatus('Message envoyé — merci !', 'success', 6000);
          contactForm.reset();
        } catch (err) {
          console.error('EmailJS send error', err);
          showContactStatus('Une erreur est survenue lors de l\'envoi. Essaie plus tard.', 'error', 8000);
        }
      } else {
        // Fallback: open user's mail client via mailto (cannot be verified automatically)
        const subject = encodeURIComponent(`Demande via site - ${name}`);
        const body = encodeURIComponent(`Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
        showContactStatus('Ouverture du client mail (envoi non vérifiable depuis le site).', 'info', 5000);
        window.location.href = `mailto:cyprien.thuillez0505@gmail.com?subject=${subject}&body=${body}`;
      }
    });
  }

  /* ===== Theme toggle (sauvegarde local) ===== */
  const storedTheme = localStorage.getItem('siteTheme');
  if (storedTheme) body.className = storedTheme === 'light' ? 'theme-light' : 'theme-dark';
  else body.className = 'theme-dark';

  if (themeToggle) themeToggle.addEventListener('click', () => {
    if (body.classList.contains('theme-dark')) {
      body.classList.remove('theme-dark'); body.classList.add('theme-light');
      localStorage.setItem('siteTheme','light');
    } else {
      body.classList.remove('theme-light'); body.classList.add('theme-dark');
      localStorage.setItem('siteTheme','dark');
    }
  });

  /* Fermer modal avec Escape */
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') projectModal.setAttribute('aria-hidden','true'); });

}); // fin DOMContentLoaded

/* =====================================================
   PARTICULES (canvas) - clic = répulsion
   - Configuration en haut de la fonction
   - Change particleCount, color, repulseRadius ici
   ===================================================== */
(function particles(){
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // CONFIGURATION : change ici si tu veux modifier
  const config = {
    particleCount: 80,
    maxSize: 3,
    speed: 0.3,
    color: 'rgba(255,122,45,0.9)', // couleur orange
    linkColor: 'rgba(255,122,45,0.06)',
    repulseForce: 5,
    repulseRadius: 120
  };

  let w = canvas.width = innerWidth;
  let h = canvas.height = innerHeight;
  window.addEventListener('resize', () => { w = canvas.width = innerWidth; h = canvas.height = innerHeight; });

  class P {
    constructor(){ this.reset(); }
    reset(){
      this.x = Math.random()*w;
      this.y = Math.random()*h;
      this.vx = (Math.random()-0.5)*config.speed;
      this.vy = (Math.random()-0.5)*config.speed;
      this.r = Math.random()*config.maxSize + 0.6;
      this.alpha = 0.6 + Math.random()*0.4;
    }
    step(){
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > w) this.vx *= -1;
      if (this.y < 0 || this.y > h) this.vy *= -1;
    }
    draw(){
      ctx.beginPath();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = config.color;
      ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
      ctx.fill();
    }
  }

  const parts = [];
  for (let i=0;i<config.particleCount;i++) parts.push(new P());

  // REPULSE AU CLIC (ignore si on clique sur input/button)
  window.addEventListener('pointerdown', (e) => {
    const el = e.target;
    if (el.closest('input, textarea, button, a')) return;
    parts.forEach(p => {
      const dx = p.x - e.clientX;
      const dy = p.y - e.clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < config.repulseRadius) {
        const force = (1 - dist/config.repulseRadius) * config.repulseForce;
        p.vx += (dx/dist) * force;
        p.vy += (dy/dist) * force;
      }
    });
  });

  function loop(){
    ctx.clearRect(0,0,w,h);
    // lignes subtiles entre particules proches
    for (let i=0;i<parts.length;i++){
      for (let j=i+1;j<parts.length;j++){
        const a = parts[i], b = parts[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 120){
          ctx.strokeStyle = config.linkColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = (1 - d/120)*0.6;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    parts.forEach(p => { p.step(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();
})();

/* =====================================================
   CURSEUR PERSONNALISÉ (dot + follower)
   - Le follower suit la souris avec un léger lag
   - Il s'estompe sur les éléments interactifs
   ===================================================== */
(function customCursor(){
  const dot = document.getElementById('cursor-dot');
  const follower = document.getElementById('cursor-follower');
  if (!dot || !follower) return;
  let mouseX = -100, mouseY = -100;
  let fX = -100, fY = -100;

  window.addEventListener('pointermove', (e) => { mouseX = e.clientX; mouseY = e.clientY; dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`; });

  function animate() {
    fX += (mouseX - fX) * 0.12;
    fY += (mouseY - fY) * 0.12;
    follower.style.transform = `translate(${fX}px, ${fY}px)`;
    requestAnimationFrame(animate);
  }
  animate();

  const interactive = 'a, button, input, textarea, select, summary';
  document.addEventListener('pointerover', e => {
    if (e.target.closest(interactive)) { dot.style.opacity = '0'; follower.style.opacity = '0.06'; }
    else { dot.style.opacity = '1'; follower.style.opacity = '1'; }
  });
})();

/* =====================
   UTILITAIRES
   ===================== */
function escapeHtml(unsafe) {
  return unsafe.replace(/[&<"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','"':'&quot;',"'":'&#039;'}[m]); });
}

/* =====================
   COMMENTAIRES / GUIDE RAPIDE
   - Ajouter un projet : dupliquer <article class="project-card"> dans index.html
     et modifier data-title, data-desc, data-repo.
   - Remplacer avatar : mettre ton image dans le dossier et modifier src="avatar-placeholder.jpg"
   - Modifier couleur des particules : dans particles() -> config.color
   - Témoignages persistants : actuellement stockés en localStorage.
     Pour les rendre visibles pour tous, ajoute un backend ou utilise un service (EmailJS, Firebase).
   - Pour changer les tailles sur desktop : modifie les variables CSS dans :root (--h1-size, --p-size, etc.)
*/
