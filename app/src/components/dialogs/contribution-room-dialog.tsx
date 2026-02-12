"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertContributionRoom } from "@/server/actions/contribution-room";
import { Pencil } from "lucide-react";

interface ContributionRoomDialogProps {
  accountType: string;
  year: number;
  currentRoom?: number;
  currentUsed?: number;
  currentNotes?: string;
}

export function ContributionRoomDialog({
  accountType,
  year,
  currentRoom = 0,
  currentUsed = 0,
  currentNotes = "",
}: ContributionRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [roomAmount, setRoomAmount] = useState(String(currentRoom));
  const [usedAmount, setUsedAmount] = useState(String(currentUsed));
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await upsertContributionRoom({
        accountType,
        year,
        roomAmount: parseFloat(roomAmount) || 0,
        usedAmount: parseFloat(usedAmount) || 0,
        notes: notes || undefined,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {accountType} Contribution Room ({year})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="roomAmount">Total Room</Label>
            <Input
              id="roomAmount"
              type="number"
              value={roomAmount}
              onChange={(e) => setRoomAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="usedAmount">Used Amount</Label>
            <Input
              id="usedAmount"
              type="number"
              value={usedAmount}
              onChange={(e) => setUsedAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
