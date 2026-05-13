'use client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { LiveEmergencyPanel } from '@/components/dashboard/LiveEmergencyPanel';
import { RecentEmergencies } from '@/components/dashboard/RecentEmergencies';
import { EmergencyTypeChart, MonthlyIncidentsChart } from '@/components/dashboard/Charts';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-black text-white">Tableau de bord</h1>
          <p className="text-sm mt-1" style={{ color: '#808080' }}>Surveillance en temps réel — Sonatrach</p>
        </div>
        <StatsCards />
        <LiveEmergencyPanel />
        <div className="grid grid-cols-2 gap-4">
          <EmergencyTypeChart />
          <MonthlyIncidentsChart />
        </div>
        <RecentEmergencies />
      </div>
    </DashboardLayout>
  );
}
