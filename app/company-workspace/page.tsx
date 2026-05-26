import { redirect } from "next/navigation";

/** Legacy route — company list and workspace entry are on `/companies`. */
export default function CompanyWorkspaceLegacyPage() {
  redirect("/companies");
}
