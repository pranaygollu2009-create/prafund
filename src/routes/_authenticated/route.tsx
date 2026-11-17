import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authReady, currentUser } from "@/lib/mq/localAuth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    await authReady();
    const user = currentUser();
    if (!user) throw redirect({ to: "/auth", search: { redirect: undefined, mode: undefined } });
    return { user };
  },
  component: () => <Outlet />,
});
