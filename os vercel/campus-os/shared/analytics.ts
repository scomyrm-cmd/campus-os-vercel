import { z } from 'zod';
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v);
export const statusSchema=z.enum(['present','absent','late','excused']);
export const countsSchema=z.object({present:z.number().int().nonnegative(),absent:z.number().int().nonnegative(),late:z.number().int().nonnegative(),excused:z.number().int().nonnegative()});
export const snapshotSchema=z.object({
  version:z.literal(1),generatedAt:z.string().datetime(),timeZone:z.string().max(80).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}}),today:dateSchema,
  totalStudents:z.number().int().nonnegative().max(1000000),activeStudents:z.number().int().nonnegative().max(1000000),
  classes:z.array(z.object({className:z.string().min(1).max(80),count:z.number().int().nonnegative()})).max(200),
  genderCounts:z.record(z.string(),z.number().int().nonnegative()).optional(),
  coverage:z.object({from:dateSchema,to:dateSchema}),truncated:z.boolean().optional(),
  attendanceRows:z.array(z.object({date:dateSchema,className:z.string().min(1).max(80),status:statusSchema,count:z.number().int().positive()})).max(15000),
  items:z.object({total:z.number().int().nonnegative(),lost:z.number().int().nonnegative(),found:z.number().int().nonnegative(),claimed:z.number().int().nonnegative(),archived:z.number().int().nonnegative(),byCategory:z.record(z.string(),z.number().int().nonnegative())}),
  itemDescriptions:z.array(z.object({name:z.string().max(160),category:z.string().max(60),status:z.string().max(20),location:z.string().max(200),date:dateSchema})).max(100).optional(),
  activityRows:z.array(z.object({date:dateSchema,actionType:z.string().max(80),count:z.number().int().positive()})).max(2000).optional(),
}).strict();
export type SchoolSnapshot=z.infer<typeof snapshotSchema>;
export type Counts=z.infer<typeof countsSchema>;
export const zeroCounts=():Counts=>({present:0,absent:0,late:0,excused:0});
export const totalCount=(c:Counts)=>c.present+c.absent+c.late+c.excused;
export const attendanceRate=(c:Counts)=>totalCount(c)?Math.round((c.present+c.late)/totalCount(c)*1000)/10:0;
export function attendanceCounts(records:{status:keyof Counts}[]) {const c=zeroCounts();records.forEach(r=>c[r.status]++);return c;}
export function summarizeSnapshot(s:SchoolSnapshot,from:string,to:string,className?:string) {
 const c=zeroCounts(); const byDate=new Map<string,Counts>();const byClass=new Map<string,Counts>();
 for(const r of s.attendanceRows){if(r.date<from||r.date>to||(className&&r.className!==className))continue;c[r.status]+=r.count;const day=byDate.get(r.date)||zeroCounts();day[r.status]+=r.count;byDate.set(r.date,day);const group=byClass.get(r.className)||zeroCounts();group[r.status]+=r.count;byClass.set(r.className,group);}
 const summary=(counts:Counts)=>({...counts,recorded:totalCount(counts),rate:attendanceRate(counts)});
 return {...summary(c),byClass:[...byClass].map(([className,counts])=>({className,...summary(counts),absenceRate:summary(counts).recorded?Math.round(counts.absent/summary(counts).recorded*1000)/10:0})).sort((a,b)=>b.absenceRate-a.absenceRate),byDate:[...byDate].sort(([a],[b])=>a.localeCompare(b)).map(([date,counts])=>({date,...summary(counts)}))};
}
export function inCoverage(s:SchoolSnapshot,from:string,to:string) {return from>=s.coverage.from && to<=s.coverage.to && from<=to;}
export function executeQuery(s:SchoolSnapshot,name:string,args:Record<string,string>) {
 const date=args.date || s.today; const from=args.from || date; const to=args.to || date;
 switch(name){
  case 'get_school_overview':return {totalStudents:s.totalStudents,activeStudents:s.activeStudents,classes:s.classes,genderCounts:s.genderCounts,attendance:summarizeSnapshot(s,s.today,s.today),items:s.items,coverage:s.coverage,partial:!!s.truncated};
  case 'get_attendance_summary':return inCoverage(s,date,date)?{date,...summarizeSnapshot(s,date,date)}:{available:false,date,reason:'Date outside provided data coverage'};
  case 'get_attendance_by_class':return inCoverage(s,date,date)?{date,classes:summarizeSnapshot(s,date,date).byClass}:{available:false,date,reason:'Date outside provided data coverage'};
  case 'get_attendance_trends':return inCoverage(s,from,to)&&Math.round((Date.parse(to)-Date.parse(from))/86400000)<367?{from,to,...summarizeSnapshot(s,from,to)}:{available:false,reason:'Range outside provided data coverage or longer than 366 days',coverage:s.coverage};
  case 'get_lost_found_summary':return {...s.items,unclaimed:s.items.lost+s.items.found};
  case 'get_unclaimed_items_summary':return {unclaimed:s.items.lost+s.items.found,items:s.itemDescriptions?.filter(i=>i.status==='lost'||i.status==='found')||[],descriptionsAvailable:!!s.itemDescriptions};
  case 'get_activity_summary':return s.activityRows?(inCoverage(s,from,to)?{from,to,actions:s.activityRows.filter(r=>r.date>=from&&r.date<=to),total:s.activityRows.filter(r=>r.date>=from&&r.date<=to).reduce((n,r)=>n+r.count,0)}:{available:false,reason:'Date outside provided data coverage'}):{available:false,reason:'Activity data access is disabled'};
  default:throw new Error('unknown_tool');
 }
}
