import { PageShell } from "@/features/workspace/page-header";

/**
 * The workspace skeleton.
 *
 * Shaped like the page that is coming — an eyebrow, a title, a wide column and
 * a narrow one — so the layout does not jump when the content lands. Built from
 * hairlines and blocks rather than a shimmer, which matches everything else.
 */
export default function WorkspaceLoading() {
  return (
    <PageShell>
      <div className="animate-pulse" aria-hidden>
        <div className="flex flex-col gap-4 pb-6">
          <div className="h-2.5 w-24 rounded-full bg-sunk" />
          <div className="h-8 w-72 max-w-full rounded-sm bg-sunk" />
          <div className="h-3 w-full max-w-md rounded-full bg-raised" />
        </div>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="flex flex-col gap-4 lg:col-span-8">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2.5 border-t border-rule py-4"
              >
                <div className="h-3.5 w-52 max-w-full rounded-full bg-sunk" />
                <div className="h-3 w-40 rounded-full bg-raised" />
                <div className="h-3 w-full max-w-lg rounded-full bg-raised" />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            <div className="h-40 rounded-lg border border-rule bg-raised/50" />
            <div className="h-28 rounded-lg border border-rule bg-raised/50" />
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading
      </span>
    </PageShell>
  );
}
