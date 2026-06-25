const faqItems = document.querySelectorAll(".faq-item");
const siteHeader = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const sideNavRail = document.querySelector(".side-nav-rail");
const sideNavLinks = Array.from(document.querySelectorAll(".side-nav-rail a"));
const heroVideo = document.querySelector(".hero-video");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const scrollNavThreshold = 120;

const getLinkSectionId = (link) => {
  const href = link.getAttribute("href") || "";
  if (href === "/" || href === "#home") return "home";
  return href.startsWith("#") ? href.slice(1) : "";
};

const sectionIds = Array.from(new Set([...navLinks, ...sideNavLinks].map(getLinkSectionId).filter(Boolean)));
const navSections = sectionIds
  .map((id) => ({ id, section: document.getElementById(id) }))
  .filter((item) => item.section);

let navTicking = false;

const setMobileNavOpen = (isOpen) => {
  if (!siteHeader || !navToggle) return;
  siteHeader.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
};

const setActiveNavLink = (activeId) => {
  navLinks.forEach((link) => {
    const linkId = getLinkSectionId(link);
    const isActive = linkId !== "home" && linkId === activeId;

    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", activeId === "home" ? "page" : "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  sideNavLinks.forEach((link) => {
    const linkId = getLinkSectionId(link);
    const isActive = linkId === activeId;

    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", activeId === "home" ? "page" : "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

const updateNavState = () => {
  navTicking = false;
  const isScrolled = window.scrollY > scrollNavThreshold;

  if (siteHeader) {
    siteHeader.classList.toggle("is-scrolled", isScrolled);
  }

  if (sideNavRail) {
    sideNavRail.classList.toggle("is-visible", isScrolled);
  }

  const activeSection = navSections.reduce((current, item) => {
    const rect = item.section.getBoundingClientRect();
    if (rect.top <= 150 && rect.bottom > 150) {
      return item;
    }
    return current;
  }, navSections[0]);

  if (activeSection) {
    setActiveNavLink(activeSection.id);
  }
};

const requestNavUpdate = () => {
  if (navTicking) return;
  navTicking = true;
  requestAnimationFrame(updateNavState);
};

updateNavState();
window.addEventListener("scroll", requestNavUpdate, { passive: true });

if (heroVideo) {
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.loop = true;
  heroVideo.autoplay = true;
  heroVideo.playsInline = true;
  heroVideo.controls = false;
  heroVideo.removeAttribute("controls");
  heroVideo.setAttribute("playsinline", "");
  heroVideo.setAttribute("webkit-playsinline", "");
  heroVideo.setAttribute("preload", "auto");
  heroVideo.setAttribute("disablepictureinpicture", "");
  heroVideo.setAttribute("disableremoteplayback", "");
  heroVideo.setAttribute("controlslist", "nodownload noplaybackrate nofullscreen");

  const playHeroVideo = () => {
    const playRequest = heroVideo.play();
    if (playRequest?.catch) {
      playRequest.catch(() => undefined);
    }
  };

  if (heroVideo.readyState > 1) {
    playHeroVideo();
  } else {
    heroVideo.addEventListener("canplay", playHeroVideo, { once: true });
  }
}

if (navToggle) {
  navToggle.addEventListener("click", () => {
    setMobileNavOpen(!siteHeader?.classList.contains("nav-open"));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      setMobileNavOpen(false);
    }
  });
});

sideNavLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const sectionId = getLinkSectionId(link);
    if (!sectionId) return;

    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    event.preventDefault();
    targetSection.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
    window.history.pushState(null, "", `#${sectionId}`);
    setActiveNavLink(sectionId);
  });
});

const setFaqState = (item, expanded) => {
  const trigger = item.querySelector(".faq-trigger");
  const answer = item.querySelector(".faq-answer");

  if (!trigger || !answer) return;

  item.classList.toggle("is-open", expanded);
  trigger.setAttribute("aria-expanded", String(expanded));

  if (expanded) {
    answer.hidden = false;
    answer.style.maxHeight = `${answer.scrollHeight}px`;
    requestAnimationFrame(() => answer.classList.add("is-visible"));
    return;
  }

  answer.style.maxHeight = `${answer.scrollHeight}px`;
  answer.classList.remove("is-visible");
  requestAnimationFrame(() => {
    answer.style.maxHeight = "0px";
  });
};

faqItems.forEach((item) => {
  const trigger = item.querySelector(".faq-trigger");
  const answer = item.querySelector(".faq-answer");

  if (!trigger || !answer) return;

  if (item.classList.contains("is-open")) {
    answer.hidden = false;
    answer.classList.add("is-visible");
    answer.style.maxHeight = `${answer.scrollHeight}px`;
    trigger.setAttribute("aria-expanded", "true");
  }

  answer.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "max-height") return;
    if (!item.classList.contains("is-open")) {
      answer.hidden = true;
    }
  });

  trigger.addEventListener("click", () => {
    setFaqState(item, trigger.getAttribute("aria-expanded") !== "true");
  });
});

const revealItems = document.querySelectorAll(".reveal-on-scroll");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-revealed"));
}

window.addEventListener("resize", () => {
  if (!window.matchMedia("(max-width: 760px)").matches) {
    setMobileNavOpen(false);
  }

  faqItems.forEach((item) => {
    if (!item.classList.contains("is-open")) return;
    const answer = item.querySelector(".faq-answer");
    if (answer) {
      answer.style.maxHeight = `${answer.scrollHeight}px`;
    }
  });
});
