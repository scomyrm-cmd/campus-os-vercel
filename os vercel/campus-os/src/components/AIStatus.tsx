import { useCallback, useEffect, useState } from 'react';
import { fetchAIStatus, disconnectedStatus, type AIStatus } from '../lib/aiClient';
export function useAIStatus(){const [status,setStatus]=useState<AIStatus>(disconnectedStatus);const [checking,setChecking]=useState(true);const [error,setError]=useState(false);const refresh=useCallback(async()=>{setChecking(true);setError(false);try{setStatus(await fetchAIStatus());}catch{setStatus(disconnectedStatus);setError(true);}finally{setChecking(false);}},[]);useEffect(()=>{void refresh();},[refresh]);return {status,checking,error,refresh};}
