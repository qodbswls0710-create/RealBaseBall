import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { X } from "lucide-react";

export function useFocusDialog(
  enabled: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const selector =
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]';
    const getFocusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(selector) ?? [],
      ).filter((element) => element.offsetParent !== null);
    getFocusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (!items.length) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === items[0] ||
          !ref.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === items[items.length - 1] ||
          !ref.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, [enabled, ref]);
}

export default function Modal({
  children,
  titleId,
  onClose,
}: {
  children: ReactNode;
  titleId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusDialog(true, ref, onClose);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={ref}
        className="studio-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close icon-button"
          aria-label="닫기"
          type="button"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {children}
      </section>
    </div>
  );
}
