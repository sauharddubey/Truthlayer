import { useEffect } from "react";

/** Refetch when the user returns to this tab, window, or restored back/forward page. */
export function useRefetchOnVisible(refetch: () => void) {
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refetch();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) refetch();
    }
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [refetch]);
}
