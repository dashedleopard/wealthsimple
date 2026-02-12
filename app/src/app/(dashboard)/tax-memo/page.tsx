import { getLatestMemo, getAllMemos } from "@/server/actions/tax-memo";
import { MemoViewer } from "@/components/tax-memo/memo-viewer";

export const dynamic = "force-dynamic";

export default async function TaxMemoPage() {
  const [latestMemo, allMemos] = await Promise.all([
    getLatestMemo(),
    getAllMemos(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tax Memo</h1>
        <p className="text-muted-foreground">
          AI-generated quarterly tax summaries with actionable recommendations
        </p>
      </div>
      <MemoViewer
        memos={allMemos}
        latestContent={latestMemo?.content ?? null}
        latestQuarter={latestMemo?.quarter ?? null}
      />
    </div>
  );
}
