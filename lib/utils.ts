import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { EmergencyType, Severity, WorkerStatus, MedicalProfile } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatElapsedTime(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const diffSec = Math.floor(diffMs / 1000);
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins > 0) return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  return `${secs}s`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export function getEmergencyTypeLabel(type: EmergencyType): string {
  const labels: Record<EmergencyType, string> = {
    cardiac: 'Cardiaque',
    trauma: 'Traumatisme',
    fire: 'Incendie',
    respiratory: 'Respiratoire',
    neurological: 'Neurologique',
    poisoning: 'Intoxication',
  };
  return labels[type];
}

export function getSeverityLabel(severity: Severity): string {
  const labels: Record<Severity, string> = {
    critical: 'Critique',
    moderate: 'Modérée',
    minor: 'Mineure',
  };
  return labels[severity];
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'En cours',
    in_progress: 'En cours',
    resolved: 'Résolue',
    false_alarm: 'Fausse alarme',
    offline: 'Hors ligne',
    emergency: 'Urgence',
  };
  return labels[status] || status;
}

export function getWorkerStatusLabel(status: WorkerStatus): string {
  const labels: Record<WorkerStatus, string> = {
    active: 'Actif',
    offline: 'Hors ligne',
    emergency: 'Urgence',
  };
  return labels[status];
}

export function getBloodTypeColor(bloodType: MedicalProfile['bloodType']): string {
  const colors: Record<string, string> = {
    'O+': '#4CAF50',
    'O-': '#2E7D32',
    'A+': '#2196F3',
    'A-': '#1565C0',
    'B+': '#FF9800',
    'B-': '#E65100',
    'AB+': '#9C27B0',
    'AB-': '#6A1B9A',
  };
  return colors[bloodType] || '#808080';
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csvRows = [
    keys.join(','),
    ...data.map(row =>
      keys.map(k => {
        const val = row[k];
        const str = val === null || val === undefined ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
