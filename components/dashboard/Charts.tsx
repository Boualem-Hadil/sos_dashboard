'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { EMERGENCY_TYPE_DISTRIBUTION, MONTHLY_DATA } from '@/lib/mock-data';

export function EmergencyTypeChart() {
  return (
    <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #222' }}>
      <h2 className="text-base font-bold text-white mb-1">Types d&apos;urgences</h2>
      <p className="text-xs mb-4" style={{ color: '#808080' }}>Distribution par catégorie</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={EMERGENCY_TYPE_DISTRIBUTION} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
            {EMERGENCY_TYPE_DISTRIBUTION.map((entry, i) => (
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
  return (
    <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #222' }}>
      <h2 className="text-base font-bold text-white mb-1">Incidents mensuels</h2>
      <p className="text-xs mb-4" style={{ color: '#808080' }}>7 derniers mois</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={MONTHLY_DATA} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
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
