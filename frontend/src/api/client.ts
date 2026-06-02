import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type {
  Appointment,
  AppointmentCreatePayload,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  SMBConfig,
  SMBConfigUpdatePayload,
  Slot,
  TokenResponse,
} from "../types";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "access_token";

export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/auth/login", payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/auth/register", payload);
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/api/auth/me");
  return data;
}

export async function getConfig(smbId: string): Promise<SMBConfig> {
  const { data } = await apiClient.get<SMBConfig>(`/api/booking/config/${smbId}`);
  return data;
}

export async function createConfig(): Promise<SMBConfig> {
  const { data } = await apiClient.post<SMBConfig>("/api/booking/config");
  return data;
}

export async function updateConfig(
  smbId: string,
  payload: SMBConfigUpdatePayload
): Promise<SMBConfig> {
  const { data } = await apiClient.put<SMBConfig>(
    `/api/booking/config/${smbId}`,
    payload
  );
  return data;
}

export async function getSlots(
  smbId: string,
  minStart: string,
  maxEnd: string
): Promise<Slot[]> {
  const { data } = await apiClient.get<Slot[]>("/api/booking/slots", {
    params: {
      smb_id: smbId,
      min_start_time: minStart,
      max_end_time: maxEnd,
    },
  });
  return data;
}

export async function createAppointment(
  payload: AppointmentCreatePayload
): Promise<Appointment> {
  const { data } = await apiClient.post<Appointment>(
    "/api/booking/appointments",
    payload
  );
  return data;
}

export async function getAppointments(
  smbId: string,
  status?: "ACTIVE" | "CANCELLED"
): Promise<Appointment[]> {
  const { data } = await apiClient.get<Appointment[]>("/api/booking/appointments", {
    params: {
      smb_id: smbId,
      ...(status ? { status } : {}),
    },
  });
  return data;
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  const { data } = await apiClient.patch<Appointment>(
    `/api/booking/appointments/${id}/cancel`
  );
  return data;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string | { msg: string }[] }>;
    const detail = axiosError.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    return axiosError.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
