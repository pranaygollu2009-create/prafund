import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle } from "@/components/mq/bits";
import { getUserCount } from "@/lib/mq/stats.functions";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Community — Prafund" },
      { name: "description", content: "See how many students are currently learning money skills with Prafund." },
      { property: "og:title", content: "Community — Prafund" },
      { property: "og:description", content: "Live count of Prafund members learning financial skills." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["user-count"],
    queryFn: getUserCount,
    refetchInterval: 30_000,
  });

  return (
    <Shell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <SectionTitle
          eyebrow="Community"
          title="Who's learning with Prafund right now"
          sub="A live count of every registered account. This page refreshes automatically every 30 seconds."
        />

        <div className="mq-card mt-8 flex flex-col items-center gap-4 p-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-info-soft text-info">
            <Users className="size-7" aria-hidden />
          </span>
          {isLoading && <p className="text-sm text-muted-foreground">Counting members…</p>}
          {isError && (
            <div>
              <p className="text-sm text-muted-foreground">
                Something went wrong. We couldn't load the member count.
              </p>
              <button
                onClick={() => refetch()}
                className="mt-3 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
              >
                Try Again
              </button>
            </div>
          )}
          {data && (
            <>
              <p className="mq-num font-display text-6xl font-bold">{data.count.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                registered {data.count === 1 ? "member" : "members"}
                {dataUpdatedAt > 0 && (
                  <> · updated {new Date(dataUpdatedAt).toLocaleTimeString()}</>
                )}
              </p>
            </>
          )}
        </div>

        <div className="mq-card mt-6 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Join them — create a free account and start your first simulated month in about a minute.
          </p>
          <Link
            to="/auth"
            search={{ redirect: undefined, mode: "signup" }}
            className="mt-4 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Create your account
          </Link>
        </div>
      </div>
    </Shell>
  );
}
