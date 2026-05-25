const faqItems = document.querySelectorAll(".faq-item");
const siteHeader = document.querySelector(".site-header");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const navSections = navLinks
  .map((link) => {
    const href = link.getAttribute("href") || "";
    const id = href === "/" ? "home" : href.startsWith("#") ? href.slice(1) : "";
    return id ? { id, link, section: document.getElementById(id) } : null;
  })
  .filter((item) => item && item.section);

let navTicking = false;

const setActiveNavLink = (activeId) => {
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const linkId = href === "/" ? "home" : href.startsWith("#") ? href.slice(1) : "";
    const isActive = linkId !== "home" && linkId === activeId;

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

  if (siteHeader) {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 80);
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
  faqItems.forEach((item) => {
    if (!item.classList.contains("is-open")) return;
    const answer = item.querySelector(".faq-answer");
    if (answer) {
      answer.style.maxHeight = `${answer.scrollHeight}px`;
    }
  });
});
