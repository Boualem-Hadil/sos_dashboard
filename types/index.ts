// ============================================================
// Types & Interfaces for SOS Algérie Dashboard
// ============================================================

export type EmergencyType = 'cardiac' | 'trauma' | 'fire' | 'respiratory' | 'neurological' | 'poisoning';
export type Severity = 'critical' | 'moderate' | 'minor';
export type WorkerStatus = 'active' | 'offline' | 'emergency';
export type EmergencyState = 'idle' | 'active' | 'resolved';
export type EmergencyStatus = 'resolved' | 'false_alarm' | 'active' | 'in_progress';

export interface Company {
  id: string;
  name: string;
  code: string;
  industry: string;
  address: string;
  maxWorkers: number;
  currentWorkers: number;
  logo?: string;
}

export interface MedicalProfile {
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies: string[];
  chronicDiseases: string[];
  medications: string[];
  emergencyNotes: string;
  iceContact: {
    name: string;
    relation: string;
    phone: string;
  };
  lastCheckup: string;
}

export interface Worker {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  unit: string;
  department: string;
  position: string;
  phone: string;
  status: WorkerStatus;
  bloodType: MedicalProfile['bloodType'];
  lastSeen: string;
  joinDate: string;
  companyId: string;
  medicalProfile: MedicalProfile;
  avatar?: string;
  gpsLocation?: { lat: number; lng: number };
}

export interface Emergency {
  id: string;
  workerId: string;
  workerName: string;
  workerBadge: string;
  unit: string;
  type: EmergencyType;
  severity: Severity;
  status: EmergencyStatus;
  location: string;
  gpsCoordinates?: { lat: number; lng: number };
  startedAt: string;
  resolvedAt?: string;
  duration?: number; // minutes
  respondedBy?: string;
  notes?: string;
  companyId: string;
  medicalProfile?: MedicalProfile;
}

export interface SafetyOfficer {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  companyId: string;
  receivesAlerts: boolean;
}

export interface DashboardStats {
  totalWorkers: number;
  activeWorkers: number;
  liveEmergencies: number;
  monthlyIncidents: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface MonthlyData {
  month: string;
  incidents: number;
  resolved: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface AuthUser {
  employeeId: string;
  name: string;
  role: string;
  companyId: string;
  companyName: string;
  token: string;
}
