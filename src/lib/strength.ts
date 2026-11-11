// Bodyweight lifts you can load with a belt (pull-ups, dips): logged kg is added weight, so the 1RM is worked out
// on bodyweight + added and shown as the added part ("+30 kg").
const LOADED_BW = new Set([
  "pull-up", "wide-grip-pull-up", "commando-pull-up", "typewriter-pull-up", "chin-up", "towel-pull-up", "l-sit-pull-up",
  "archer-pull-up", "muscle-up", "ring-muscle-up", "chest-dip", "ring-dip", "straight-bar-dip", "korean-dip",
]);

export const isLoadedBodyweight = (id?: string) => !!id && LOADED_BW.has(id);
export const loadedBodyweightIds = () => [...LOADED_BW];

/** For bests() / summarize(): bodyweight to add for pull-ups, dips etc., 0 for everything else. */
export function bodyFor(library: { name: string; id: string }[], bw: number) {
  const ids = new Map(library.map((e) => [e.name, e.id]));
  return (name: string) => (isLoadedBodyweight(ids.get(name)) ? bw : 0);
}
