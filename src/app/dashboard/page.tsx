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
import type { AsyncState } from "@/features/dashboard/types/dashboard.types";
import { authStorage } from "@/infrastructure/auth/tokenStorage";

export default function HomePage() {
  // The dashboard layout only renders this page once the session is restored,
  // so the stored user is available on the first client render.
  const [user] = useState(() => authStorage.getUser());
  const dashboard = useDashboardData(user?.id ?? null);

  // Every widget fetches in parallel, but nothing is shown until all of them
  // have settled, so the whole dashboard (and every chart animation) appears at
  // the same moment instead of card by card. The gate only applies to the first
  // load: later refetches (e.g. switching the date range) keep the old data on
  // screen, so it is latched open once.
  const settled = [dashboard.stats.state, dashboard.schedule.state, dashboard.recent.state, ...(user ? [dashboard.tasks.state] : [])].every(
    (state) => state.status !== "loading",
  );
  const [revealed, setRevealed] = useState(false);
  if (settled && !revealed) setRevealed(true);

  const loading: AsyncState<never> = { status: "loading" };
  const statsState = revealed ? dashboard.stats.state : loading;
  const tasksState = revealed ? dashboard.tasks.state : loading;
  const scheduleState = revealed ? dashboard.schedule.state : loading;
  const recentState = revealed ? dashboard.recent.state : loading;

  return (
    <div className="lp-page-bg min-h-full space-y-4 rounded-2xl sm:space-y-5 sm:p-1">
      <DashboardHero
        user={user}
        tasks={user ? tasksState : null}
        schedule={scheduleState}
        completingIds={dashboard.completingIds}
      />

      <DashboardStats
        stats={statsState}
        tasks={user ? tasksState : null}
        completingIds={dashboard.completingIds}
        range={dashboard.range}
        onRetryStats={dashboard.stats.reload}
        onRetryTasks={dashboard.tasks.reload}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="min-w-0 lg:col-span-7">
          <LeadsTrendChart
            state={statsState}
            range={dashboard.range}
            onRangeChange={dashboard.setRange}
            isFetching={dashboard.stats.isFetching}
            onRetry={dashboard.stats.reload}
          />
        </div>

        {/* Most actionable block: first after the KPIs on small screens. */}
        {user && (
          <div className="order-first min-w-0 lg:order-none lg:col-span-5">
            <MyTasksPanel
              state={tasksState}
              completingIds={dashboard.completingIds}
              onComplete={dashboard.completeTask}
              onRetry={dashboard.tasks.reload}
            />
          </div>
        )}

        <div className="min-w-0 lg:col-span-7">
          <LeadPipelineChart state={statsState} onRetry={dashboard.stats.reload} />
        </div>

        <div className="min-w-0 lg:col-span-5">
          <LeadSourceDonut
            state={statsState}
            range={dashboard.range}
            isFetching={dashboard.stats.isFetching}
            onRetry={dashboard.stats.reload}
          />
        </div>

        <div className="min-w-0 lg:col-span-7">
          <UpcomingSchedule state={scheduleState} onRetry={dashboard.schedule.reload} />
        </div>

        <div className="min-w-0 lg:col-span-5">
          <RecentLeadsList state={recentState} onRetry={dashboard.recent.reload} />
        </div>
      </div>
    </div>
  );
}
