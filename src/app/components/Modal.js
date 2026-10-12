"use client";

import React, { useEffect, useRef } from "react";

const Modal = ({ show, onClose, children, maxWidth = "860px", onEscapeKey = null, ariaLabel }) => {
  const backdropRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const handlersRef = useRef({ onClose, onEscapeKey });
  handlersRef.current = { onClose, onEscapeKey };

  useEffect(() => {
    if (!show) {
      const rememberFocus = () => {
        if (!document.activeElement?.closest(".modal-backdrop")) {
          restoreFocusRef.current = document.activeElement;
        }
      };
      rememberFocus();
      document.addEventListener("focusin", rememberFocus);
      return () => document.removeEventListener("focusin", rememberFocus);
    }

    const originalOverflow = document.body.style.overflow;
    const previouslyFocused = restoreFocusRef.current;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => {
      if (!backdropRef.current?.contains(document.activeElement)) {
        (backdropRef.current?.querySelector('[data-autofocus="true"]:not(:disabled)') || backdropRef.current?.querySelector('input:not(:disabled), button:not(:disabled), textarea:not(:disabled)'))?.focus();
      }
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (event.defaultPrevented) return;
        (handlersRef.current.onEscapeKey || handlersRef.current.onClose)();
      }
      if (event.key === "Tab") {
        const focusable = [...backdropRef.current.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
        )].filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const outside = !backdropRef.current.contains(document.activeElement);
        if (first && (outside || (event.shiftKey && document.activeElement === first))) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [show]);

  if (!show) {
    return null;
  }

  const handleBackdropClick = () => {
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={handleBackdropClick}
    >
      <div
        className="modal-container"
        style={{ maxWidth }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
