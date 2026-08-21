import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import AddTransactionForm from "./AddTransactionForm";

export default async function AddTransactionPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <AddTransactionForm userId={session.user.id} />;
}