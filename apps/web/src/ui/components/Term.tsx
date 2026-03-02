import React from "react";

export function Term({ children, tip }: { children: React.ReactNode; tip: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const tipRef = React.useRef<HTMLSpanElement>(null);

  function reposition() {
    const el = tipRef.current;
    const wrap = ref.current;
    if (!el || !wrap) return;
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.bottom = "calc(100% + 6px)";
    el.style.top = "";

    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      const shift = rect.right - window.innerWidth + 8;
      el.style.left = `calc(50% - ${shift}px)`;
    }
    if (rect.left < 8) {
      el.style.left = `${-wrap.getBoundingClientRect().left + 8}px`;
      el.style.transform = "none";
    }
    if (rect.top < 4) {
      el.style.bottom = "";
      el.style.top = "calc(100% + 6px)";
    }
  }

  return (
    <span
      ref={ref}
      className="term"
      tabIndex={0}
      onMouseEnter={reposition}
      onFocus={reposition}
    >
      {children}
      <span ref={tipRef} className="term-tip" role="tooltip">{tip}</span>
    </span>
  );
}
