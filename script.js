const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const CHEMISTRY_ANNOUNCE_KEY = "mentalcoach_chemistryAnnounce";

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let closeMobileNavMenu = () => {};

let siteScrollLockDepth = 0;
let siteScrollLockY = 0;

function usesSoftScrollLock() {
  return typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1099px)").matches;
}

function allowScrollWhileLocked(node) {
  if (!(node instanceof Node)) return false;
  if (qsa("dialog[open]").some((d) => d.contains(node))) return true;
  const menu = qs("#navMenu");
  if (menu instanceof HTMLElement && menu.dataset.state === "open" && menu.contains(node)) {
    return true;
  }
  return false;
}

function onSiteScrollLockTouchMove(e) {
  if (!allowScrollWhileLocked(e.target)) {
    e.preventDefault();
  }
}

function lockSiteScroll() {
  if (siteScrollLockDepth++ > 0) return;
  siteScrollLockY = window.scrollY;
  document.documentElement.classList.add("site-scroll-lock");
  document.body.classList.add("site-scroll-lock");
  if (!usesSoftScrollLock()) {
    document.body.style.top = `-${siteScrollLockY}px`;
  }
  document.addEventListener("touchmove", onSiteScrollLockTouchMove, { passive: false });
}

function unlockSiteScroll() {
  if (siteScrollLockDepth <= 0) return;
  if (--siteScrollLockDepth > 0) return;
  const restoreY = siteScrollLockY;
  document.documentElement.classList.remove("site-scroll-lock");
  document.body.classList.remove("site-scroll-lock");
  document.body.style.top = "";
  document.removeEventListener("touchmove", onSiteScrollLockTouchMove);
  if (!usesSoftScrollLock()) {
    window.scrollTo(0, restoreY);
  }
}

function forceReleaseSiteScrollLock() {
  siteScrollLockDepth = 0;
  document.documentElement.classList.remove("site-scroll-lock");
  document.body.classList.remove("site-scroll-lock");
  document.body.style.top = "";
  document.removeEventListener("touchmove", onSiteScrollLockTouchMove);
}

function setupSiteDialog({ openSelector, dialogSelector, closeSelector }) {
  const openBtns = qsa(openSelector);
  const dialog = qs(dialogSelector);
  if (openBtns.length === 0 || !(dialog instanceof HTMLDialogElement)) return;

  const closeBtn = closeSelector ? qs(closeSelector, dialog) : null;
  let lastOpenBtn = openBtns[0];

  const close = () => {
    if (!dialog.open) return;
    dialog.close();
    if (lastOpenBtn instanceof HTMLButtonElement || lastOpenBtn instanceof HTMLAnchorElement) {
      lastOpenBtn.focus();
    }
  };

  dialog.addEventListener("close", () => {
    if (qsa("dialog[open]").length === 0) {
      unlockSiteScroll();
    }
  });

  openBtns.forEach((openBtn) => {
    if (!(openBtn instanceof HTMLElement)) return;
    openBtn.addEventListener("click", (event) => {
      if (openBtn instanceof HTMLAnchorElement) {
        event.preventDefault();
      }
      lastOpenBtn = openBtn;
      closeMobileNavMenu();
      if (dialog.open) return;
      dialog.scrollTop = 0;
      lockSiteScroll();
      dialog.showModal();
      if (closeBtn instanceof HTMLButtonElement) {
        closeBtn.focus();
      }
    });
  });

  if (closeBtn instanceof HTMLButtonElement) {
    closeBtn.addEventListener("click", close);
  }

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
}

function setupLogoStory() {
  setupSiteDialog({
    openSelector: "[data-logo-story-open]",
    dialogSelector: "#logoStoryDialog",
    closeSelector: "[data-logo-story-close]",
  });
}

function setupCoachWhat() {
  setupSiteDialog({
    openSelector: "[data-coach-what-open]",
    dialogSelector: "#coachWhatDialog",
    closeSelector: "[data-coach-what-close]",
  });
}

function setupCoachAudience() {
  setupSiteDialog({
    openSelector: "[data-coach-audience-open]",
    dialogSelector: "#coachAudienceDialog",
    closeSelector: "[data-coach-audience-close]",
  });
}

const DICONO_DI_ME_HASH = "#dicono-di-me";
const POSTER_DESKTOP_MQ = "(min-width: 1100px)";

function isPosterDesktopLayout() {
  return typeof window.matchMedia === "function" && window.matchMedia(POSTER_DESKTOP_MQ).matches;
}

function hrefPointsToHomeDiconoDiMe(href) {
  if (!href) return false;
  if (href === DICONO_DI_ME_HASH) return true;
  try {
    const abs = new URL(href, window.location.href);
    if (abs.hash !== DICONO_DI_ME_HASH) return false;
    const parts = abs.pathname.replace(/\\/g, "/").split("/").filter(Boolean);
    const file = parts.length ? parts[parts.length - 1] : "";
    return file === "" || file === "index.html";
  } catch {
    return false;
  }
}

let feedbackHighlightTimer = null;

function focusDiconoDiMeSection() {
  const panel = qs(DICONO_DI_ME_HASH);
  if (!(panel instanceof HTMLElement)) return;

  const scrollable = panel.querySelector(".poster__feedback");
  const motion = prefersReducedMotion() ? "auto" : "smooth";

  if (isPosterDesktopLayout()) {
    if (scrollable instanceof HTMLElement) {
      scrollable.scrollTo({ top: 0, behavior: motion });
    }
    const header = qs(".site-header--poster") || qs(".site-header");
    const headerBottom =
      header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
    const rect = panel.getBoundingClientRect();
    const partlyHidden = rect.top < headerBottom - 4 || rect.bottom > window.innerHeight + 4;
    if (partlyHidden) {
      panel.scrollIntoView({ behavior: motion, block: "nearest" });
    }
  } else {
    panel.scrollIntoView({ behavior: motion, block: "start" });
    if (scrollable instanceof HTMLElement) {
      scrollable.scrollTop = 0;
    }
  }

  panel.classList.remove("is-feedback-highlight");
  void panel.offsetWidth;
  panel.classList.add("is-feedback-highlight");
  if (feedbackHighlightTimer != null) {
    clearTimeout(feedbackHighlightTimer);
  }
  feedbackHighlightTimer = window.setTimeout(() => {
    panel.classList.remove("is-feedback-highlight");
    feedbackHighlightTimer = null;
  }, 2400);
}

function goToDiconoDiMeSection() {
  closeMobileNavMenu();
  try {
    history.pushState(null, "", DICONO_DI_ME_HASH);
  } catch {
    /* ignore */
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      focusDiconoDiMeSection();
    });
  });
}

function setupDiconoDiMeFocus() {
  if (!qs(DICONO_DI_ME_HASH)) return;

  qsa('a[href="#dicono-di-me"], a[href*="#dicono-di-me"]').forEach((el) => {
    if (!(el instanceof HTMLAnchorElement)) return;
    if (!hrefPointsToHomeDiconoDiMe(el.getAttribute("href"))) return;

    el.addEventListener("click", (e) => {
      if (!qs(DICONO_DI_ME_HASH)) return;
      e.preventDefault();
      goToDiconoDiMeSection();
    });
  });

  const clearDiconoFocusRingOnLoad = () => {
    const panel = qs(DICONO_DI_ME_HASH);
    if (panel instanceof HTMLElement && document.activeElement === panel) {
      panel.blur();
    }
  };

  window.addEventListener("load", clearDiconoFocusRingOnLoad, { passive: true });
  window.addEventListener("pageshow", clearDiconoFocusRingOnLoad, { passive: true });
  window.requestAnimationFrame(clearDiconoFocusRingOnLoad);
}

function setupProvaGratisChemistry() {
  const anchors = qsa("[data-prova-gratis]");
  if (anchors.length === 0) return;

  const announceRoot = qs("#chemistryAnnounce");
  const backdropEl = qs("#chemistryBackdrop");
  let announceTimer = null;
  /** @type {null | (() => void)} */
  let announceRepositionCleanup = null;

  const stripAnnounceLayout = () => {
    if (!(announceRoot instanceof HTMLElement)) return;
    announceRoot.style.top = "";
    announceRoot.style.left = "";
    announceRoot.style.width = "";
    announceRoot.style.maxWidth = "";
  };

  const attachAnnounceReposition = () => {
    if (typeof announceRepositionCleanup === "function") {
      announceRepositionCleanup();
      announceRepositionCleanup = null;
    }
    const onMove = () => {
      window.requestAnimationFrame(() => positionAnnounceAboveAgenda());
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    announceRepositionCleanup = () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  };

  const detachAnnounceReposition = () => {
    if (typeof announceRepositionCleanup === "function") {
      announceRepositionCleanup();
      announceRepositionCleanup = null;
    }
    stripAnnounceLayout();
  };

  const positionAnnounceAboveAgenda = () => {
    if (!(announceRoot instanceof HTMLElement) || announceRoot.hidden) return;
    const agenda = qs("#agenda");
    if (!(agenda instanceof HTMLElement)) return;

    const rect = agenda.getBoundingClientRect();
    const gap = 12;
    const pad = 16;
    const maxW = Math.min(420, Math.max(220, rect.width), window.innerWidth - pad * 2);

    const header = qs(".site-header--poster");
    const headerBottom =
      header instanceof HTMLElement ? header.getBoundingClientRect().bottom + 8 : 72;

    announceRoot.style.left = `${rect.left + rect.width / 2}px`;
    announceRoot.style.right = "auto";
    announceRoot.style.width = `${maxW}px`;
    announceRoot.style.maxWidth = `${maxW}px`;

    const h = announceRoot.offsetHeight;
    let top = rect.top - gap - h;
    if (top < headerBottom) {
      top = headerBottom;
    }
    announceRoot.style.top = `${top}px`;
  };

  const hideAnnounce = () => {
    detachAnnounceReposition();
    if (backdropEl instanceof HTMLElement) {
      backdropEl.hidden = true;
    }
    if (!(announceRoot instanceof HTMLElement)) return;
    announceRoot.hidden = true;
    announceRoot.replaceChildren();
    if (announceTimer != null) {
      clearTimeout(announceTimer);
      announceTimer = null;
    }
  };

  const showAnnounce = () => {
    if (!(announceRoot instanceof HTMLElement)) return;
    if (announceTimer != null) {
      clearTimeout(announceTimer);
      announceTimer = null;
    }
    detachAnnounceReposition();
    announceRoot.replaceChildren();
    announceRoot.hidden = false;

    const strong = document.createElement("strong");
    strong.textContent = "Incontro conoscitivo gratuito";

    const sub = document.createElement("span");
    sub.className = "chemistry-announce__sub";
    const emMins = document.createElement("span");
    emMins.className = "chemistry-announce__em";
    emMins.textContent = "30 minuti";
    sub.append(
      document.createTextNode("Circa "),
      emMins,
      document.createTextNode(", su appuntamento: ci conosciamo."),
      document.createElement("br"),
      document.createTextNode("\u00A0")
    );

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chemistry-announce__close";
    btn.setAttribute("aria-label", "Chiudi avviso");
    btn.textContent = "×";
    btn.addEventListener("click", hideAnnounce);

    announceRoot.append(strong, sub, btn);

    if (backdropEl instanceof HTMLElement) {
      backdropEl.hidden = false;
    }

    attachAnnounceReposition();
    window.requestAnimationFrame(() => {
      positionAnnounceAboveAgenda();
      window.requestAnimationFrame(() => positionAnnounceAboveAgenda());
    });

    announceTimer = window.setTimeout(hideAnnounce, 8000);
  };

  const focusChemistrySection = () => {
    const agenda = qs("#agenda");
    if (!(agenda instanceof HTMLElement)) return;
    agenda.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    agenda.classList.remove("is-chemistry-highlight");
    void agenda.offsetWidth;
    agenda.classList.add("is-chemistry-highlight");
    window.setTimeout(() => agenda.classList.remove("is-chemistry-highlight"), 2400);
    agenda.focus({ preventScroll: true });
  };

  const hrefPointsToHomeAgenda = (href) => {
    if (!href) return false;
    if (href === "#agenda") return true;
    try {
      const abs = new URL(href, window.location.href);
      if (abs.hash !== "#agenda") return false;
      const parts = abs.pathname.replace(/\\/g, "/").split("/").filter(Boolean);
      const file = parts.length ? parts[parts.length - 1] : "";
      return file === "" || file === "index.html";
    } catch {
      return false;
    }
  };

  const runAnnounceThenChemistry = () => {
    closeMobileNavMenu();
    try {
      history.pushState(null, "", "#agenda");
    } catch {
      /* ignore */
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        focusChemistrySection();
        showAnnounce();
      });
    });
  };

  anchors.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!hrefPointsToHomeAgenda(href)) return;

      if (!qs("#agenda")) {
        e.preventDefault();
        try {
          sessionStorage.setItem(CHEMISTRY_ANNOUNCE_KEY, "1");
        } catch {
          /* ignore */
        }
        window.location.assign(a.href);
        return;
      }

      e.preventDefault();
      runAnnounceThenChemistry();
    });
  });

  try {
    if (sessionStorage.getItem(CHEMISTRY_ANNOUNCE_KEY) === "1") {
      sessionStorage.removeItem(CHEMISTRY_ANNOUNCE_KEY);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          focusChemistrySection();
          showAnnounce();
        });
      });
    }
  } catch {
    /* ignore */
  }

  if (backdropEl instanceof HTMLElement) {
    backdropEl.addEventListener("click", hideAnnounce);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!(announceRoot instanceof HTMLElement) || announceRoot.hidden) return;
    hideAnnounce();
  });
}

function setupYear() {
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

const navSheetMq = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1099px)").matches;

function placeNavMenuForViewport() {
  const menu = qs("#navMenu");
  const nav = qs(".site-header--poster .nav") || qs(".site-header .nav");
  const backdrop = qs("[data-nav-backdrop]");
  if (!menu || !nav) return;

  if (navSheetMq()) {
    menu.classList.add("nav__menu--portal");
    if (backdrop instanceof HTMLElement && menu.previousElementSibling !== backdrop) {
      backdrop.insertAdjacentElement("afterend", menu);
    }
  } else {
    menu.classList.remove("nav__menu--portal");
    if (!nav.contains(menu)) {
      nav.appendChild(menu);
    }
    if (backdrop instanceof HTMLElement) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    menu.dataset.state = "closed";
    document.body.classList.remove("nav-sheet-open");
    forceReleaseSiteScrollLock();
  }
}

function setupMobileNav() {
  const toggle = qs(".nav__toggle");
  const menu = qs("#navMenu");
  const backdrop = qs("[data-nav-backdrop]");
  const toggleLabel = qs("[data-nav-toggle-label]", toggle || document);
  if (!toggle || !menu) return;

  const setState = (open) => {
    if (!navSheetMq()) {
      open = false;
    }
    menu.dataset.state = open ? "open" : "closed";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Chiudi il menu di navigazione" : "Apri il menu di navigazione");
    if (toggleLabel) toggleLabel.textContent = open ? "Chiudi" : "Menu";
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
    document.body.classList.toggle("nav-sheet-open", open);
    if (open) {
      siteScrollLockY = window.scrollY;
      lockSiteScroll();
    } else if (qsa("dialog[open]").length === 0) {
      unlockSiteScroll();
    }
  };

  const scrollToMenuTarget = (href) => {
    if (!href || href === "#") return;
    const pageName = (path) => {
      const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
      return parts.length ? parts[parts.length - 1] : "index.html";
    };
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || pageName(url.pathname) !== pageName(window.location.pathname)) {
        window.location.assign(url.href);
        return;
      }
      if (url.hash) {
        const target = qs(url.hash);
        try {
          history.pushState(null, "", url.hash);
        } catch {
          /* ignore */
        }
        if (url.hash === DICONO_DI_ME_HASH && target instanceof HTMLElement) {
          focusDiconoDiMeSection();
          return;
        }
        if (target instanceof HTMLElement) {
          target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        }
      }
    } catch {
      const target = qs(href.startsWith("#") ? href : `#${href}`);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }
    }
  };

  closeMobileNavMenu = () => {
    if (menu.dataset.state === "open") setState(false);
  };

  placeNavMenuForViewport();
  if (typeof window.matchMedia === "function") {
    window.matchMedia("(max-width: 1099px)").addEventListener("change", () => {
      closeMobileNavMenu();
      placeNavMenuForViewport();
    });
  }

  setState(false);

  toggle.addEventListener("click", () => {
    if (!navSheetMq()) return;
    const isOpen = menu.dataset.state === "open";
    setState(!isOpen);
  });

  if (backdrop) {
    backdrop.addEventListener("click", () => setState(false));
  }

  qsa("a[href]", menu).forEach((el) => {
    if (!(el instanceof HTMLAnchorElement)) return;
    el.addEventListener("click", (event) => {
      event.preventDefault();
      const href = el.getAttribute("href") || "";
      setState(false);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToMenuTarget(href);
        });
      });
    });
  });

  qsa("button", menu).forEach((btn) => {
    btn.addEventListener("click", () => setState(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setState(false);
  });

  window.addEventListener(
    "hashchange",
    () => {
      closeMobileNavMenu();
      if (qsa("dialog[open]").length === 0) {
        forceReleaseSiteScrollLock();
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted) {
        closeMobileNavMenu();
        forceReleaseSiteScrollLock();
      }
    },
    { passive: true }
  );
}

function setupReveal() {
  const items = qsa(".reveal");
  if (items.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  items.forEach((el) => io.observe(el));
}

function setupHeroLifeCarousel() {
  const root = qs("[data-hero-life-carousel]");
  const track = root ? qs("[data-hero-life-track]", root) : null;
  const viewport = root ? qs(".hero-life-carousel__viewport", root) : null;
  const prevBtn = root ? qs("[data-hero-life-prev]", root) : null;
  const nextBtn = root ? qs("[data-hero-life-next]", root) : null;
  if (!root || !track || !viewport || !prevBtn || !nextBtn) return;

  const originals = qsa(".hero-life-carousel__slide", track);
  const n = originals.length;
  if (n === 0) return;

  /** Transform sul track: con il viewport in flex column `scrollLeft` spesso resta 0 (track stirato → niente overflow). */
  track.style.transform = "translate3d(0px, 0px, 0px)";
  track.style.transition = "none";

  let timerId = null;
  const AUTO_MS = 3200;
  const TX_MS = 520;
  const TX_EASE = "cubic-bezier(0.45, 0, 0.22, 1)";

  const prefersReduced =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Indici su strip [clone ultima | …originali… | clone prima]; reali 1…n, clone sinistra 0, clone destra n+1 */
  let index = 1;
  let items = originals;

  const slidePx = () =>
    Math.max(1, Math.round(viewport.clientWidth || viewport.offsetWidth || root.clientWidth || 1));

  const applyLayout = () => {
    const w = slidePx();
    items.forEach((el) => {
      el.style.flex = `0 0 ${w}px`;
      el.style.width = `${w}px`;
      el.style.minWidth = `${w}px`;
      el.style.maxWidth = `${w}px`;
    });
  };

  const logicalSlideIndex = () => {
    if (index === 0) return n - 1;
    if (index === n + 1) return 0;
    return index - 1;
  };

  const updateAria = () => {
    root.setAttribute(
      "aria-label",
      `Carosello: immagine ${logicalSlideIndex() + 1} di ${n} (foto dalla vita e anteprima del sito)`
    );
  };

  const scrollToIndex = (instant) => {
    applyLayout();
    void viewport.offsetWidth;
    const w = slidePx();
    const x = -Math.round(index * w);
    const instantMove = instant || prefersReduced;
    track.style.transition = instantMove ? "none" : `transform ${TX_MS}ms ${TX_EASE}`;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
    viewport.scrollLeft = 0;
    updateAria();
  };

  const snapAfterCloneEdge = () => {
    track.style.transition = "none";
    applyLayout();
    const w = slidePx();
    if (index === 0) {
      index = n;
    } else if (index === n + 1) {
      index = 1;
    }
    track.style.transform = `translate3d(${-Math.round(index * w)}px, 0, 0)`;
    void track.offsetWidth;
    track.style.transition = prefersReduced ? "none" : `transform ${TX_MS}ms ${TX_EASE}`;
    updateAria();
  };

  const onTrackTransitionEnd = (e) => {
    if (e.target !== track) return;
    if (e.propertyName !== "transform") return;
    if (prefersReduced) return;
    if (index === 0 || index === n + 1) {
      snapAfterCloneEdge();
    }
  };

  const clearAutoplay = () => {
    if (timerId != null) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const restartAutoplay = () => {
    clearAutoplay();
    startAutoplay();
  };

  const startAutoplay = () => {
    clearAutoplay();
    if (n <= 1) return;
    timerId = window.setInterval(() => {
      go(1);
    }, AUTO_MS);
  };

  const go = (delta) => {
    if (n <= 1) return;
    const next = index + delta;
    if (next < 0 || next > n + 1) return;
    index = next;
    scrollToIndex(prefersReduced);
    restartAutoplay();
  };

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  });

  prevBtn.addEventListener("mouseenter", clearAutoplay);
  prevBtn.addEventListener("mouseleave", startAutoplay);
  nextBtn.addEventListener("mouseenter", clearAutoplay);
  nextBtn.addEventListener("mouseleave", startAutoplay);

  root.addEventListener("focusin", clearAutoplay);
  root.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!root.contains(document.activeElement)) startAutoplay();
    }, 0);
  });

  prevBtn.disabled = false;
  nextBtn.disabled = false;

  const kick = () => {
    if (n <= 1) return;
    index = logicalSlideIndex() + 1;
    scrollToIndex(true);
  };

  const layoutSingle = () => {
    applyLayout();
    track.style.transition = "none";
    track.style.transform = "translate3d(0px, 0px, 0px)";
    viewport.scrollLeft = 0;
  };

  if (n <= 1) {
    root.setAttribute("aria-label", "Carosello: una immagine");
    layoutSingle();
    requestAnimationFrame(() => {
      requestAnimationFrame(layoutSingle);
    });
    window.addEventListener("load", layoutSingle, { passive: true });
    window.setTimeout(layoutSingle, 0);
    window.setTimeout(layoutSingle, 120);

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => layoutSingle());
      ro.observe(viewport);
    } else {
      let resizeT = null;
      window.addEventListener(
        "resize",
        () => {
          if (resizeT != null) window.clearTimeout(resizeT);
          resizeT = window.setTimeout(layoutSingle, 100);
        },
        { passive: true }
      );
    }
  } else {
    const cloneLast = originals[n - 1].cloneNode(true);
    const cloneFirst = originals[0].cloneNode(true);
    cloneLast.setAttribute("aria-hidden", "true");
    cloneFirst.setAttribute("aria-hidden", "true");
    track.insertBefore(cloneLast, originals[0]);
    track.appendChild(cloneFirst);
    items = qsa(".hero-life-carousel__slide", track);

    track.addEventListener("transitionend", onTrackTransitionEnd);

    index = 1;
    kick();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        kick();
        startAutoplay();
      });
    });

    window.addEventListener("load", kick, { passive: true });
    window.setTimeout(kick, 0);
    window.setTimeout(kick, 120);
    window.setTimeout(kick, 400);

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => kick());
      ro.observe(viewport);
    } else {
      let resizeT = null;
      window.addEventListener(
        "resize",
        () => {
          if (resizeT != null) window.clearTimeout(resizeT);
          resizeT = window.setTimeout(kick, 100);
        },
        { passive: true }
      );
    }
  }
}

function setupReviewsCarousel() {
  const root = qs("[data-carousel]");
  const track = qs("[data-carousel-track]");
  const prevBtn = qs("[data-carousel-prev]");
  const nextBtn = qs("[data-carousel-next]");
  if (!root || !track || !prevBtn || !nextBtn) return;

  const slides = qsa(".reviews-carousel__slide", track);
  const n = slides.length;
  if (n === 0) return;

  const isDesktopGrid =
    typeof window.matchMedia === "function" && window.matchMedia("(min-width: 980px)").matches;

  if (isDesktopGrid) {
    root.classList.add("reviews-carousel--grid");
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    track.style.transform = "none";
    return;
  }

  let index = 0;
  let timerId = null;
  const AUTO_MS = 9000;

  const prefersReduced =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setTransform = (instant) => {
    if (instant) {
      track.style.transition = "none";
    }
    track.style.transform = `translateX(-${index * 100}%)`;
    if (instant) {
      void track.offsetHeight;
      track.style.transition = "";
    }
    root.setAttribute("aria-label", `Recensioni dei clienti, ${index + 1} di ${n}`);
  };

  const go = (delta) => {
    if (n === 1) return;
    const next = (index + delta + n) % n;
    const wrapForward = delta === 1 && index === n - 1 && next === 0;
    const wrapBack = delta === -1 && index === 0 && next === n - 1;
    index = next;
    setTransform(wrapForward || wrapBack);
    restartAutoplay();
  };

  const clearAutoplay = () => {
    if (timerId != null) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const tickAutoplay = () => {
    if (n <= 1 || prefersReduced) return;
    go(1);
  };

  const startAutoplay = () => {
    clearAutoplay();
    if (n <= 1 || prefersReduced) return;
    timerId = window.setInterval(tickAutoplay, AUTO_MS);
  };

  const restartAutoplay = () => {
    clearAutoplay();
    startAutoplay();
  };

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  });

  root.addEventListener("mouseenter", clearAutoplay);
  root.addEventListener("mouseleave", startAutoplay);
  root.addEventListener("focusin", clearAutoplay);
  root.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!root.contains(document.activeElement)) startAutoplay();
    }, 0);
  });

  prevBtn.disabled = false;
  nextBtn.disabled = false;

  setTransform(false);
  startAutoplay();
}

function setupContactsPlaceholders() {
  const ig = qs("#instagramLink");
  const emailLink = qs("#emailLink");

  const WA_TEXT = encodeURIComponent("Ciao Francesco, ti scrivo dal sito (Mental Coach).");
  const MAIL_SUBJECT = encodeURIComponent("Contatto dal sito · Mental Coach");

  /** Numero WhatsApp (solo cifre, prefisso internazionale, senza +) in Base64 nell’HTML. */
  const decodeWaDigitsFromEl = (el) => {
    if (!(el instanceof Element)) return null;
    const b64 = el.getAttribute("data-wa-b64");
    if (!b64) return null;
    try {
      const digits = atob(b64.trim()).replace(/\D/g, "");
      return digits.length >= 10 ? digits : null;
    } catch {
      return null;
    }
  };

  /** Email non in chiaro nell’HTML: solo Base64; al click si imposta mailto (client predefinito / Gmail / ecc.). */
  const decodeMailFromLink = () => {
    if (!emailLink) return null;
    const b64 = emailLink.getAttribute("data-mail-b64");
    if (!b64) return null;
    try {
      const mail = atob(b64.trim()).trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? mail : null;
    } catch {
      return null;
    }
  };

  const mailAddr = decodeMailFromLink();
  if (emailLink && mailAddr) {
    emailLink.addEventListener("click", function () {
      this.href = `mailto:${mailAddr}?subject=${MAIL_SUBJECT}`;
    });
  }

  qsa("a[data-wa-b64]").forEach((link) => {
    const digits = decodeWaDigitsFromEl(link);
    if (digits) {
      link.href = `https://wa.me/${digits}?text=${WA_TEXT}`;
    }
  });

  const preventIfPlaceholder = (a) => {
    if (!a) return;
    a.addEventListener("click", (e) => {
      if (a.getAttribute("href") === "#") e.preventDefault();
    });
  };

  preventIfPlaceholder(ig);
  if (!mailAddr) preventIfPlaceholder(emailLink);
  qsa("a[data-wa-b64]").forEach((link) => {
    if (!decodeWaDigitsFromEl(link)) preventIfPlaceholder(link);
  });
}

function setupProgressBars() {
  const items = qsa("[data-progress]");
  if (items.length === 0) return;

  const prefersReduced =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  items.forEach((el) => {
    const from = Number(el.getAttribute("data-from") || "0");
    const to = Number(el.getAttribute("data-to") || "0");
    const max = Number(el.getAttribute("data-max") || "10") || 10;

    const safeFrom = clamp(from, 0, max);
    const safeTo = clamp(to, 0, max);
    const pct = (safeTo / max) * 100;

    const fill = el.querySelector(".progress-bar__fill");
    if (!(fill instanceof HTMLElement)) return;

    if (prefersReduced) {
      fill.style.transition = "none";
      fill.style.width = `${pct}%`;
      return;
    }

    // Animate once when visible
    if (!("IntersectionObserver" in window)) {
      fill.style.width = `${pct}%`;
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          fill.style.width = `${pct}%`;
          io.disconnect();
        });
      },
      { threshold: 0.25 }
    );

    io.observe(el);
  });
}

setupYear();
setupMobileNav();
setupLogoStory();
setupCoachWhat();
setupCoachAudience();
setupProvaGratisChemistry();
setupDiconoDiMeFocus();
setupReveal();
setupHeroLifeCarousel();
setupReviewsCarousel();
setupContactsPlaceholders();
// Google Calendar embed: lo stile è gestito con la sezione chiara dedicata.
setupProgressBars();

