"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatSheet } from "@/components/chat/chat-sheet";

export function ChatSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
      <ChatSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
