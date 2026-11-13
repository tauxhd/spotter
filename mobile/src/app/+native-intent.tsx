// Android share sheet: a file shared to Spotter opens the app with a share link (handled by ShareHandler in _layout), not a
// page, so send it to the home screen instead of "page not found".
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return path.includes('dataUrl=') ? '/' : path;
}
