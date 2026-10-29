import { ROLE_KEYS, ROLES } from "@/domain/config";
import { badgeFor, navFor, todoCount } from "@/domain/model";
import { Shell } from "@/components/shell";
import { getPage } from "@/server/page";

export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { v, w } = await getPage();
  const a = ROLES[v.role];
  const nav = navFor(w, v).map((s) => ({ sec: s.sec, items: s.items.map((i) => ({ v: i.v, label: i.label, icon: i.icon, stub: i.stub, badge: i.stub ? 0 : badgeFor(w, v, i.v) })) }));
  return (
    <Shell role={v.role} roles={ROLE_KEYS.map((k) => ({ key: k, label: ROLES[k].label, todo: todoCount(w, k), home: ROLES[k].home }))} name={a.name} meta={a.meta} todo={todoCount(w, v.role)} portal={a.portal} short={a.short} home={a.home} nav={nav}>
      {children}
    </Shell>
  );
}
