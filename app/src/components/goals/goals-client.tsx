"use client";

import { useState, useEffect, useTransition } from "react";
import { GoalCard } from "./goal-card";
import { GoalForm } from "./goal-form";
import { ProjectionChart } from "./projection-chart";
import { deleteGoal, getGoalProjections } from "@/server/actions/goals";
import { Target } from "lucide-react";
import type { GoalProjection } from "@/types";
import { toNumber } from "@/lib/formatters";

interface GoalData {
  id: string;
  name: string;
  targetAmount: unknown; // Prisma Decimal
  currentAmount: unknown;
  targetDate: Date;
  accountIds: string[];
  priority: number;
  category: string;
  monthlyContribution: unknown;
  notes: string | null;
}

interface GoalsClientProps {
  goals: GoalData[];
  accounts: { id: string; nickname: string | null; type: string }[];
}

export function GoalsClient({ goals, accounts }: GoalsClientProps) {
  const [projections, setProjections] = useState<Record<string, GoalProjection>>({});
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
    goals[0]?.id ?? null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Load projections for all goals
    for (const goal of goals) {
      getGoalProjections(goal.id).then((proj) => {
        setProjections((prev) => ({ ...prev, [goal.id]: proj }));
      });
    }
  }, [goals]);

  function handleDelete(id: string) {
    if (!confirm("Delete this goal?")) return;
    startTransition(async () => {
      await deleteGoal(id);
    });
  }

  const normalizedGoals = goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: toNumber(g.targetAmount as number),
    currentAmount: toNumber(g.currentAmount as number),
    targetDate: g.targetDate.toISOString().split("T")[0],
    category: g.category,
    monthlyContribution: toNumber(g.monthlyContribution as number),
  }));

  const selectedGoal = normalizedGoals.find((g) => g.id === selectedGoalId);
  const selectedProjection = selectedGoalId
    ? projections[selectedGoalId]
    : undefined;

  if (goals.length === 0) {
    return (
      <div className="space-y-6">
        <GoalForm accounts={accounts} />
        <div className="flex flex-col items-center justify-center rounded-lg border py-16">
          <Target className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No goals yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first financial goal to start tracking progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GoalForm accounts={accounts} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {normalizedGoals.map((goal) => (
          <div
            key={goal.id}
            className={`cursor-pointer rounded-lg transition-shadow ${
              selectedGoalId === goal.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedGoalId(goal.id)}
          >
            <GoalCard
              goal={goal}
              projection={projections[goal.id]}
              onDelete={handleDelete}
            />
          </div>
        ))}
      </div>

      {selectedGoal && selectedProjection?.projectionCurve && (
        <ProjectionChart
          data={selectedProjection.projectionCurve}
          targetAmount={selectedGoal.targetAmount}
          goalName={selectedGoal.name}
        />
      )}
    </div>
  );
}
