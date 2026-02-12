import { AccountCard } from "@/components/cards/account-card";
import { getAccounts } from "@/server/actions/accounts";
import type { AccountFilter } from "@/lib/account-filter";

export async function DashboardAccounts({ filter }: { filter?: AccountFilter }) {
  const accounts = await getAccounts(false, filter);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Accounts</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts
          .filter((a) => Number(a.netliquidation) > 0)
          .map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
      {accounts.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          No accounts found. Run the sync script to populate data.
        </p>
      )}
    </div>
  );
}
