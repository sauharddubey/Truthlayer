"use client";

import { ReactNode, useEffect, useRef } from "react";

/**
 * Reusable accessible dialog primitive (WCAG 4.1.2 / 2.4.3 / 2.1.1).
 *
 * Handles the a11y behaviours only — each caller supplies its own backdrop /
 * panel classes and inner content so existing visuals are preserved:
 *   • role="dialog" + aria-modal, labelled via `ariaLabelledby` or `ariaLabel`
 *   • moves focus into the dialog on open
 *   • traps Tab / Shift+Tab within the dialog
 *   • closes on Escape (opt-out via `closeOnEsc`)
 *   • closes on backdrop click (opt-out via `closeOnBackdrop`)
 *   • restores focus to the previously-focused element on close
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  onClose,
  children,
  panelClassName = "",
  backdropClassName = "fixed inset-0 z-[60] flex items-center justify-center p-4",
  ariaLabel,
  ariaLabelledby,
  closeOnEsc = true,
  closeOnBackdrop = true,
  role = "dialog",
}: {
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  backdropClassName?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  role?: "dialog" | "alertdialog";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Keep the latest callback / flag without re-running the mount effect (which
  // would steal focus on every parent re-render).
  const onCloseRef = useRef(onClose);
  const closeOnEscRef = useRef(closeOnEsc);
  onCloseRef.current = onClose;
  closeOnEscRef.current = closeOnEsc;

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    // Move focus into the dialog (first focusable, else the panel itself).
    const initial = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (initial && initial.length > 0) initial[0].focus();
    else panel?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && closeOnEscRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused.current?.focus?.();
    };
    // Run once for the lifetime of the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={backdropClassName}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabelledby ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledby}
        tabIndex={-1}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
