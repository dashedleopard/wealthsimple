import { getGoals } from "@/server/actions/goals";
import { getAccounts } from "@/server/actions/accounts";
import { GoalsClient } from "@/components/goals/goals-client";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [goals, accounts] = await Promise.all([
    getGoals(),
    getAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Goals</h1>
        <p className="text-muted-foreground">
          Track progress toward your financial goals with Monte Carlo projections
        </p>
      </div>
      <GoalsClient
        goals={goals}
        accounts={accounts.map((a) => ({
          id: a.id,
          nickname: a.nickname,
          type: a.type,
        }))}
      />
    </div>
  );
}
