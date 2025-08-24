import { useCallback, useEffect, useRef, useState } from "react";

type UseAutoScrollOptions = {
  /** Threshold in px to consider the user "near bottom" and keep autoscroll on */
  bottomThreshold?: number;
  /** When true, treat streaming updates as jumpy and avoid smooth scroll for performance */
  isStreaming?: boolean;
};

export type UseAutoScrollResult = {
  /** Attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Call when messages array changes to evaluate autoscroll */
  onItemsChange: () => void;
  /** Whether autoscroll is currently paused due to manual user scroll */
  isPaused: boolean;
  /** Whether there are unseen items when paused */
  hasNewItems: boolean;
  /** Smoothly scroll to bottom and resume autoscroll */
  scrollToBottom: () => void;
  /** Set streaming flag (optional external control) */
  setIsStreaming: (streaming: boolean) => void;
};

/**
 * Auto-scroll behavior for chat-like lists.
 * - Auto-scrolls by default when user is at/near bottom
 * - Pauses when user scrolls up
 * - Exposes `hasNewItems` to show a "New messages" control when updates arrive while paused
 * - Resumes when user returns near bottom or calls `scrollToBottom()`
 */
export function useAutoScroll(
  options?: UseAutoScrollOptions
): UseAutoScrollResult {
  const { bottomThreshold = 50 } = options || {};

  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoscrollRef = useRef(true);
  const [isPaused, setIsPaused] = useState(false);
  const [hasNewItems, setHasNewItems] = useState(false);
  const [streaming, setStreaming] = useState<boolean>(!!options?.isStreaming);
  const prevScrollTopRef = useRef<number>(0);

  // Utility: resolve the actual scroll container. On some mobile layouts the
  // page (window/document) is the scroll container instead of the inner div.
  const getScrollContainer = useCallback((): {
    type: "element" | "window";
    el: HTMLElement | null;
  } => {
    const el = containerRef.current;
    if (!el) return { type: "window", el: null };
    const canScrollSelf = el.scrollHeight > el.clientHeight + 1;
    if (canScrollSelf) return { type: "element", el };
    return { type: "window", el: null };
  }, []);

  const isNearBottom = useCallback(() => {
    const resolved = getScrollContainer();
    if (resolved.type === "element" && resolved.el) {
      const { scrollTop, scrollHeight, clientHeight } = resolved.el;
      return scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
    }
    const doc = document.scrollingElement || document.documentElement;
    const scrollTop = doc.scrollTop;
    const clientHeight = doc.clientHeight;
    const scrollHeight = doc.scrollHeight;
    return scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
  }, [bottomThreshold, getScrollContainer]);

  const updateAutoscrollFlags = useCallback(() => {
    const resolved = getScrollContainer();
    let scrollTop = 0;
    let clientHeight = 0;
    let scrollHeight = 0;
    if (resolved.type === "element" && resolved.el) {
      scrollTop = resolved.el.scrollTop;
      clientHeight = resolved.el.clientHeight;
      scrollHeight = resolved.el.scrollHeight;
    } else {
      const doc = document.scrollingElement || document.documentElement;
      scrollTop = doc.scrollTop;
      clientHeight = doc.clientHeight;
      scrollHeight = doc.scrollHeight;
    }

    const scrollingUp = scrollTop < prevScrollTopRef.current - 1; // allow small jitter
    prevScrollTopRef.current = scrollTop;

    if (scrollingUp) {
      autoscrollRef.current = false;
      setIsPaused(true);
      return; // don't change hasNewItems here; producer will set it when new items arrive
    }

    const atBottom =
      scrollHeight - (scrollTop + clientHeight) <= bottomThreshold;
    if (atBottom) {
      autoscrollRef.current = true;
      setIsPaused(false);
      setHasNewItems(false);
    }
  }, [bottomThreshold, getScrollContainer]);

  const scrollToBottom = useCallback(() => {
    const resolved = getScrollContainer();
    if (resolved.type === "element" && resolved.el) {
      resolved.el.scrollTo({
        top: resolved.el.scrollHeight,
        behavior: "smooth",
      });
    } else {
      const doc = document.scrollingElement || document.documentElement;
      window.scrollTo({ top: doc.scrollHeight, behavior: "smooth" });
    }
    autoscrollRef.current = true;
    setIsPaused(false);
    setHasNewItems(false);
  }, [getScrollContainer]);

  const onItemsChange = useCallback(() => {
    if (autoscrollRef.current) {
      const resolved = getScrollContainer();
      if (resolved.type === "element" && resolved.el) {
        resolved.el.scrollTo({
          top: resolved.el.scrollHeight,
          behavior: "smooth",
        });
      } else {
        const doc = document.scrollingElement || document.documentElement;
        window.scrollTo({ top: doc.scrollHeight, behavior: "smooth" });
      }
      setHasNewItems(false);
    } else {
      setHasNewItems(true);
    }
  }, [getScrollContainer]);

  // Attach scroll listener to detect manual override and resume near bottom
  useEffect(() => {
    const resolved = getScrollContainer();
    const onScroll = () => updateAutoscrollFlags();
    // Attach to both window and element to handle dynamic overflow changes
    window.addEventListener("scroll", onScroll, { passive: true });
    let cleanupEl: (() => void) | null = null;
    if (resolved.type === "element" && resolved.el) {
      resolved.el.addEventListener("scroll", onScroll, { passive: true });
      cleanupEl = () => resolved.el?.removeEventListener("scroll", onScroll);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (cleanupEl) cleanupEl();
    };
  }, [getScrollContainer, updateAutoscrollFlags]);

  // Initialize flags on mount
  useEffect(() => {
    updateAutoscrollFlags();
  }, [updateAutoscrollFlags]);

  // Return shape plus helper factory so consumers can easily render the anchor
  return {
    containerRef,
    onItemsChange,
    isPaused,
    hasNewItems,
    scrollToBottom,
    setIsStreaming: setStreaming,
  };
}

export default useAutoScroll;
