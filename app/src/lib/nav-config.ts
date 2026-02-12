import {
  LayoutDashboard,
  Wallet,
  PieChart,
  ChartPie,
  TrendingUp,
  DollarSign,
  ArrowLeftRight,
  Receipt,
  Building2,
  FlaskConical,
  FileText,
  Target,
  Scale,
  MessageSquare,
  Settings,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/accounts", label: "Accounts", icon: Wallet },
      { href: "/holdings", label: "Holdings", icon: PieChart },
      { href: "/allocation", label: "Allocation", icon: ChartPie },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/performance", label: "Performance", icon: TrendingUp },
      { href: "/dividends", label: "Dividends", icon: DollarSign },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/digest", label: "Digest", icon: Newspaper },
    ],
  },
  {
    label: "Tax & Corporate",
    items: [
      { href: "/tax", label: "Tax", icon: Receipt },
      { href: "/corporate", label: "Corporate", icon: Building2 },
      { href: "/scenarios", label: "Scenarios", icon: FlaskConical },
      { href: "/tax-memo", label: "Tax Memo", icon: FileText },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/rebalance", label: "Rebalance", icon: Scale },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
