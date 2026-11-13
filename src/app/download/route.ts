// /download: the APK served from this site, for phones whose browser chokes on GitHub's redirect to its file host
// (it arrives as octet-stream and some save it as .bin). Streams the latest release with the Android type and filename.
const APK = "https://github.com/tauxhd/spotter/releases/latest/download/spotter.apk";

export async function GET() {
  const r = await fetch(APK, { redirect: "follow" });
  if (!r.ok || !r.body) return Response.redirect(APK, 302);
  const headers = new Headers({
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": 'attachment; filename="spotter.apk"',
    "Cache-Control": "public, max-age=300",
  });
  const len = r.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new Response(r.body, { headers });
}
