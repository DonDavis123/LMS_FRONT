"use client";

import { useState } from "react";
import DashboardStats from "@/features/dashboard/components/dashBoardStats";
import DashboardHero from "@/features/dashboard/components/DashboardHero";
import LeadPipelineChart from "@/features/dashboard/components/LeadPipelineChart";
import LeadSourceDonut from "@/features/dashboard/components/LeadSourceDonut";
import LeadsTrendChart from "@/features/dashboard/components/LeadsTrendChart";
import MyTasksPanel from "@/features/dashboard/components/MyTasksPanel";
import RecentLeadsList from "@/features/dashboard/components/RecentLeadsList";
import UpcomingSchedule from "@/features/dashboard/components/UpcomingSchedule";
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { authStorage } from "@/infrastructure/auth/tokenStorage";

export default function HomePage() {
  // The dashboard layout only renders this page once the session is restored,
  // so the stored user is available on the first client render.
  const [user] = useState(() => authStorage.getUser());
  const dashboard = useDashboardData(user?.id ?? null);

  return (
    <div className="lp-page-bg min-h-full space-y-4 rounded-2xl sm:space-y-5 sm:p-1">
      <DashboardHero
        user={user}
        tasks={user ? dashboard.tasks.state : null}
        schedule={dashboard.schedule.state}
        completingIds={dashboard.completingIds}
        updatedAt={dashboard.updatedAt}
        isRefreshing={dashboard.isRefreshing}
        onRefresh={dashboard.refreshAll}
      />

      <DashboardStats
        stats={dashboard.stats.state}
        tasks={user ? dashboard.tasks.state : null}
        completingIds={dashboard.completingIds}
        range={dashboard.range}
        onRetryStats={dashboard.stats.reload}
        onRetryTasks={dashboard.tasks.reload}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="min-w-0 lg:col-span-7">
          <LeadPipelineChart state={dashboard.stats.state} onRetry={dashboard.stats.reload} delay={240} />
        </div>

        {/* Most actionable block: first after the KPIs on small screens. */}
        {user && (
          <div className="order-first min-w-0 lg:order-none lg:col-span-5">
            <MyTasksPanel
              state={dashboard.tasks.state}
              completingIds={dashboard.completingIds}
              onComplete={dashboard.completeTask}
              onRetry={dashboard.tasks.reload}
              delay={240}
            />
          </div>
        )}

        <div className="min-w-0 lg:col-span-7">
          <LeadsTrendChart
            state={dashboard.stats.state}
            range={dashboard.range}
            onRangeChange={dashboard.setRange}
            isFetching={dashboard.stats.isFetching}
            onRetry={dashboard.stats.reload}
            delay={300}
          />
        </div>

        <div className="min-w-0 lg:col-span-5">
          <LeadSourceDonut
            state={dashboard.stats.state}
            range={dashboard.range}
            isFetching={dashboard.stats.isFetching}
            onRetry={dashboard.stats.reload}
            delay={300}
          />
        </div>

        <div className="min-w-0 lg:col-span-7">
          <UpcomingSchedule state={dashboard.schedule.state} onRetry={dashboard.schedule.reload} delay={360} />
        </div>

        <div className="min-w-0 lg:col-span-5">
          <RecentLeadsList state={dashboard.recent.state} onRetry={dashboard.recent.reload} delay={360} />
        </div>
      </div>
    </div>
  );
}
