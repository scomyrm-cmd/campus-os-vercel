import type { NotificationKind } from './types';
export type Language = 'en' | 'fr' | 'ar';
export interface Settings {
  schoolName: string; schoolLogo: string; schoolAddress: string; city: string; country: string;
  schoolEmail: string; schoolPhone: string; schoolWebsite: string; academicYear: string;
  displayName: string; username: string; role: string; avatar: string;
  theme: 'light' | 'dark' | 'system'; language: Language;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'localized';
  timeFormat: '12' | '24'; timeZone: string; region: string; weekStartsOn: 'monday' | 'sunday';
  defaultAttendanceView: 'daily' | 'history' | 'reports'; pageSize: number;
  notifications: Record<NotificationKind, boolean>;
  ai: { enabled: boolean; demographics: boolean; itemDescriptions: boolean; activity: boolean; saveHistory: boolean };
}
export const defaultSettings = (): Settings => ({
  schoolName: '', schoolLogo: '', schoolAddress: '', city: '', country: 'Morocco',
  schoolEmail: '', schoolPhone: '', schoolWebsite: '', academicYear: `${new Date().getFullYear()}–${new Date().getFullYear()+1}`,
  displayName: 'Administrator', username: 'admin', role: 'Administrator', avatar: '',
  theme: 'light', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '24',
  timeZone: 'Africa/Casablanca', region: 'en-MA', weekStartsOn: 'monday', defaultAttendanceView: 'daily', pageSize: 10,
  notifications: { absence: true, lost: true, found: true, claimed: true, system: true, activity: false },
  ai: { enabled: true, demographics: false, itemDescriptions: false, activity: false, saveHistory: true },
});
