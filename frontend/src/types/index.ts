export interface SMBConfig {
  smb_id: string;
  timezone: string;
  duration: number;
  start_time: string;
  end_time: string;
  days: string;
  excluded_days: { days: Array<{ day: string; message: string }> };
}

export interface Slot {
  slot_start: string;
  slot_end: string;
}

export interface Appointment {
  id: string;
  smb_id: string;
  lead_id: string;
  status: string;
  slot_start: string;
  slot_end: string;
  lead_name: string;
  purpose?: string | null;
  comment?: string | null;
  email?: string | null;
}

export interface SMBConfigUpdatePayload {
  timezone?: string;
  duration?: number;
  start_time?: string;
  end_time?: string;
  days?: string;
  excluded_days?: { days: Array<{ day: string; message: string }> };
}

export interface AppointmentCreatePayload {
  smb_id: string;
  lead_name: string;
  slot_start: string;
  slot_end: string;
  purpose?: string | null;
  comment?: string | null;
  email?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export type AppointmentStatusFilter = "ALL" | "ACTIVE" | "CANCELLED";

export const DEFAULT_SMB_ID = "00000000-0000-0000-0000-000000000001";

export const PURPOSE_OPTIONS = [
  "Consultation",
  "Follow-up",
  "Demo",
  "Support",
  "Other",
] as const;

export type PurposeOption = (typeof PURPOSE_OPTIONS)[number];
