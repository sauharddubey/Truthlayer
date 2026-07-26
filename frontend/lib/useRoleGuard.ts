import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole, routeForRole } from "@/lib/api";

/**
 * Client-side workspace guard for role-specific pages.
 *
 * Backend access control still returns 401/403 — this only improves the
 * experience: a logged-out visitor goes to /login, and someone on the wrong
 * workspace (e.g. a verifier opening the brand dashboard) is sent to their own
 * home instead of being shown a raw API error box.
 *
 * Pass the roles allowed on this page, or null to only require being signed in.
 * Returns false until the check passes, so callers can hold render.
 */
export function useRoleGuard(allowed: string[] | null): boolean {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.replace("/login");
      return;
    }
    if (allowed && !allowed.includes(role)) {
      router.replace(routeForRole(role));
      return;
    }
    setOk(true);
  }, [allowed, router]);

  return ok;
}
