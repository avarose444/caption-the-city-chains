import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { displayName, requireAdmin } from "@/lib/admin";

export default async function ToolLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-display text-xl uppercase tracking-wide">
            Prompt chain <span className="text-rouge">tool</span>
          </Link>
          <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
            <ThemeToggle />
            <span className="text-muted">{displayName(profile)}</span>
            <form action="/auth/signout" method="post">
              <button className="underline underline-offset-4 hover:text-rouge">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
