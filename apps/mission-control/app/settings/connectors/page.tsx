import { ConnectorsPage } from "@/components/connectors-page";
import { requireWorkspaceId } from "@/lib/safe-auth";

export default async function WorkspaceConnectorsPage() {
  await requireWorkspaceId("/settings/connectors");
  return <ConnectorsPage />;
}
