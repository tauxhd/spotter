import Image from "next/image";
import Icon from "./Icon";
import type { Exercise } from "@/lib/data";

// Round demo image from the exercise library (generated with ChatGPT); barbell icon if it isn't in the library.
export default function ExerciseThumb({ ex, size = 52 }: { ex?: Exercise; size?: number }) {
  return ex
    ? <Image src={ex.image} alt="" width={size} height={size} className="shrink-0 rounded-full bg-zinc-900 ring-1 ring-zinc-700/60" />
    : <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-zinc-900 ring-1 ring-zinc-700/60"><Icon name="barbell" size={size * 0.6} /></span>;
}
