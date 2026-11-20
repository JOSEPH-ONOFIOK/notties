import { redirect } from "next/navigation";

export default function Market() {
  redirect("/trade?tab=shop");
}
