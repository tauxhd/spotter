// Grey placeholders shaped like the content that's loading, with a soft shimmer (.bone in globals.css).
export const Bone = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => <span aria-hidden style={style} className={`bone block ${className}`} />;

export function PostSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <Bone className="h-12 w-12 !rounded-full" />
        <div className="flex-1 space-y-2"><Bone className="h-3.5 w-32" /><Bone className="h-3 w-24" /></div>
      </div>
      <Bone className="mt-4 h-5 w-40" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => <div key={i} className="space-y-1.5"><Bone className="h-3 w-10" /><Bone className="h-4 w-16" /></div>)}
      </div>
      {[0, 1].map((i) => <div key={i} className="mt-4 flex items-center gap-3"><Bone className="h-10 w-10 !rounded-full" /><Bone className="h-4 w-44" /></div>)}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile">
      <div className="flex justify-center pb-4 pt-1"><Bone className="h-4 w-20" /></div>
      <div className="flex items-center gap-5">
        <Bone className="h-[84px] w-[84px] shrink-0 !rounded-full" />
        <div className="grid flex-1 grid-cols-3 justify-items-center gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="flex flex-col items-center gap-1.5"><Bone className="h-5 w-6" /><Bone className="h-3 w-14" /></div>)}
        </div>
      </div>
      <Bone className="mt-4 h-5 w-36" />
      <Bone className="mt-2 h-3.5 w-52" />
      <div className="mt-4 grid grid-cols-2 gap-2"><Bone className="h-9" /><Bone className="h-9" /></div>
      <div className="-mx-4 mt-5 border-t border-zinc-200 dark:border-zinc-800/80" />
      <PostSkeleton />
    </div>
  );
}

export function PeopleSkeleton({ n = 4 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <li key={i} aria-hidden className="flex items-center gap-3 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800/80">
          <Bone className="h-10 w-10 !rounded-full" />
          <div className="flex-1 space-y-2"><Bone className="h-3.5 w-28" /><Bone className="h-3 w-20" /></div>
          <Bone className="h-7 w-16" />
        </li>
      ))}
    </>
  );
}

export function StatsSkeleton() {
  return (
    <div role="status" aria-label="Loading stats" className="space-y-5">
      <Bone className="h-7 w-32" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="space-y-1.5"><Bone className="h-6 w-14" /><Bone className="h-3 w-16" /></div>)}
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {[40, 65, 30, 80, 55, 90, 45, 70].map((h, i) => <Bone key={i} className="flex-1" style={{ height: `${h}%` }} />)}
      </div>
      {[0, 1, 2].map((i) => <div key={i} className="space-y-1.5"><Bone className="h-3.5 w-24" /><Bone className="h-2 w-full" /></div>)}
    </div>
  );
}
