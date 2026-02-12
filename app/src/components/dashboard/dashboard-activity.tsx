import { RecentActivity } from "@/components/tables/recent-activity";
import { getRecentActivities } from "@/server/actions/activities";

export async function DashboardActivity() {
  const recentActivities = await getRecentActivities(8);
  return <RecentActivity activities={recentActivities} />;
}
