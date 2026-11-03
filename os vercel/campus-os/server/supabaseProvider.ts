import { createClient } from '@supabase/supabase-js';
import type { SchoolSnapshot } from '../shared/analytics.js';
import type { ServerEnvironment } from './security.js';
const day=(date:Date,tz:string)=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const v=(type:string)=>p.find(x=>x.type===type)!.value;return `${v('year')}-${v('month')}-${v('day')}`;};
export async function supabaseSnapshot(token:string,env:ServerEnvironment,timeZone:string,options:{demographics:boolean;itemDescriptions:boolean;activity:boolean}):Promise<SchoolSnapshot>{
 const client=createClient(env.SUPABASE_URL!,env.SUPABASE_ANON_KEY!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 async function all<T>(table:string,columns:string):Promise<T[]>{const result:T[]=[];for(let from=0;from<50000;from+=1000){const {data,error}=await client.from(table).select(columns).range(from,from+999);if(error)throw new Error('unauthorized');result.push(...(data as unknown as T[]));if(!data||data.length<1000)return result;}throw new Error('request_too_large');}
 const today=day(new Date(),timeZone);const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-364);const from=day(start,timeZone);
 const [students,attendance,items,activities]=await Promise.all([
  all<{id:string;class_name:string;gender:string|null;status:string}>('students','id,class_name,gender,status'),
  all<{student_id:string;date:string;status:'present'|'absent'|'late'|'excused'}>('attendance',`student_id,date,status`),
  all<{item_name:string;category:string;status:'lost'|'found'|'claimed'|'archived';location:string;date_reported:string}>('items',options.itemDescriptions?'item_name,category,status,location,date_reported':'category,status'),
  ...(options.activity?[all<{action_type:string;timestamp:string}>('activities','action_type,timestamp')]:[Promise.resolve([] as {action_type:string;timestamp:string}[])])
 ]);
 const studentMap=new Map(students.map(s=>[s.id,s]));const classes=new Map<string,number>();const genders:Record<string,number>={};students.forEach(s=>{classes.set(s.class_name,(classes.get(s.class_name)||0)+1);if(options.demographics&&s.gender)genders[s.gender]=(genders[s.gender]||0)+1;});
 const rows=new Map<string,SchoolSnapshot['attendanceRows'][number]>();attendance.filter(a=>a.date>=from&&a.date<=today).forEach(a=>{const s=studentMap.get(a.student_id);if(!s)return;const key=`${a.date}|${s.class_name}|${a.status}`;const old=rows.get(key);rows.set(key,{date:a.date,className:s.class_name.slice(0,80),status:a.status,count:(old?.count||0)+1});});
 const summary={total:items.length,lost:0,found:0,claimed:0,archived:0,byCategory:{} as Record<string,number>};items.forEach(i=>{summary[i.status]++;summary.byCategory[i.category]=(summary.byCategory[i.category]||0)+1;});
 const actionRows=new Map<string,{date:string;actionType:string;count:number}>();activities.forEach(a=>{const date=day(new Date(a.timestamp),timeZone);if(date<from||date>today)return;const key=date+a.action_type;const old=actionRows.get(key);actionRows.set(key,{date,actionType:a.action_type,count:(old?.count||0)+1});});
 let tzValid=true;try{new Intl.DateTimeFormat('en',{timeZone});}catch{tzValid=false;}const tz=tzValid?timeZone:'Africa/Casablanca';
 return {version:1,generatedAt:new Date().toISOString(),timeZone:tz,today,totalStudents:students.length,activeStudents:students.filter(s=>s.status==='active').length,classes:[...classes].map(([className,count])=>({className:className.slice(0,80),count})),...(options.demographics?{genderCounts:genders}:{}),coverage:{from,to:today},attendanceRows:[...rows.values()].slice(0,15000),items:summary,...(options.itemDescriptions?{itemDescriptions:items.slice(0,100).map(i=>({name:i.item_name.slice(0,160),category:i.category,status:i.status,location:i.location.slice(0,200),date:i.date_reported}))}:{}),...(options.activity?{activityRows:[...actionRows.values()].slice(0,2000)}:{})};
}
