import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import TransactionsClient from "./TransactionsClient";

export default async function TransactionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <TransactionsClient userId={session.user.id} />;
}