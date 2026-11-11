import type { MetadataRoute } from "next";

// "Add to Home Screen" makes Spotter open full-screen like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spotter: APU SweatZone",
    short_name: "Spotter",
    description: "Clock in, train, eat, rank and share at the APU gym.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
