/**
 * Kerangka muat.
 *
 * Dipakai lewat `loading.tsx` agar perpindahan halaman tidak terasa kosong.
 * Bentuknya meniru tata letak halaman asli supaya tidak ada lompatan visual
 * saat konten asli muncul.
 */
export function SkeletonBar({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? "h-3 w-full"}`} />;
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-[14px] border border-line bg-card p-5">
          <SkeletonBar className="h-2.5 w-20" />
          <SkeletonBar className="mt-3 h-6 w-32" />
          <SkeletonBar className="mt-2.5 h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[14px] border border-line bg-card">
      <div className="border-b border-line px-5 py-4">
        <SkeletonBar className="h-3.5 w-28" />
        <SkeletonBar className="mt-2 h-2.5 w-40" />
      </div>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-5 py-4">
            <SkeletonBar className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <SkeletonBar className="h-3 w-2/5" />
              <SkeletonBar className="mt-2 h-2.5 w-3/5" />
            </div>
            <SkeletonBar className="h-3 w-20 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kerangka satu halaman penuh. */
export function PageSkeleton({
  stats = 4,
  lists = 1,
  rows = 5,
}: {
  stats?: number;
  lists?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-8">
      <div className="border-b border-line pb-6">
        <SkeletonBar className="h-2.5 w-16" />
        <SkeletonBar className="mt-3 h-7 w-64" />
        <SkeletonBar className="mt-3 h-3 w-full max-w-md" />
      </div>
      {stats > 0 ? <SkeletonStats count={stats} /> : null}
      <div className={lists > 1 ? "grid gap-6 lg:grid-cols-2" : ""}>
        {Array.from({ length: Math.max(lists, 1) }, (_, index) => (
          <SkeletonList key={index} rows={rows} />
        ))}
      </div>
    </div>
  );
}
