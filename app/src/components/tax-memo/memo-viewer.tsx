"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateQuarterlyMemo } from "@/server/actions/tax-memo";
import { FileText, Loader2, Printer } from "lucide-react";

interface MemoViewerProps {
  memos: {
    id: string;
    quarter: string;
    year: number;
    generatedAt: Date;
  }[];
  latestContent: string | null;
  latestQuarter: string | null;
}

export function MemoViewer({ memos, latestContent, latestQuarter }: MemoViewerProps) {
  const [content, setContent] = useState(latestContent);
  const [activeQuarter, setActiveQuarter] = useState(latestQuarter);
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  async function handleGenerate() {
    setGenerating(true);
    startTransition(async () => {
      try {
        const result = await generateQuarterlyMemo(currentYear, currentQuarter);
        if (result.success) {
          // Reload to get new memo
          window.location.reload();
        }
      } catch (e) {
        console.error("Failed to generate memo:", e);
      } finally {
        setGenerating(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={generating || isPending}
        >
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Generate {currentYear}-Q{currentQuarter} Memo
        </Button>
        {content && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        )}
      </div>

      {memos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {memos.map((memo) => (
            <Badge
              key={memo.id}
              variant={activeQuarter === memo.quarter ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setActiveQuarter(memo.quarter);
                // In a real app, fetch content for this quarter
              }}
            >
              {memo.quarter}
            </Badge>
          ))}
        </div>
      )}

      {content ? (
        <Card className="print:border-none print:shadow-none">
          <CardHeader>
            <CardTitle>
              <FileText className="mr-2 inline h-5 w-5" />
              Tax Memo — {activeQuarter}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/\n/g, "<br>")
                    .replace(/## (.*?)(?=<br>|$)/g, "<h2>$1</h2>")
                    .replace(/### (.*?)(?=<br>|$)/g, "<h3>$1</h3>")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/- (.*?)(?=<br>|$)/g, "<li>$1</li>"),
                }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No tax memos yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click &quot;Generate&quot; to create your first quarterly tax memo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
