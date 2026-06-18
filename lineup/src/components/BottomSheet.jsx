import { useEffect, useRef, useState } from 'react';

// Draggable bottom sheet with two snap points (peek / expanded). Drag the
// handle to move between them; content scrolls when expanded.
export default function BottomSheet({ peekHeight = 320, children }) {
  const expandedTop = 88; // px from top when fully open
  const collapsedTop = () => window.innerHeight - peekHeight;

  const [top, setTop] = useState(collapsedTop());
  const [expanded, setExpanded] = useState(false);
  const drag = useRef(null);

  useEffect(() => {
    const onResize = () => setTop(expanded ? expandedTop : collapsedTop());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const onPointerDown = (e) => {
    drag.current = { startY: e.clientY, startTop: top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const next = Math.min(
      collapsedTop(),
      Math.max(expandedTop, drag.current.startTop + (e.clientY - drag.current.startY))
    );
    setTop(next);
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const mid = (expandedTop + collapsedTop()) / 2;
    const open = top < mid;
    setExpanded(open);
    setTop(open ? expandedTop : collapsedTop());
    drag.current = null;
  };

  return (
    <div
      className="fixed inset-x-0 z-30 mx-auto flex max-w-md flex-col rounded-t-3xl bg-canvas shadow-sheet"
      style={{ top, bottom: 0, transition: drag.current ? 'none' : 'top 0.28s cubic-bezier(0.16,1,0.3,1)' }}
    >
      <div
        className="flex cursor-grab touch-none flex-col items-center pt-2.5 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="h-1.5 w-10 rounded-full bg-black/15" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">{children}</div>
    </div>
  );
}
