'use client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { LiveEmergencyPanel } from '@/components/dashboard/LiveEmergencyPanel';
import { RecentEmergencies } from '@/components/dashboard/RecentEmergencies';
import { EmergencyTypeChart, MonthlyIncidentsChart } from '@/components/dashboard/Charts';
import { useEmergency } from '@/context/EmergencyContext';

export default function DashboardPage() {
  const { company, isLoading, authError } = useEmergency();

  if (authError) {
    return <DashboardLayout><div className="flex h-full items-center justify-center text-red-500 font-bold text-2xl tracking-widest">{authError}</div></DashboardLayout>;
  }

  if (isLoading || !company) {
    return <DashboardLayout><div className="p-8" style={{ color: 'var(--sos-text-primary)' }}>Chargement...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--sos-text-primary)' }}>Tableau de bord</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sos-text-secondary)' }}>Surveillance en temps réel — {company.name}</p>
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
