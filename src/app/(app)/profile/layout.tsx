/**
 * Pull profile routes 10px wider on each side vs the parent `(app)` shell (`px-4` / `lg:px-8`).
 * Tailwind `2.5` spacing = 0.625rem ≈ 10px at default 16px root.
 */
export default function ProfileSectionLayout({ children }: { children: React.ReactNode }) {
  return <div className="-mx-2.5 lg:-mx-2.5">{children}</div>;
}
