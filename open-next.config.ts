import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Spotter on Cloudflare Workers (npm run deploy). No incremental cache: every page is client-rendered or fetched live.
export default defineCloudflareConfig({});
