"use client";
import { useRouter } from "next/navigation";
/** Whole-row link, keyboard accessible (prototype tr.click with Enter). */
export function ClickRow({ href, children, testId }: { href: string; children: React.ReactNode; testId?: string }) {
  const router = useRouter();
  return <tr className="click" tabIndex={0} data-testid={testId} onClick={() => router.push(href)} onKeyDown={(e) => { if (e.key === "Enter") router.push(href); }}>{children}</tr>;
}
