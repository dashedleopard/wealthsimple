"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react";
import { Sparkles, Loader2 } from "lucide-react";

function getTextContent(message: { parts?: Array<{ type: string; text?: string }>; content?: string }): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("");
  }
  return typeof message.content === "string" ? message.content : "";
}

export function AiOpinionCard({
  symbol,
  name,
}: {
  symbol: string;
  name: string;
}) {
  const [asked, setAsked] = useState(false);

  const { messages, sendMessage, status } = useChat({
    id: `opinion-${symbol}`,
  });

  const isLoading = status === "streaming" || status === "submitted";

  async function handleAsk() {
    setAsked(true);
    sendMessage({
      text: `Give me a brief analysis of ${symbol} (${name}) in my portfolio. Cover: 1) Current position assessment (is it overweight/underweight?), 2) Any tax optimization opportunities, 3) One actionable recommendation. Keep it concise — 3-4 bullet points max.`,
    });
  }

  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const assistantMessage = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!asked ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Get AI-powered analysis of this holding in the context of your
              full portfolio, including tax optimization suggestions.
            </p>
            <Button onClick={handleAsk} variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze {symbol}
            </Button>
          </div>
        ) : isLoading && !assistantMessage ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing {symbol}...
          </div>
        ) : assistantMessage ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{
                __html: getTextContent(assistantMessage)
                  .replace(/\n/g, "<br>")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/- /g, "• "),
              }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
