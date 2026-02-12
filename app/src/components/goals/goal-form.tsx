"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { createGoal } from "@/server/actions/goals";

interface GoalFormProps {
  accounts: { id: string; nickname: string | null; type: string }[];
}

export function GoalForm({ accounts }: GoalFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const accountIds = form.getAll("accountIds") as string[];

    try {
      await createGoal({
        name: form.get("name") as string,
        targetAmount: parseFloat(form.get("targetAmount") as string),
        targetDate: form.get("targetDate") as string,
        accountIds,
        category: form.get("category") as string,
        monthlyContribution: parseFloat(
          (form.get("monthlyContribution") as string) || "0"
        ),
        notes: (form.get("notes") as string) || undefined,
      });
      setOpen(false);
    } catch (err) {
      console.error("Failed to create goal:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Financial Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Goal Name</Label>
            <Input id="name" name="name" required placeholder="e.g., Retirement" />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select name="category" defaultValue="custom">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retirement">Retirement</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="emergency">Emergency Fund</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="targetAmount">Target Amount ($)</Label>
              <Input
                id="targetAmount"
                name="targetAmount"
                type="number"
                required
                min={0}
                step={1000}
                placeholder="500000"
              />
            </div>
            <div>
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                name="targetDate"
                type="date"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="monthlyContribution">
              Monthly Contribution ($)
            </Label>
            <Input
              id="monthlyContribution"
              name="monthlyContribution"
              type="number"
              min={0}
              step={100}
              placeholder="2000"
              defaultValue="0"
            />
          </div>

          <div>
            <Label>Linked Accounts</Label>
            <div className="mt-1 space-y-2 rounded border p-3">
              {accounts.map((acc) => (
                <label key={acc.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="accountIds"
                    value={acc.id}
                    className="rounded"
                  />
                  {acc.nickname ?? acc.type} ({acc.type})
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" name="notes" placeholder="Any additional notes" />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
