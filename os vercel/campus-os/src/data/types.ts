export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type ItemStatus = 'lost' | 'found' | 'claimed' | 'archived';
export type Category = 'electronics' | 'clothing' | 'bags' | 'books' | 'accessories' | 'schoolSupplies' | 'other';
export type ActionType = 'studentCreated' | 'studentEdited' | 'studentDeleted' | 'attendanceUpdated' | 'absenceRecorded' | 'lostReported' | 'foundReported' | 'itemEdited' | 'itemClaimed' | 'itemArchived' | 'itemDeleted' | 'settingsUpdated';
export interface Student {
  id: string; studentId: string; firstName: string; lastName: string; className: string;
  gender?: 'female' | 'male' | 'unspecified'; dateOfBirth?: string; guardianContact?: string;
  notes?: string; status: 'active' | 'inactive'; createdAt: string;
}
export interface Attendance {
  id: string; studentId: string; date: string; status: AttendanceStatus; reason?: string;
  notes?: string; time?: string; absenceType?: 'medical' | 'family' | 'authorized' | 'unexplained' | 'other'; updatedAt: string;
}
export interface Claim { collectedBy: string; studentId?: string; date: string; notes?: string }
export interface LostFoundItem {
  id: string; itemName: string; category: Category; description: string; reportType: 'lost' | 'found';
  dateReported: string; location: string; reporterName: string; contactInformation?: string;
  reporterStudentId?: string; imageUrl?: string; status: ItemStatus; claimedBy?: string;
  claimedAt?: string; claim?: Claim; createdAt: string; updatedAt: string;
}
export interface Activity {
  id: string; actionType: ActionType; description: string; administrator: string; timestamp: string;
  params?: Record<string, string>; entityType?: 'student' | 'attendance' | 'item' | 'settings'; entityId?: string;
}
export type NotificationKind = 'absence' | 'lost' | 'found' | 'claimed' | 'system' | 'activity';
export interface Notification {
  id: string; title: string; description: string; read: boolean; createdAt: string;
  kind: NotificationKind; params?: Record<string,string>; link?: string;
}
export interface SchoolData {
  version: 1; students: Student[]; attendance: Attendance[]; items: LostFoundItem[];
  activities: Activity[]; notifications: Notification[];
}
export interface Message { id: string; role: 'user' | 'assistant'; content: string; createdAt: string; tools?: string[] }
export interface Conversation { id: string; title: string; messages: Message[]; createdAt: string; updatedAt: string }
export const emptyData = (): SchoolData => ({ version: 1, students: [], attendance: [], items: [], activities: [], notifications: [] });
export const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
export const CATEGORIES: Category[] = ['electronics', 'clothing', 'bags', 'books', 'accessories', 'schoolSupplies', 'other'];
