import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { currentUser } from "@/lib/mq/localAuth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    const user = currentUser();
    if (!user) throw redirect({ to: "/auth", search: { redirect: undefined, mode: undefined } });
    return { user };
  },
  component: () => <Outlet />,
});
