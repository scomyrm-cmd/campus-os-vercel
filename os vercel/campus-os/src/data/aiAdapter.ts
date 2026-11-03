import type { SchoolData } from './types';
import type { Settings } from './settings';
import type { SchoolSnapshot } from '../../shared/analytics';
import { dateKey, shiftDate } from '../lib/utils';
export function redactPersonal(text:string,data?:SchoolData) {
 let result=text.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[redacted email]').replace(/(?:\+?\d[\d ().-]{7,}\d)/g,value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value:'[redacted number]').replace(/\b(?:born(?: on)?|dob|date of birth|né(?:e)? le|تاريخ الميلاد)\s*:?\s*\d{4}-\d{2}-\d{2}\b/gi,'[redacted birth date]');
 const names=new Set<string>();data?.students.forEach(s=>{names.add(s.studentId);names.add(`${s.firstName} ${s.lastName}`);if(s.firstName.length>2)names.add(s.firstName);if(s.lastName.length>2)names.add(s.lastName);});
 data?.items.forEach(i=>{if(i.reporterName.length>2)names.add(i.reporterName);if(i.claimedBy && i.claimedBy.length>2)names.add(i.claimedBy);});
 [...names].sort((a,b)=>b.length-a.length).forEach(n=>{const escaped=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');result=result.replace(new RegExp(escaped,'gi'),'[redacted]');});
 return {text:result,redacted:result!==text};
}
export interface AIContextAdapter { buildSnapshot():SchoolSnapshot; }
export class LocalAIContextAdapter implements AIContextAdapter {
 constructor(private data:SchoolData,private settings:Settings){}
 buildSnapshot():SchoolSnapshot {
  const {data,settings}=this;const today=dateKey(new Date(),settings.timeZone);const from=shiftDate(today,-364);
  const classes=new Map<string,number>();data.students.forEach(s=>classes.set(s.className,(classes.get(s.className)||0)+1));
  const students=new Map(data.students.map(s=>[s.id,s]));const rows=new Map<string,{date:string;className:string;status:'present'|'absent'|'late'|'excused';count:number}>();
  for(const a of data.attendance){if(a.date<from||a.date>today)continue;const student=students.get(a.studentId);if(!student)continue;const className=redactPersonal(student.className,data).text.slice(0,80);const key=`${a.date}|${className}|${a.status}`;const prev=rows.get(key);rows.set(key,{date:a.date,className,status:a.status,count:(prev?.count||0)+1});}
  const items={total:data.items.length,lost:0,found:0,claimed:0,archived:0,byCategory:{} as Record<string,number>};data.items.forEach(i=>{items[i.status]++;items.byCategory[i.category]=(items.byCategory[i.category]||0)+1;});
  const activities=new Map<string,{date:string;actionType:string;count:number}>();data.activities.forEach(a=>{const date=dateKey(new Date(a.timestamp),settings.timeZone);if(date<from||date>today)return;const key=`${date}|${a.actionType}`;const prev=activities.get(key);activities.set(key,{date,actionType:a.actionType,count:(prev?.count||0)+1});});
  const genderCounts:Record<string,number>={};if(settings.ai.demographics)data.students.forEach(s=>{if(s.gender)genderCounts[s.gender]=(genderCounts[s.gender]||0)+1;});
  return {version:1,generatedAt:new Date().toISOString(),timeZone:settings.timeZone,today,totalStudents:data.students.length,activeStudents:data.students.filter(s=>s.status==='active').length,classes:[...classes].map(([className,count])=>({className:redactPersonal(className,data).text.slice(0,80),count})),...(settings.ai.demographics?{genderCounts}:{}),coverage:{from,to:today},truncated:rows.size>15000,attendanceRows:[...rows.values()].slice(0,15000),items,
   ...(settings.ai.itemDescriptions?{itemDescriptions:data.items.slice(0,100).map(i=>({name:redactPersonal(i.itemName,data).text.slice(0,160),category:i.category,status:i.status,location:redactPersonal(i.location,data).text.slice(0,200),date:i.dateReported}))}:{}),
   ...(settings.ai.activity?{activityRows:[...activities.values()].slice(0,2000)}:{})};
 }
}
