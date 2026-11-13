import { Suspense } from "react";
import Nav from "@/components/Nav";
import PullRefresh from "@/components/PullRefresh";
import InstallSheet from "@/components/InstallSheet";
import { StoreProvider } from "@/lib/store";

// The app itself (every page but the /welcome landing page): signed-in store, phone-width column, bottom nav.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
    <StoreProvider>
      <PullRefresh />
      <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">{children}</main>
      <Suspense>
        <Nav />
      </Suspense>
    </StoreProvider>
    <InstallSheet />
    </>
  );
}
