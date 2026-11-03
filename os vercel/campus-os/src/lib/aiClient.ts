import type { SchoolSnapshot } from '../../shared/analytics';
export interface AIStatus {providerConfigured:boolean;modelConfigured:boolean;authConfigured:boolean;authenticated:boolean;ready:boolean;dataSource:'local-sanitized'|'supabase';demoAvailable:boolean;mode:'supabase'|'demo'|null;}
const AI_ENDPOINT='/api/ai';
export const disconnectedStatus:AIStatus={providerConfigured:false,modelConfigured:false,authConfigured:false,authenticated:false,ready:false,dataSource:'local-sanitized',demoAvailable:false,mode:null};
export function getVerifiedAccessToken():string|null{
 // Only a real Supabase session token is accepted. The demo session is never sent as authorization.
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||!/^sb-.+-auth-token$/.test(key))continue;try{const session=JSON.parse(localStorage.getItem(key)||'null');if(session?.access_token&&session?.expires_at>Date.now()/1000)return session.access_token;}catch{/* Ignore unrelated storage. */}}
 return null;
}
const DEMO_KEY='campus-ai-demo-code';
// Private-demo access code: kept only in this tab's sessionStorage and sent to YOUR server, never to Google. It is not the Gemini key.
export const getDemoCode=()=>{try{return sessionStorage.getItem(DEMO_KEY)||'';}catch{return '';}};
export const setDemoCode=(code:string)=>{try{sessionStorage.setItem(DEMO_KEY,code.trim());}catch{/* storage unavailable */}};
export const clearDemoCode=()=>{try{sessionStorage.removeItem(DEMO_KEY);}catch{/* storage unavailable */}};
export function accessHeaders():Record<string,string>|null{const token=getVerifiedAccessToken();if(token)return {Authorization:`Bearer ${token}`};const code=getDemoCode();return code?{'X-Campus-Demo-Code':code}:null;}
export async function fetchAIStatus():Promise<AIStatus>{const response=await fetch(AI_ENDPOINT,{headers:accessHeaders()||{},signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('network_error');return response.json();}
export async function requestAI(messages:{role:'user'|'assistant';content:string}[],language:string,snapshot:SchoolSnapshot,preferences:{demographics:boolean;itemDescriptions:boolean;activity:boolean}){
 const access=accessHeaders();if(!access)throw new Error('unauthorized');
 let response:Response;try{response=await fetch(AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',...access},body:JSON.stringify({messages,language,snapshot,preferences}),signal:AbortSignal.timeout(65000)});}catch{throw new Error('network_error');}
 let body:any;try{body=await response.json();}catch{throw new Error('invalid_response');}
 if(!response.ok)throw new Error(body?.error?.code||'server_error');if(typeof body.reply!=='string'||!body.reply.trim())throw new Error('invalid_response');return {reply:body.reply as string,tools:Array.isArray(body.tools)?body.tools.filter((v:unknown)=>typeof v==='string') as string[]:[]};
}
