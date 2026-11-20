import { Mailbox } from "@/components/game/Mailbox";
import { PageTitle } from "@/components/ui";
import { listMail } from "@/lib/game/mail";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Mailbox" };

export default async function MailPage() {
  const p = await currentPlayer();
  const mail = await listMail(p.id);
  return (
    <>
      <PageTitle kicker="Mailbox" title="Your mail" sub="Mission rewards, recruit bonuses and cards people send you all land here. Claim rewards to get your $NOTTIES and free crates." />
      <Mailbox initial={mail} suspended={p.accountStatus !== "active"} />
    </>
  );
}
