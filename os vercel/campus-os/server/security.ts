export class ApiError extends Error { constructor(public status:number,public code:string){super(code);} }
export interface ServerEnvironment { GEMINI_API_KEY?:string;GEMINI_MODEL?:string;SUPABASE_URL?:string;SUPABASE_ANON_KEY?:string;SCHOOL_DATA_SOURCE?:string;CAMPUS_AI_DEMO_CODE?:string; }
export async function verifyAdministrator(request:Request,env:ServerEnvironment,fetcher:typeof fetch=fetch):Promise<{id:string}> {
 if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY)throw new ApiError(503,'auth_not_configured');
 const authorization=request.headers.get('authorization')||'';const token=authorization.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!token||token.length>8192||token.split('.').length!==3)throw new ApiError(401,'unauthorized');
 let base:URL;try{base=new URL(env.SUPABASE_URL);}catch{throw new ApiError(503,'auth_not_configured');}
 if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw new ApiError(503,'auth_not_configured');
 try{
  const response=await fetcher(`${base.origin}/auth/v1/user`,{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});
  if(response.status===401||response.status===403)throw new ApiError(401,'unauthorized');
  if(!response.ok)throw new ApiError(503,'server_error');
  const user=await response.json();
  // Only app_metadata is writable by the authentication service, never user_metadata.
  if(typeof user.id!=='string'||!['administrator','admin'].includes(user.app_metadata?.role))throw new ApiError(403,'unauthorized');
  return {id:user.id};
 }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(503,'network_error');}
}
const buckets=new Map<string,number[]>();
export function rateLimit(key:string,limit=20,now=Date.now()){
 for(const [id,times] of buckets)if(!times.length||times[times.length-1]<now-60000)buckets.delete(id);
 const hits=(buckets.get(key)||[]).filter(t=>t>now-60000);if(hits.length>=limit)throw new ApiError(429,'rate_limited');hits.push(now);buckets.set(key,hits);
}
export function resetRateLimits(){buckets.clear();}
export async function readLimitedBody(request:Request,max=2097152){
 if(Number(request.headers.get('content-length')||0)>max)throw new ApiError(413,'request_too_large');
 if(!request.body)return '';
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>max){await reader.cancel();throw new ApiError(413,'request_too_large');}chunks.push(value);}}finally{reader.releaseLock();}
 return new TextDecoder().decode(Buffer.concat(chunks));
}

// --- Interim private-demo gate -------------------------------------------------------------
// Optional and OFF by default. When CAMPUS_AI_DEMO_CODE (8+ chars) is set on the server, a request that
// carries the same code in the X-Campus-Demo-Code header may use Campus AI WITHOUT Supabase Auth.
// It is a shared password checked on the server (never the Gemini key). It is NOT per-user authentication:
// replace it with Supabase Auth before real use. Demo access can only use the minimized local snapshot.
export interface AccessResult { id:string; demo:boolean }
const safeEqual=(a:string,b:string)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;};
// Client IP used for rate limiting. On Vercel the edge sets x-real-ip / x-vercel-forwarded-for and overwrites
// x-forwarded-for, so these values come from the platform and cannot be forged by the caller. Never trust a header
// that only another host sets (the previous x-nf-client-connection-ip was Netlify-only and, on Vercel, would have let a
// caller pick their own "IP" and sidestep the limiter).
export const clientIp=(request:Request)=>request.headers.get('x-real-ip')?.trim()||request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
export const demoEnabled=(env:ServerEnvironment)=>(env.CAMPUS_AI_DEMO_CODE||'').length>=8;
export function demoCodeMatches(request:Request,env:ServerEnvironment){const sent=request.headers.get('x-campus-demo-code')||'';return demoEnabled(env)&&sent.length>0&&safeEqual(sent,env.CAMPUS_AI_DEMO_CODE!);}
export async function verifyAccess(request:Request,env:ServerEnvironment,fetcher:typeof fetch=fetch):Promise<AccessResult>{
 if(request.headers.get('authorization')&&env.SUPABASE_URL&&env.SUPABASE_ANON_KEY){const user=await verifyAdministrator(request,env,fetcher);return {id:user.id,demo:false};}
 if(demoEnabled(env)){if(demoCodeMatches(request,env))return {id:`demo:${clientIp(request)}`,demo:true};throw new ApiError(401,'unauthorized');}
 const user=await verifyAdministrator(request,env,fetcher);return {id:user.id,demo:false};
}
