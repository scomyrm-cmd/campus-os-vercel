import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from './ui';
import { getDemoCode, setDemoCode, clearDemoCode, type AIStatus } from '../lib/aiClient';
/** Private-demo access gate: shown only when the server has CAMPUS_AI_DEMO_CODE set. */
export default function DemoUnlock({status,onChange}:{status:AIStatus;onChange:()=>void}){
 const {t}=useTranslation();const [code,setCode]=useState('');
 if(!status.demoAvailable||(status.ready&&status.mode!=='demo'))return null;
 if(status.mode==='demo')return <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/5 px-4 py-3"><p className="flex items-center gap-2 text-xs"><ShieldCheck size={15} className="text-success"/>{t('ai.demoUnlocked')}</p><Button size="sm" onClick={()=>{clearDemoCode();onChange();}}>{t('ai.demoLock')}</Button></div>;
 const wrong=!!getDemoCode();
 return <form onSubmit={e=>{e.preventDefault();if(!code.trim())return;setDemoCode(code);setCode('');onChange();}} className="mb-5 rounded-xl border border-line bg-surface px-4 py-3.5"><p className="flex items-center gap-2 text-xs font-semibold"><KeyRound size={15} className="text-primary"/>{t('ai.demoTitle')}</p><p className="mt-1 max-w-3xl text-[11px] leading-5 text-muted">{t('ai.demoDescription')}</p><div className="mt-3 flex max-w-md items-center gap-2"><Input type="password" dir="ltr" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} placeholder={t('ai.demoPlaceholder')} aria-label={t('ai.demoPlaceholder')}/><Button type="submit" variant="primary" disabled={!code.trim()}>{t('ai.demoUnlock')}</Button></div>{wrong&&<p role="alert" className="mt-2 text-[11px] text-danger">{t('ai.demoWrong')}</p>}</form>;
}
