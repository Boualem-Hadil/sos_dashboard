'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useEmergency } from '@/context/EmergencyContext';
import { getEmergencyTypeLabel } from '@/lib/utils';

const TYPE_COLORS: Record<string, string> = {
  cardiac: '#E53935', trauma: '#FF9800', fire: '#FF5722',
  respiratory: '#2196F3', neurological: '#9C27B0', poisoning: '#4CAF50'
};

export function EmergencyTypeChart() {
  const { emergencyHistory } = useEmergency();
  
  const distribution = Object.entries(
    emergencyHistory.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, value]) => ({
    name: getEmergencyTypeLabel(type),
    value,
    color: TYPE_COLORS[type] || '#808080'
  }));

  return (
    <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #222' }}>
      <h2 className="text-base font-bold text-white mb-1">Types d&apos;urgences</h2>
      <p className="text-xs mb-4" style={{ color: '#808080' }}>Distribution par catégorie</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={distribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
            {distribution.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#808080' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyIncidentsChart() {
  const { emergencyHistory } = useEmergency();
  
  const monthlyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    // capitalize first letter
    const monthStr = d.toLocaleDateString('fr-DZ', { month: 'short' });
    const formattedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
    
    const incidents = emergencyHistory.filter(e => {
      const ed = new Date(e.startedAt);
      return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
    });
    monthlyData.push({
      month: formattedMonth,
      incidents: incidents.length,
      resolved: incidents.filter(e => e.status === 'resolved').length,
    });
  }

  return (
    <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #222' }}>
      <h2 className="text-base font-bold text-white mb-1">Incidents mensuels</h2>
      <p className="text-xs mb-4" style={{ color: '#808080' }}>7 derniers mois</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={monthlyData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
          <XAxis dataKey="month" tick={{ fill: '#808080', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#808080', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          <Bar dataKey="incidents" name="Incidents" fill="#E53935" radius={[4, 4, 0, 0]} />
          <Bar dataKey="resolved" name="Résolus" fill="#4CAF50" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
