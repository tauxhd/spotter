import { headers } from "next/headers";
import Image from "next/image";
import QRCode from "qrcode";
import { gym } from "@/lib/data";

// Printable sign for the SweatZone door. The QR opens /checkin on whatever host the app is deployed to.
export default async function Poster() {
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/checkin`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#09090b", light: "#ffffff" } });

  return (
    <div className="rounded-3xl bg-white p-8 text-center text-zinc-950 print:p-0">
      <Image src="/logo.png" alt="" width={56} height={56} className="mx-auto rounded-xl" />
      <p className="mt-2 text-sm font-bold uppercase tracking-widest text-lime-600">Spotter</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{gym.name}</h1>
      <p className="mt-1 text-lg">Scan with your phone camera to clock in</p>
      <div className="mx-auto mt-6 w-64 max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-4 text-sm text-zinc-500">No more writing your name at the counter. Open {gym.open}–{gym.close} daily.</p>
      <p className="mt-1 break-all text-xs text-zinc-400">{url}</p>
    </div>
  );
}
