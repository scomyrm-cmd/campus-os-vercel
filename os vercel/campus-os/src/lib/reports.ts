import i18n from '../i18n';
import type { SchoolData } from '../data/types';
import type { Settings } from '../data/settings';
import { attendanceCounts, totalCount, attendanceRate, zeroCounts } from '../../shared/analytics';
import { dateKey, shiftDate, percent, downloadBlob } from './utils';
import { formatDate } from './format';
export type ReportType='daily'|'weekly'|'monthly'|'classes'|'items'|'activity';
export interface Report {type:ReportType;title:string;period:string;from:string;to:string;summary:string;statistics:{label:string;value:string}[];observations:string[];conclusion:string;hasData:boolean;generatedAt:string;}
export function reportRange(type:ReportType,anchor:string,settings:Settings):[string,string] {
 if(type==='weekly'){const weekday=new Date(anchor+'T12:00:00Z').getUTCDay();const offset=settings.weekStartsOn==='monday'?(weekday+6)%7:weekday;const from=shiftDate(anchor,-offset);return [from,shiftDate(from,6)];}
 if(['monthly','classes','items','activity'].includes(type)){const from=anchor.slice(0,7)+'-01';const d=new Date(from+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return [from,d.toISOString().slice(0,10)];}
 return [anchor,anchor];
}
export function buildReport(type:ReportType,anchor:string,data:SchoolData,settings:Settings,customRange?:[string,string]):Report {
 const t=i18n.t.bind(i18n);const [from,to]=customRange||reportRange(type,anchor,settings);const n=(v:number)=>new Intl.NumberFormat(settings.region).format(v);
 const base={type,title:t(`reports.${type}`),period:`${formatDate(from,settings)} — ${formatDate(to,settings)}`,from,to,conclusion:t('reports.conclusionText'),generatedAt:new Date().toISOString()};
 if(type==='items'){
  const items=data.items.filter(i=>i.dateReported>=from&&i.dateReported<=to);const counts={total:items.length,lost:items.filter(i=>i.status==='lost').length,found:items.filter(i=>i.status==='found').length,claimed:items.filter(i=>i.status==='claimed').length,archived:items.filter(i=>i.status==='archived').length};
  return {...base,hasData:items.length>0,summary:t('reports.itemSummary',counts),statistics:Object.entries(counts).map(([key,value])=>({label:t(key==='total'?'items.total':`items.${key}`),value:n(value)})),observations:[t('reports.observationItems',{count:n(counts.lost+counts.found)})]};
 }
 if(type==='activity'){
  const activities=data.activities.filter(a=>{const d=dateKey(new Date(a.timestamp),settings.timeZone);return d>=from&&d<=to;});const counts=new Map<string,number>();activities.forEach(a=>counts.set(a.actionType,(counts.get(a.actionType)||0)+1));
  return {...base,hasData:activities.length>0,summary:t('reports.activitySummary',{total:n(activities.length)}),statistics:[{label:t('activity.action'),value:n(activities.length)},...[...counts].map(([action,count])=>({label:t(`activity.${action}`),value:n(count)}))],observations:[t('reports.activitySummary',{total:n(activities.length)})]};
 }
 const records=data.attendance.filter(a=>a.date>=from&&a.date<=to);const c=attendanceCounts(records);const days=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;
 const activeIds=new Set(data.students.filter(s=>s.status==='active').map(s=>s.id));let unrecorded=0;
 for(let d=from;d<=to;d=shiftDate(d,1)){const active=data.students.filter(s=>s.status==='active'&&dateKey(new Date(s.createdAt),settings.timeZone)<=d);const recorded=new Set(records.filter(a=>a.date===d&&activeIds.has(a.studentId)).map(a=>a.studentId));unrecorded+=active.filter(s=>!recorded.has(s.id)).length;}
 const classes=new Map<string,{className:string;absent:number;recorded:number;absenceRate:number}>();data.students.forEach(s=>{const rows=records.filter(a=>a.studentId===s.id);if(!rows.length)return;const counts=attendanceCounts(rows);classes.set(s.className,{className:s.className,absent:counts.absent,recorded:totalCount(counts),absenceRate:percent(counts.absent,totalCount(counts))});});
 const sorted=[...classes.values()].sort((a,b)=>b.absenceRate-a.absenceRate);
 return {...base,hasData:records.length>0,summary:t('reports.attendanceSummary',{recorded:n(totalCount(c)),present:n(c.present+c.late),absent:n(c.absent),excused:n(c.excused)}),statistics:[{label:t('attendance.dailyRate'),value:`${n(attendanceRate(c))}%`},{label:t('attendance.present'),value:n(c.present)},{label:t('attendance.late'),value:n(c.late)},{label:t('attendance.absent'),value:n(c.absent)},{label:t('attendance.excused'),value:n(c.excused)},{label:t('attendance.totalAbsences'),value:n(c.absent+c.excused)}],observations:[t('reports.observationRate',{rate:n(attendanceRate(c)),unrecorded:n(unrecorded)}),t('reports.observationClasses',{count:n(classes.size)}),...(type==='classes'?sorted.slice(0,8).map(c=>`${c.className}: ${c.absenceRate}% (${c.absent}/${c.recorded})`):[])]};
}
let fontPromise:Promise<string>|null=null;
async function arabicFont(){if(!fontPromise)fontPromise=fetch('/fonts/NotoSansArabic-Regular.ttf').then(r=>{if(!r.ok)throw new Error('font');return r.arrayBuffer();}).then(buffer=>{const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}).catch(e=>{fontPromise=null;throw e;});return fontPromise;}
export async function exportReportPDF(report:Report,settings:Settings){
 const {jsPDF}=await import('jspdf');const doc=new jsPDF();const rtl=settings.language==='ar';
 if(rtl){doc.addFileToVFS('NotoSansArabic-Regular.ttf',await arabicFont());doc.addFont('NotoSansArabic-Regular.ttf','NotoSansArabic','normal');doc.setFont('NotoSansArabic');}else doc.setFont('helvetica');
 const left=20,right=190,width=170;const x=rtl?right:left;const align=rtl?'right':'left';let y=24;
 const text=(value:string,size=10,color:[number,number,number]=[71,85,105],bold=false)=>{doc.setFontSize(size);doc.setTextColor(...color);if(!rtl)doc.setFont('helvetica',bold?'bold':'normal');const lines=doc.splitTextToSize(value,width) as string[];for(const line of lines){if(y>274){doc.addPage();y=22;}doc.text(line,x,y,{align});y+=size*.48;}y+=3;};
 doc.setFillColor(37,99,235);doc.roundedRect(20,18,9,9,2,2,'F');doc.setTextColor(255,255,255);doc.setFontSize(8);doc.text('C',24.5,24.2,{align:'center'});doc.setTextColor(15,23,42);doc.setFontSize(15);doc.text('Campus OS',rtl?190:34,24,{align});y=43;
 text(settings.schoolName||i18n.t('common.schoolName'),11);text(report.title,23,[15,23,42],true);text(`${i18n.t('reports.period')}: ${report.period}`,10);text(i18n.t('ai.sourceMeasured'),9,[37,99,235]);y+=4;
 text(i18n.t('reports.summary'),13,[15,23,42],true);text(report.summary,11);y+=3;text(i18n.t('reports.statistics'),13,[15,23,42],true);
 for(let i=0;i<report.statistics.length;i+=2){if(y>261){doc.addPage();y=22;}const top=y;doc.setFillColor(248,250,252);doc.setDrawColor(226,232,240);doc.roundedRect(20,top,82,23,2,2,'FD');if(report.statistics[i+1])doc.roundedRect(108,top,82,23,2,2,'FD');report.statistics.slice(i,i+2).forEach((stat,j)=>{const sx=rtl?185-j*88:97-j*88;doc.setFontSize(9);doc.setTextColor(100,116,139);doc.text(doc.splitTextToSize(stat.label,73),sx,top+7,{align:rtl?'right':'left'});doc.setFontSize(15);doc.setTextColor(15,23,42);doc.text(stat.value,sx,top+17,{align:rtl?'right':'left'});});y+=28;}
 y+=3;text(i18n.t('reports.observations'),13,[15,23,42],true);report.observations.forEach(o=>text('• '+o,10));y+=3;text(i18n.t('reports.conclusion'),13,[15,23,42],true);text(report.conclusion,10);y+=4;text(i18n.t('reports.measuredNotice'),9);
 const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setDrawColor(226,232,240);doc.line(20,283,190,283);doc.setFontSize(8);doc.setTextColor(100,116,139);doc.text(`Campus OS · ${formatDate(report.generatedAt,settings)}`,rtl?190:20,289,{align});doc.text(`${p} / ${pages}`,rtl?20:190,289,{align:rtl?'left':'right'});}
 downloadBlob(doc.output('blob'),`campus-os-${report.type}-${report.from}.pdf`);
}
