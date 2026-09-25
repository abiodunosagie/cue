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

// Share of change-check cells under which two screens are the same tab.
const SAME_SCREEN = 0.25;
// Most screens gathered for one question. The solve adds the screen in front
// of the candidate on top, so a full bundle still sees what they see now.
const MAX_SCREENS = 16;

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
      if (i >= 0) replace.set(i, page);
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
  // on the ones the newest add() read.
  function labelled() {
    const viewIds = [...new Set(screens.map((s) => s.view))];
    return screens.map((s) => {
      const inView = screens.filter((o) => o.view === s.view);
      const v = viewIds.indexOf(s.view) + 1;
      const label = `View ${v} of ${viewIds.length}` + (inView.length > 1 ? `, page ${inView.indexOf(s) + 1} of ${inView.length}` : '') +
        (latest.has(s) ? ', on screen now' : '');
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
