document.addEventListener("DOMContentLoaded", () => {
  const article = document.querySelector(".post-content");
  if (!article) return;

  const refs = [...article.querySelectorAll(
    'a.footnote[href^="#"]'
  )];

  if (!refs.length) return;

  const wide = matchMedia("(min-width: 960px)");
  const hover = matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  // Create one reusable desktop panel.
  const dock = document.createElement("aside");
  dock.id = "fn-dock";
  dock.className = "fn-dock";
  dock.setAttribute("aria-label", "Footnote");
  dock.setAttribute("aria-hidden", "true");
  dock.inert = true;

  dock.innerHTML = `
    <div class="fn-dock-header">
      <span class="fn-dock-number"></span>
      <button class="fn-dock-close"
              type="button"
              aria-label="Close footnote">×</button>
    </div>
    <div class="fn-dock-content"></div>
  `;

  document.body.append(dock);

  const number = dock.querySelector(".fn-dock-number");
  const body = dock.querySelector(".fn-dock-content");

  let active = null;
  let inline = null;

  // The original endnote remains our source of truth.
  function copyNote(ref) {
    const hash = ref.getAttribute("href").slice(1);
    const source = document.getElementById(
      decodeURIComponent(hash)
    );

    if (!source) return null;

    const copy = document.createElement("div");

    for (const node of source.childNodes) {
      copy.append(node.cloneNode(true));
    }

    copy.querySelectorAll(
      '.reversefootnote, [role="doc-backlink"]'
    ).forEach(el => el.remove());

    // Prevent duplicated IDs in the document.
    copy.querySelectorAll("[id]").forEach(
      el => el.removeAttribute("id")
    );

    return copy;
  }

  function closeNote() {
    inline?.remove();
    inline = null;

    dock.classList.remove("is-open");
    dock.inert = true;
    dock.setAttribute("aria-hidden", "true");

    if (active) {
      active.setAttribute("aria-expanded", "false");
      active.removeAttribute("aria-controls");
    }

    active = null;
  }

  function openNote(ref) {
    const content = copyNote(ref);
    if (!content) return;

    const replacing = dock.classList.contains("is-open");
    closeNote();

    active = ref;
    ref.setAttribute("aria-expanded", "true");

    if (wide.matches) {
      // Desktop: fixed floating panel.
      ref.setAttribute("aria-controls", dock.id);

      number.textContent = ref.textContent.trim();
      body.replaceChildren(...content.childNodes);

      dock.inert = false;
      dock.setAttribute("aria-hidden", "false");
      dock.classList.add("is-open");

      // Fade the new content in when switching notes.
      if (replacing && !reduced.matches) {
        body.animate(
          [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0)" }
          ],
          {
            duration: 240,
            easing: "ease-out"
          }
        );
      }

    } else {
      // Mobile: insert directly after the reference.
      inline = document.createElement("span");
      inline.className = "fn-inline";
      inline.id = `fn-inline-${refs.indexOf(ref)}`;

      const blocks = [...content.children];

      // Unwrap paragraphs to preserve valid inline HTML.
      if (blocks.length &&
          blocks.every(el => el.tagName === "P")) {
        blocks.forEach((p, i) => {
          if (i) inline.append(" ");
          inline.append(...p.childNodes);
        });
      } else {
        // Plain-text fallback for complex block notes.
        inline.textContent = content.textContent.trim();
      }

      const marker = ref.closest("sup") || ref;
      marker.after(inline);

      ref.setAttribute("aria-controls", inline.id);
    }
  }

  refs.forEach(ref => {
    ref.textContent = ref.textContent.trim().padStart(2, "0");
    ref.setAttribute("aria-expanded", "false");

    // Desktop hover, for devices with an actual pointer.
    ref.addEventListener("mouseenter", () => {
      if (wide.matches && hover.matches && active !== ref) {
        openNote(ref);
      }
    });

    // Click, tap and keyboard activation.
    ref.addEventListener("click", event => {
      if (!copyNote(ref)) return;

      event.preventDefault();

      if (active === ref) closeNote();
      else openNote(ref);
    });
  });

  dock.querySelector(".fn-dock-close")
    .addEventListener("click", () => {
      const trigger = active;
      closeNote();
      trigger?.focus();
    });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && active) {
      const trigger = active;
      closeNote();
      trigger.focus();
    }
  });

  // Dismiss when clicking outside the note.
  document.addEventListener("click", event => {
    if (!active || !(event.target instanceof Element)) return;

    if (!event.target.closest(
      "a.footnote, .fn-dock, .fn-inline"
    )) {
      closeNote();
    }
  });

  // Clear the previous presentation when resizing.
  wide.addEventListener("change", closeNote);
});