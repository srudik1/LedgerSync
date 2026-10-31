import {protectTokens,revealTokens} from "./intuit-token-store.js";
const endpoint="https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
async function exchange(env,values){
 const response=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Basic "+btoa(env.INTUIT_CLIENT_ID+":"+env.INTUIT_CLIENT_SECRET),"Accept":"application/json","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(values)});
 if(!response.ok)throw Error("intuit_exchange_failed");
 const data=await response.json();
 if(!data.access_token||!data.refresh_token||!Number.isFinite(Number(data.expires_in)))throw Error("invalid_intuit_response");
 return data;
}
const expiry=token=>new Date(Date.now()+Math.max(0,Number(token.expires_in)-60)*1000).toISOString();
export async function connectIntuitRealm(env,realm,code){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(realm))throw Error("invalid_realm");
 const token=await exchange(env,{grant_type:"authorization_code",code,redirect_uri:env.INTUIT_REDIRECT_URI});
 await env.DB.prepare("INSERT INTO intuit_connections (realm_id,encrypted_tokens,access_expires_at) VALUES (?,?,?) ON CONFLICT(realm_id) DO UPDATE SET encrypted_tokens=excluded.encrypted_tokens,access_expires_at=excluded.access_expires_at,version=intuit_connections.version+1").bind(realm,await protectTokens(env,realm,{access_token:token.access_token,refresh_token:token.refresh_token}),expiry(token)).run();
}
export async function getIntuitAccessToken(env,realm){
 const row=await env.DB.prepare("SELECT encrypted_tokens,access_expires_at,version FROM intuit_connections WHERE realm_id=?").bind(realm).first();
 if(!row)throw Error("realm_not_connected");
 const current=await revealTokens(env,realm,row.encrypted_tokens);
 if(Date.parse(row.access_expires_at)>Date.now()+30000)return current.access_token;
 const lease=await env.DB.prepare("UPDATE intuit_connections SET refresh_locked_until=? WHERE realm_id=? AND version=? AND (refresh_locked_until IS NULL OR refresh_locked_until<?)").bind(new Date(Date.now()+315360000000).toISOString(),realm,row.version,new Date().toISOString()).run();
 if(lease.meta.changes!==1)throw Error("refresh_in_progress");
 try{
  const updated=await exchange(env,{grant_type:"refresh_token",refresh_token:current.refresh_token});
  const saved=await env.DB.prepare("UPDATE intuit_connections SET encrypted_tokens=?,access_expires_at=?,version=version+1,refresh_locked_until=NULL WHERE realm_id=? AND version=?").bind(await protectTokens(env,realm,{access_token:updated.access_token,refresh_token:updated.refresh_token}),expiry(updated),realm,row.version).run();
  if(saved.meta.changes!==1)throw Error("refresh_version_conflict");
  return updated.access_token;
 }catch(error){
  // Preserve the lease after an ambiguous exchange: the provider may have rotated the token.
  // An operator must reconcile uncertain refresh results before another attempt.
  throw error;
 }
}
