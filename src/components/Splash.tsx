import Image from "next/image";

// First load: logo breathes while a lime bar sweeps under it. Server-rendered, so there is no blank flash.
export default function Splash() {
  return (
    <div role="status" aria-label="Loading Spotter" className="fixed inset-0 z-50 grid place-items-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center anim-fade">
        <Image src="/icon-512.png" alt="" width={88} height={88} priority className="anim-breathe rounded-2xl" />
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-lime-600 dark:text-lime-400">Spotter</p>
        <Loader className="mt-5 w-28" />
      </div>
    </div>
  );
}

// Inline loading bar for sections and pages.
export function Loader({ className = "mx-auto mt-20 w-24", label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={`block h-0.5 overflow-hidden rounded-sm bg-zinc-200 dark:bg-zinc-800 ${className}`}>
      <span className="anim-sweep block h-full w-2/5 rounded-sm bg-lime-500" />
    </span>
  );
}
