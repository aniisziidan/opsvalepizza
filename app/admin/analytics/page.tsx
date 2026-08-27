import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { getAnalyticsData } from '@/lib/admin/analyticsQueries';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const analyticsData = await getAnalyticsData();
  return <AnalyticsDashboard data={analyticsData} />;
}
