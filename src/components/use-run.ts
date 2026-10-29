"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { Result } from "@/app/actions";
import { toast } from "./toast";

/** Runs a server action: shows its toast, keeps its error for the error box, refreshes data. */
export function useRun() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const run = React.useCallback(async <T,>(fn: () => Promise<Result<T>>, o: { then?: (r: Extract<Result<T>, { ok: true }>) => void; refresh?: boolean } = {}) => {
    setError(null);
    let r: Result<T>;
    try { r = await fn(); } catch { r = { ok: false, error: "Could not reach the server. Check your connection and try again." }; }
    if (r.ok) { if (r.toast) toast(r.toast); o.then?.(r); if (o.refresh !== false) start(() => router.refresh()); }
    else setError(r.error);
    return r;
  }, [router]);
  return { run, pending, error, setError };
}
