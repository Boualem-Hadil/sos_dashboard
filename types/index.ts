// ============================================================
// Types & Interfaces for EchoAlert Dashboard
// ============================================================

export type EmergencyType = 'cardiac' | 'trauma' | 'fire' | 'respiratory' | 'neurological' | 'poisoning';
export type Severity = 'critical' | 'moderate' | 'minor';
export type WorkerStatus = 'active' | 'offline' | 'emergency';
export type EmergencyState = 'idle' | 'active' | 'resolved';
export type EmergencyStatus = 'resolved' | 'false_alarm' | 'active' | 'in_progress';
export type ResponderType = 'police' | 'samu' | 'fire' | 'other'; // NEW

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
  unitId?: string;
  departmentId?: string;
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

/** Live position snapshot broadcast by the backend on WORKER_LOCATION_UPDATED. */
export interface WorkerLocation {
  userId: string;
  lat: number;
  lng: number;
  /** "active" | "emergency" — derived server-side from active emergencies */
  status: WorkerStatus;
  fullName: string;
  employeeId: string;
  /** ISO timestamp of last received update */
  updatedAt: string;
}

export interface Emergency {
  id: string;
  workerId: string;
  workerName: string;
  workerBadge: string;
  workerPhone?: string;              // NEW: for direct call button
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
  voiceTranscript?: string;
  companyId: string;
  medicalProfile?: MedicalProfile;
  // Resolution fields
  responderType?: ResponderType;
  etaMinutes?: number;
  // Nearby-workers / ping feature fields (NEW)
  lastSeenActive?: string;           // ISO datetime
  pingStatus?: 'none' | 'sent' | 'acked' | 'expired';
  notResponding?: boolean;           // derived: ping expired + no ack
  heartbeatLat?: number;             // latest live GPS from heartbeat
  heartbeatLng?: number;
  // Multi-emergency: duplicate advisory (additive, optional)
  possible_duplicate_of?: string[];  // ids of nearby active emergencies
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

// NEW: nearby worker returned by GET /emergencies/{id}/nearby-workers
export interface NearbyWorker {
  id: string;
  full_name: string;
  phone: string | null;
  match_type: 'gps' | 'unit' | 'both' | 'company';
  distance_km: number | null;
  latitude: number | null;
  longitude: number | null;
}

// --- Company Admin ----

export interface CompanyAdminStats {
  total_officers: number;
  total_workers: number;
  total_departments: number;
  month_emergencies_open: number;
  month_emergencies_resolved: number;
  avg_response_minutes: number | null;
}

export interface Unit {
  id: string;
  department_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  units: Unit[];
}

export interface OfficerUser {
  id: string;
  full_name: string;
  employee_id: string;
  phone: string | null;
  role: 'safety_officer';
  is_active: boolean;
  created_at: string;
  last_seen: string | null;
  must_change_password?: boolean;
}

export interface NotificationRecipientCA {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  company_id: string | null;
}
