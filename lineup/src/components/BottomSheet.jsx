import { useCallback, useEffect, useRef, useState } from 'react';

// Draggable bottom sheet with two snap points (peek / expanded).
// - Drag the handle up/down to move it (follows your finger).
// - A quick flick snaps in that direction; a slow drag snaps to the nearest.
// - Tapping the handle toggles open/closed (reliable even if a drag misfires).
// Robust on iOS: resets cleanly on pointercancel/lost-capture so it can't
// get "stuck" when the system interrupts a touch.
export default function BottomSheet({ peekHeight = 340, header, children }) {
  const EXPANDED_TOP = 72; // px from top when fully open
  const collapsedTop = useCallback(
    () => Math.max(EXPANDED_TOP + 40, window.innerHeight - peekHeight),
    [peekHeight]
  );

  const [top, setTop] = useState(() => collapsedTop());
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  // Keep the sheet snapped correctly across viewport / orientation changes.
  useEffect(() => {
    const onResize = () => setTop(expanded ? EXPANDED_TOP : collapsedTop());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [expanded, collapsedTop]);

  const snapTo = useCallback(
    (open) => {
      setExpanded(open);
      setTop(open ? EXPANDED_TOP : collapsedTop());
    },
    [collapsedTop]
  );

  const onPointerDown = (e) => {
    drag.current = { startY: e.clientY, startTop: top, lastY: e.clientY, lastT: e.timeStamp, vy: 0, moved: false };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older WebViews */
    }
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 3) d.moved = true;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.vy = (e.clientY - d.lastY) / dt; // px per ms
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    setTop(Math.min(collapsedTop(), Math.max(EXPANDED_TOP, d.startTop + dy)));
  };

  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (!d.moved) return snapTo(!expanded); // tap toggles
    const mid = (EXPANDED_TOP + collapsedTop()) / 2;
    let open;
    if (d.vy < -0.4) open = true; // flick up
    else if (d.vy > 0.4) open = false; // flick down
    else open = top < mid; // nearest snap
    snapTo(open);
  };

  return (
    <div
      className="fixed inset-x-0 z-30 mx-auto flex max-w-md flex-col rounded-t-3xl bg-canvas shadow-sheet"
      style={{
        top,
        bottom: 0,
        transition: dragging ? 'none' : 'top 0.32s cubic-bezier(0.16,1,0.3,1)',
        willChange: 'top',
      }}
    >
      {/* Drag zone — the handle AND the header (title/count) so there's a big,
          easy target to pull the sheet up. touch-none keeps iOS from stealing
          the gesture for scrolling. The list below scrolls on its own. */}
      <div
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        role="button"
        aria-label={expanded ? 'Collapse list' : 'Expand list'}
      >
        <div className="flex flex-col items-center pb-2 pt-3">
          <div className="h-1.5 w-11 rounded-full bg-black/20" />
        </div>
        {header ? <div className="px-4">{header}</div> : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">{children}</div>
    </div>
  );
}
