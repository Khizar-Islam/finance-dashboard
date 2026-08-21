import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import BudgetsClient from "./BudgetsClient";

export default async function BudgetsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <BudgetsClient userId={session.user.id} />;
}