// The question bundle: every screen seen for the coding question in front of
// the candidate, across its tabs (instructions, tests, the file to edit), so a
// solve reads them all as one task instead of only the tab open at Cmd+H.
//
// Screens are kept in the order first seen, grouped by the view (one Cmd+H or
// gather) that read them. A screen that looks like one already kept is the
// same tab seen again, usually the editor after more typing: it replaces the
// old copy in place, so the bundle holds each tab's newest state once.
//
// It lives in memory only (never on disk) and is cleared by Next question,
// Clear interview and a restart.

const { changedShare } = require('./screen-watch');

// Share of change-check cells under which two screens are the same tab. Low
// on purpose: a tab switch inside a narrow pane changes a small part of the
// whole screen, and replacing a different tab loses it, while two copies of
// one tab (the editor after a lot of typing) only cost a few tokens.
const SAME_SCREEN = 0.12;
// Most screens kept for one question: one full read (src/scroll-reader.js
// MAX_PAGES). A solve past it still sends the screens it just read on top.
const MAX_SCREENS = 24;

function createQuestionBundle({ maxScreens = MAX_SCREENS, sameScreen = SAME_SCREEN } = {}) {
  let screens = []; // { thumb, image, view }
  let views = 0;
  let latest = new Set(); // the screens the newest add() read: what is on screen now

  // Adds one view's pages ({ thumb, image }). Returns { ok, added, replaced },
  // or { ok: false } when the new screens would pass the cap (nothing changes:
  // a view is kept whole or not at all).
  function add(pages) {
    const fresh = [];
    const replace = new Map(); // index in screens -> page
    for (const page of pages) {
      const i = screens.findIndex((s) => changedShare(s.thumb, page.thumb) < sameScreen);
      // Two new pages like one kept screen: the first replaces it, the next is new.
      if (i >= 0 && !replace.has(i)) replace.set(i, page);
      else if (!fresh.some((f) => changedShare(f.thumb, page.thumb) < sameScreen)) fresh.push(page);
    }
    if (screens.length + fresh.length > maxScreens) return { ok: false, added: 0, replaced: 0 };
    if (fresh.length) views++;
    latest = new Set();
    for (const [i, page] of replace) { screens[i] = { ...page, view: screens[i].view }; latest.add(screens[i]); }
    for (const page of fresh) { const s = { ...page, view: views }; screens.push(s); latest.add(s); }
    return { ok: true, added: fresh.length, replaced: replace.size };
  }

  // The screens with their labels, in the order first seen: "View 2 of 3,
  // page 1 of 4" (or "View 2 of 3" for a one-page view), and ", on screen now"
  // on the ones the newest add() read. `extra`: pages add() refused (a full
  // bundle), sent anyway as one last view that is the one on screen now.
  function labelled(extra = []) {
    const extraView = Symbol('extra');
    const all = [...screens, ...extra.map((p) => ({ ...p, view: extraView }))];
    const onScreen = extra.length ? new Set(all.filter((s) => s.view === extraView)) : latest;
    const viewIds = [...new Set(all.map((s) => s.view))];
    return all.map((s) => {
      const inView = all.filter((o) => o.view === s.view);
      const v = viewIds.indexOf(s.view) + 1;
      const label = `View ${v} of ${viewIds.length}` + (inView.length > 1 ? `, page ${inView.indexOf(s) + 1} of ${inView.length}` : '') +
        (onScreen.has(s) ? ', on screen now' : '');
      return { image: s.image, label };
    });
  }

  function clear() { screens = []; views = 0; latest = new Set(); }

  return {
    add,
    labelled,
    clear,
    count: () => screens.length,
    viewCount: () => new Set(screens.map((s) => s.view)).size
  };
}

module.exports = { createQuestionBundle, MAX_SCREENS, SAME_SCREEN };
