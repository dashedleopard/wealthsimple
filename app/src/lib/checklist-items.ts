export type ChecklistStatus =
  | "completed"
  | "action_needed"
  | "upcoming"
  | "overdue"
  | "not_applicable";

export interface ChecklistItemDef {
  id: string;
  title: string;
  description: string;
  href: string;
  getDeadline: (year: number) => Date;
  getStatus: (context: ChecklistContext) => ChecklistStatus;
}

export interface ChecklistContext {
  year: number;
  now: Date;
  tlhCandidateCount: number;
  tfsaRemaining: number;
  rrspRemaining: number;
  fhsaRemaining: number;
  hasCorpAccount: boolean;
}

export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    id: "harvest-losses",
    title: "Harvest tax losses",
    description: "Sell losing positions before Dec 24 to realize losses for this tax year",
    href: "/tax?tab=tax-loss",
    getDeadline: (year) => new Date(year, 11, 24),
    getStatus: (ctx) => {
      if (ctx.tlhCandidateCount === 0) return "completed";
      if (ctx.now > new Date(ctx.year, 11, 24)) return "overdue";
      const daysLeft = Math.ceil(
        (new Date(ctx.year, 11, 24).getTime() - ctx.now.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return daysLeft < 14 ? "action_needed" : "upcoming";
    },
  },
  {
    id: "max-tfsa",
    title: "Maximize TFSA contributions",
    description: "Use remaining TFSA contribution room before Dec 31",
    href: "/tax?tab=contribution",
    getDeadline: (year) => new Date(year, 11, 31),
    getStatus: (ctx) => {
      if (ctx.tfsaRemaining <= 0) return "completed";
      if (ctx.now > new Date(ctx.year, 11, 31)) return "overdue";
      return "action_needed";
    },
  },
  {
    id: "max-fhsa",
    title: "Maximize FHSA contributions",
    description: "Use remaining FHSA contribution room before Dec 31",
    href: "/tax?tab=contribution",
    getDeadline: (year) => new Date(year, 11, 31),
    getStatus: (ctx) => {
      if (ctx.fhsaRemaining <= 0) return "completed";
      if (ctx.now > new Date(ctx.year, 11, 31)) return "overdue";
      return "action_needed";
    },
  },
  {
    id: "max-rrsp",
    title: "Maximize RRSP contributions",
    description: "Use remaining RRSP room before Mar 1 of next year",
    href: "/tax?tab=contribution",
    getDeadline: (year) => new Date(year + 1, 2, 1),
    getStatus: (ctx) => {
      if (ctx.rrspRemaining <= 0) return "completed";
      const deadline = new Date(ctx.year + 1, 2, 1);
      if (ctx.now > deadline) return "overdue";
      const daysLeft = Math.ceil(
        (deadline.getTime() - ctx.now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysLeft < 30 ? "action_needed" : "upcoming";
    },
  },
  {
    id: "review-aaii",
    title: "Review AAII / passive income",
    description: "Ensure corporate passive income stays below $50K SBD threshold",
    href: "/corporate",
    getDeadline: (year) => new Date(year, 11, 15),
    getStatus: (ctx) => {
      if (!ctx.hasCorpAccount) return "not_applicable";
      return "upcoming";
    },
  },
  {
    id: "capital-dividend",
    title: "Consider paying capital dividend",
    description: "Use CDA balance for tax-free capital dividends before year-end",
    href: "/corporate/extraction",
    getDeadline: (year) => new Date(year, 11, 31),
    getStatus: (ctx) => {
      if (!ctx.hasCorpAccount) return "not_applicable";
      return "upcoming";
    },
  },
  {
    id: "new-year-tfsa",
    title: "New year TFSA contribution",
    description: "Contribute to TFSA on Jan 1 when new room becomes available",
    href: "/tax?tab=contribution",
    getDeadline: (year) => new Date(year + 1, 0, 15),
    getStatus: () => "upcoming",
  },
  {
    id: "review-mix",
    title: "Review corporate vs personal mix",
    description: "Assess whether to shift assets between personal and corporate accounts",
    href: "/scenarios",
    getDeadline: (year) => new Date(year, 11, 15),
    getStatus: (ctx) => {
      if (!ctx.hasCorpAccount) return "not_applicable";
      return "upcoming";
    },
  },
];
