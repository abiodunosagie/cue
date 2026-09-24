// Moving cue with the keyboard: during a screen share the mouse pointer is
// always visible, and dragging an invisible window makes it wander across the
// screen for no visible reason. Arrow-key nudges leave the pointer where the
// candidate left it. Pure, so it is testable without a display.

const STEP_PX = 80;

// The next position after one nudge, kept fully inside the display's work area.
function nudge(bounds, workArea, direction, step = STEP_PX) {
  const d = { left: [-step, 0], right: [step, 0], up: [0, -step], down: [0, step] }[direction];
  if (!d) return { x: bounds.x, y: bounds.y };
  const maxX = workArea.x + Math.max(0, workArea.width - bounds.width);
  const maxY = workArea.y + Math.max(0, workArea.height - bounds.height);
  return {
    x: Math.min(maxX, Math.max(workArea.x, bounds.x + d[0])),
    y: Math.min(maxY, Math.max(workArea.y, bounds.y + d[1]))
  };
}

module.exports = { nudge, STEP_PX };
