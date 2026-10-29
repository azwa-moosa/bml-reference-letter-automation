/* Loading state while a screen's data is fetched. */
export default function Loading() {
  return <div aria-busy="true" aria-label="Loading" style={{ display: "grid", gap: 16 }}><div className="skeleton hero" /><div className="skeleton" /><div className="skeleton tall" /></div>;
}
