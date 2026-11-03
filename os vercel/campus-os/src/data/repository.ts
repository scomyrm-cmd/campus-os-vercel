import { emptyData } from './types';
import type { SchoolData, Student, Attendance, LostFoundItem, Activity, Notification, Claim, ActionType } from './types';
import { KEYS, readStorage, writeStorage } from '../lib/storage';
import { uid } from '../lib/utils';
import type { Settings } from './settings';

export interface SchoolRepository {
  getSnapshot(): SchoolData;
  subscribe(listener: () => void): () => void;
  saveStudent(student: Student): Student;
  deleteStudent(id: string): void;
  upsertAttendance(record: Attendance): Attendance;
  saveItem(item: LostFoundItem): LostFoundItem;
  claimItem(id: string, claim: Claim): void;
  archiveItem(id: string, archived: boolean): void;
  deleteItem(id: string): void;
  markNotification(id: string): void;
  markAllNotifications(): void;
  logSettings(section: string): void;
}
export function validateData(value: unknown): SchoolData {
  const d=value as SchoolData;
  if(!d || d.version!==1 || !['students','attendance','items','activities','notifications'].every(k=>Array.isArray(d[k as keyof SchoolData]))) throw new Error('storageUnavailable');
  return d;
}
export class LocalSchoolRepository implements SchoolRepository {
  private data: SchoolData;
  private listeners=new Set<() => void>();
  private actor='Administrator';
  private preferences: Settings['notifications']={absence:true,lost:true,found:true,claimed:true,system:true,activity:false};
  constructor(initial?: SchoolData) { this.data=initial ?? validateData(readStorage(KEYS.data,emptyData())); }
  getSnapshot=()=>this.data;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  configure(actor:string, preferences:Settings['notifications']) {this.actor=actor;this.preferences=preferences;}
  refresh=()=>{this.data=validateData(readStorage(KEYS.data,emptyData()));this.listeners.forEach(f=>f());};
  private commit(next:SchoolData, action?:{type:ActionType;params:Record<string,string>;entityType?:Activity['entityType'];entityId?:string}, notification?:Pick<Notification,'kind'|'params'|'link'>) {
    if(action) next.activities.unshift({id:uid(),actionType:action.type,description:`activity.log.${action.type}`,administrator:this.actor,timestamp:new Date().toISOString(),params:action.params,entityType:action.entityType,entityId:action.entityId});
    let event=notification;
    if(!event && action && this.preferences.activity && action.entityType && action.entityType!=='settings') {
      const attendance=action.entityType==='attendance'?next.attendance.find(a=>a.id===action.entityId):undefined;
      const link=action.entityType==='student'?`/students?student=${action.entityId}`:action.entityType==='item'?`/lost-found?item=${action.entityId}`:attendance?`/attendance?date=${attendance.date}&student=${attendance.studentId}`:undefined;
      event={kind:'activity',params:action.params,link};
    }
    if(event && this.preferences[event.kind]) next.notifications.unshift({id:uid(),title:`activity.${action?.type || 'settingsUpdated'}`,description:`activity.log.${action?.type || 'settingsUpdated'}`,read:false,createdAt:new Date().toISOString(),...event});
    // Persist before publishing: a storage failure never creates an in-memory-only save.
    writeStorage(KEYS.data,next); this.data=next; this.listeners.forEach(f=>f());
  }
  saveStudent(student:Student) {
    if(this.data.students.some(s=>s.studentId.toLowerCase()===student.studentId.toLowerCase() && s.id!==student.id)) throw new Error('studentIdUnique');
    const exists=this.data.students.some(s=>s.id===student.id);
    const next={...this.data,students:exists?this.data.students.map(s=>s.id===student.id?student:s):[student,...this.data.students]};
    this.commit(next,{type:exists?'studentEdited':'studentCreated',params:{name:`${student.firstName} ${student.lastName}`,class:student.className},entityType:'student',entityId:student.id});
    return student;
  }
  deleteStudent(id:string) {
    const student=this.data.students.find(s=>s.id===id);if(!student)return;
    this.commit({...this.data,students:this.data.students.filter(s=>s.id!==id),attendance:this.data.attendance.filter(a=>a.studentId!==id),items:this.data.items.map(i=>i.reporterStudentId===id?{...i,reporterStudentId:undefined}:i)}, {type:'studentDeleted',params:{name:`${student.firstName} ${student.lastName}`}});
  }
  upsertAttendance(record:Attendance) {
    if(!this.data.students.some(s=>s.id===record.studentId)) throw new Error('required');
    const existing=this.data.attendance.find(a=>a.studentId===record.studentId && a.date===record.date);
    const saved=existing?{...record,id:existing.id}:record;
    const next={...this.data,attendance:existing?this.data.attendance.map(a=>a.id===existing.id?saved:a):[saved,...this.data.attendance]};
    const student=this.data.students.find(s=>s.id===record.studentId)!;
    this.commit(next,{type:record.status==='absent'?'absenceRecorded':'attendanceUpdated',params:{name:`${student.firstName} ${student.lastName}`,status:record.status},entityType:'attendance',entityId:saved.id},record.status==='absent'?{kind:'absence',params:{name:`${student.firstName} ${student.lastName}`},link:`/attendance?date=${record.date}&student=${record.studentId}`}:undefined);
    return saved;
  }
  saveItem(item:LostFoundItem) {
    const exists=this.data.items.some(i=>i.id===item.id);
    this.commit({...this.data,items:exists?this.data.items.map(i=>i.id===item.id?item:i):[item,...this.data.items]}, {type:exists?'itemEdited':item.reportType==='lost'?'lostReported':'foundReported',params:{name:item.itemName},entityType:'item',entityId:item.id}, !exists?{kind:item.reportType,params:{name:item.itemName},link:`/lost-found?item=${item.id}`}:undefined);
    return item;
  }
  claimItem(id:string,claim:Claim) {
    const item=this.data.items.find(i=>i.id===id);if(!item)return;
    this.commit({...this.data,items:this.data.items.map(i=>i.id===id?{...i,status:'claimed',claimedBy:claim.collectedBy,claimedAt:claim.date,claim,updatedAt:new Date().toISOString()}:i)}, {type:'itemClaimed',params:{name:item.itemName,person:claim.collectedBy},entityType:'item',entityId:id},{kind:'claimed',params:{name:item.itemName},link:`/lost-found?item=${id}`});
  }
  archiveItem(id:string,archived:boolean) {
    const item=this.data.items.find(i=>i.id===id);if(!item)return;
    const status=archived?'archived':item.claim?'claimed':item.reportType;
    this.commit({...this.data,items:this.data.items.map(i=>i.id===id?{...i,status,updatedAt:new Date().toISOString()}:i)}, {type:archived?'itemArchived':'itemEdited',params:{name:item.itemName},entityType:'item',entityId:id});
  }
  deleteItem(id:string) {
    const item=this.data.items.find(i=>i.id===id);if(!item)return;
    this.commit({...this.data,items:this.data.items.filter(i=>i.id!==id)},{type:'itemDeleted',params:{name:item.itemName}});
  }
  markNotification(id:string) {this.commit({...this.data,notifications:this.data.notifications.map(n=>n.id===id?{...n,read:true}:n)});}
  markAllNotifications() {this.commit({...this.data,notifications:this.data.notifications.map(n=>({...n,read:true}))});}
  logSettings(section:string) {this.commit({...this.data},{type:'settingsUpdated',params:{section},entityType:'settings'},{kind:'system',params:{section},link:`/settings?section=${section}`});}
}
export const schoolRepository=new LocalSchoolRepository();
