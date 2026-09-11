import { notFound } from "next/navigation";
import Dashboard from "@/src/Dashboard";

export default async function Page({
  params,
}: {
  params: Promise<{ route?: string[] }>;
}) {
  const { route = [] } = await params;
  const path = route.join("/");
  if (
    ![
      "",
      "login",
      "overview",
      "registrations",
      "staff-entry",
      "register",
      "status",
      "districts",
    ].includes(path) &&
    !(
      route.length === 2 &&
      route[0] === "edit" &&
      /^PLU-2026-\d+$/.test(route[1])
    )
  ) {
    notFound();
  }
  return <Dashboard route={path || "overview"} />;
}
