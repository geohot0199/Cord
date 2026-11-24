/* Nūs marketing site — no dependencies, no trackers. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── year ── */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ── sticky header shade ── */
  const top = $("#top");
  const onScroll = () => top.classList.toggle("is-stuck", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ── mobile nav ── */
  const burger = $("#burger");
  const mobileNav = $("#mobileNav");
  const closeNav = () => {
    burger.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    mobileNav.hidden = true;
  };
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open));
    mobileNav.hidden = open;
    mobileNav.classList.toggle("is-open", !open);
  });
  $$("a", mobileNav).forEach((a) => a.addEventListener("click", closeNav));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
      closeNav();
      burger.focus();
    }
  });

  /* ── reveal on scroll ── */
  const revealables = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealables.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
      io.observe(el);
    });
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  /* ── the Knot demo: fly to the Import button, ring it ── */
  const knot = $("#knot");
  const demoBtn = $("#demoBtn");
  const demoBody = knot ? knot.closest(".demo__body") : null;
  let demoTimer = 0;

  function runDemo() {
    if (!knot || !demoBtn || !demoBody) return;
    clearTimeout(demoTimer);
    demoBtn.classList.remove("is-lit");
    knot.classList.remove("is-on-target");
    knot.style.transition = "none";
    knot.style.transform = "translate(-16px, 150px)";
    // force reflow so the next transition runs
    void knot.offsetWidth;
    knot.style.transition = "";

    const place = () => {
      const b = demoBtn.getBoundingClientRect();
      const box = demoBody.getBoundingClientRect();
      const x = b.left - box.left + b.width / 2 - 13;
      const y = b.top - box.top + b.height / 2 - 13;
      knot.style.transform = `translate(${x}px, ${y}px)`;
      demoTimer = window.setTimeout(() => {
        knot.classList.add("is-on-target");
        demoBtn.classList.add("is-lit");
      }, reduced ? 0 : 1250);
    };
    demoTimer = window.setTimeout(place, reduced ? 0 : 60);
  }

  if (knot) {
    if ("IntersectionObserver" in window) {
      const seen = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              runDemo();
              seen.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      seen.observe(demoBody);
    } else {
      runDemo();
    }
    let rt = 0;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = window.setTimeout(runDemo, 180);
    });
  }
  const replay = $("#replayDemo");
  if (replay) replay.addEventListener("click", runDemo);

  /* ── setup tabs ── */
  const tabs = $$(".tab");
  function selectTab(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", String(on));
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  /* ── setup steps drive the stage panes ── */
  $$(".setup").forEach((group) => {
    const steps = $$(".setup__step", group);
    const panes = $$(".pane", group);
    const activate = (step) => {
      steps.forEach((s) => s.classList.toggle("is-on", s === step));
      const name = step.dataset.pane;
      panes.forEach((p) => p.classList.toggle("is-on", p.dataset.pane === name));
    };
    steps.forEach((step) => {
      step.addEventListener("click", () => activate(step));
      step.addEventListener("mouseenter", () => activate(step));
      step.addEventListener("focusin", () => activate(step));
      step.tabIndex = 0;
      step.setAttribute("role", "button");
      step.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(step);
        }
      });
    });
  });

  /* ── FAQ: search + tags ── */
  const faqItems = $$("#faqList details");
  const faqSearch = $("#faqSearch");
  const faqTags = $$("#faqTags .tag");
  const faqCount = $("#faqCount");
  const faqEmpty = $("#faqEmpty");
  let activeTag = "all";

  function filterFaq() {
    const q = (faqSearch.value || "").trim().toLowerCase();
    let shown = 0;
    faqItems.forEach((item) => {
      const tags = (item.dataset.tags || "").split(/\s+/);
      const text = (item.textContent || "").toLowerCase();
      const matchTag = activeTag === "all" || tags.includes(activeTag);
      const matchText = !q || text.includes(q);
      const keep = matchTag && matchText;
      item.hidden = !keep;
      if (!keep) item.open = false;
      if (keep) shown += 1;
    });
    faqCount.textContent = shown === faqItems.length
      ? `${shown} questions`
      : `${shown} of ${faqItems.length} questions`;
    faqEmpty.hidden = shown !== 0;
  }

  if (faqSearch) {
    faqSearch.addEventListener("input", filterFaq);
  }
  faqTags.forEach((tag) => {
    tag.addEventListener("click", () => {
      activeTag = tag.dataset.tag;
      faqTags.forEach((t) => t.classList.toggle("is-on", t === tag));
      filterFaq();
    });
  });

  /* keep only one answer open at a time on phones */
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open || window.innerWidth > 760) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ── feedback form ── */
  const form = $("#feedbackForm");
  const state = $("#fbState");
  const copyBtn = $("#fbCopy");

  const noteText = () => {
    const kind = (form.querySelector('input[name="kind"]:checked') || {}).value || "Note";
    const text = $("#fbText").value.trim();
    const email = $("#fbEmail").value.trim();
    return `[${kind}] ${text}${email ? `\n\nReply to: ${email}` : ""}`;
  };

  const flash = (msg, good = true) => {
    state.textContent = msg;
    state.style.color = good ? "#6fd0b1" : "#f0a19a";
  };

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const honey = form.querySelector(".hp");
      if (honey && honey.value) return; // bot
      const text = $("#fbText").value.trim();
      const email = $("#fbEmail").value.trim();
      if (text.length < 4) {
        flash("Add a little more detail first.", false);
        $("#fbText").focus();
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        flash("That email doesn’t look right.", false);
        $("#fbEmail").focus();
        return;
      }
      /* No backend on a static site: hand the note to a mail draft the user sends. */
      const subject = encodeURIComponent(`Nūs ${noteText().match(/^\[(.*?)\]/)[1]} feedback`);
      const body = encodeURIComponent(noteText());
      flash("Opening your email app…");
      window.location.href = `mailto:pranavfromthegrowth@gmail.com?subject=${subject}&body=${body}`;
      window.setTimeout(() => {
        flash("If nothing opened, use Copy note instead.");
      }, 1200);
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const text = $("#fbText").value.trim();
      if (text.length < 4) {
        flash("Nothing to copy yet.", false);
        $("#fbText").focus();
        return;
      }
      try {
        await navigator.clipboard.writeText(noteText());
        flash("Copied. Paste it anywhere you like.");
      } catch {
        flash("Couldn’t copy — select the text instead.", false);
      }
    });
  }
})();
