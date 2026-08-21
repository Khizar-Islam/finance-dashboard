import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <DashboardClient userId={session.user.id} />;
}