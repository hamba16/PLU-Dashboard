import { notFound, redirect } from "next/navigation";
import Dashboard from "@/src/Dashboard";
import Login from "@/src/Login";
import { withActor, publicActor } from "@/utils/auth";
import { listRecords } from "@/utils/records";
import { AppError, canCreate, canEdit } from "@/src/access";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ route?: string[] }>;
}) {
  const { route = [] } = await params,
    path = route.join("/") || "overview";
  if (path === "login") return <Login />;
  if (
    ![
      "overview",
      "registrations",
      "staff-entry",
      "districts",
      "users",
      "audit",
    ].includes(path) &&
    !(
      route.length === 2 &&
      route[0] === "edit" &&
      /^[0-9a-f-]{36}$/i.test(route[1])
    )
  )
    notFound();
  let state;
  try {
    state = await withActor(async (db, actor) => {
      if (["users", "audit"].includes(path) && actor.role !== "admin-full")
        return null;
      if (path === "staff-entry" && !canCreate(actor)) return null;
      const records = ["users", "audit"].includes(path)
        ? []
        : await listRecords(db, actor);
      if (
        route[0] === "edit" &&
        !records.some((r) => r.id === route[1] && canEdit(actor, r))
      )
        return null;
      return { actor: publicActor(actor), records };
    });
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    throw error;
  }
  if (!state) notFound();
  return (
    <Dashboard
      key={path}
      route={path}
      initialActor={state.actor}
      initialRecords={state.records}
    />
  );
}
