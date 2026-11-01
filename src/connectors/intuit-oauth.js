import {verifyOperatorJwt} from "./operator-access.js";
import {connectIntuitRealm} from "./intuit-tokens.js";
const authorizeEndpoint = "https://appcenter.intuit.com/connect/oauth2";
const noStore = {"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
const json = (value,status=200) => Response.json(value,{status,headers:noStore});
const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
const sha = async value => encode(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))));
async function authorizationUrl(env) {
 const state=encode(crypto.getRandomValues(new Uint8Array(32)));
 await env.DB.prepare("INSERT INTO intuit_oauth_states (state_hash,expires_at) VALUES (?,?)").bind(await sha(state),new Date(Date.now()+600000).toISOString()).run();
 const target=new URL(authorizeEndpoint);
 for(const [key,value] of Object.entries({client_id:env.INTUIT_CLIENT_ID,scope:"com.intuit.quickbooks.accounting",redirect_uri:env.INTUIT_REDIRECT_URI,response_type:"code",state}))target.searchParams.set(key,value);
 return target.toString();
}
export async function intuitOAuth(request,env,url) {
 if (!url.pathname.startsWith("/oauth/intuit/")) return null;
 if (!env.INTUIT_CLIENT_ID || !env.INTUIT_REDIRECT_URI || !env.INTUIT_OAUTH_ADMIN_KEY || !env.INTUIT_CLIENT_SECRET || !env.INTUIT_TOKEN_ENCRYPTION_KEY || !env.DB) return json({error:"oauth_unconfigured"},503);
 if(url.pathname==="/oauth/intuit/launch") {
  if(request.method!=="GET")return new Response(null,{status:405,headers:noStore});
  const jwt=request.headers.get("Cf-Access-Jwt-Assertion");
  if(!jwt||!env.INTUIT_ACCESS_AUD||!env.INTUIT_ACCESS_TEAM_DOMAIN)return json({error:"operator_auth_required"},403);
  const verified=await verifyOperatorJwt(jwt,env);
  if(!verified)return json({error:"operator_auth_required"},403);
  return new Response(null,{status:303,headers:{...noStore,Location:await authorizationUrl(env)}});
 }
 if (url.pathname === "/oauth/intuit/start") {
  if(request.method!=="POST") return new Response(null,{status:405});
  if(request.headers.get("Authorization")!=="Bearer "+env.INTUIT_OAUTH_ADMIN_KEY) return new Response(null,{status:404});
  return json({authorization_url:await authorizationUrl(env),expires_in:600});
 }
 if(url.pathname==="/oauth/intuit/invite") {
  if(request.method!=="POST")return new Response(null,{status:405,headers:noStore});
  if(request.headers.get("Authorization")!=="Bearer "+env.INTUIT_OAUTH_ADMIN_KEY)return new Response(null,{status:404,headers:noStore});
  const ticket=encode(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare("INSERT INTO intuit_oauth_tickets(ticket_hash,expires_at) VALUES (?,?)").bind(await sha(ticket),new Date(Date.now()+600000).toISOString()).run();
  return json({connect_url:url.origin+"/oauth/intuit/connect?ticket="+ticket,expires_in:600});
 }
 if(url.pathname==="/oauth/intuit/connect") {
  if(request.method!=="GET")return new Response(null,{status:405,headers:noStore});
  const ticket=url.searchParams.get("ticket");
  if(!ticket||! /^[A-Za-z0-9_-]{43}$/.test(ticket))return json({error:"invalid_or_expired_link"},403);
  const claim=await env.DB.prepare("DELETE FROM intuit_oauth_tickets WHERE ticket_hash=? AND expires_at>? RETURNING ticket_hash").bind(await sha(ticket),new Date().toISOString()).first();
  if(!claim)return json({error:"invalid_or_expired_link"},403);
  return new Response(null,{status:303,headers:{...noStore,"Location":await authorizationUrl(env)}});
 }
 if(url.pathname==="/oauth/intuit/callback") {
  if(request.method!=="GET")return new Response(null,{status:405});
  if(url.origin+url.pathname!==env.INTUIT_REDIRECT_URI)return json({error:"redirect_mismatch"},400);
  if(url.searchParams.has("error"))return json({error:"authorization_denied"},400);
  const state=url.searchParams.get("state"),realm=url.searchParams.get("realmId"),code=url.searchParams.get("code");
  if(!state||!realm||!code||!/^[a-zA-Z0-9_-]{1,128}$/.test(realm))return json({error:"invalid_callback"},400);
  const accepted=await env.DB.prepare("DELETE FROM intuit_oauth_states WHERE state_hash=? AND expires_at>? RETURNING state_hash").bind(await sha(state),new Date().toISOString()).first();
  if(!accepted)return json({error:"expired_or_used_state"},400);
  try {
   if(!env.INTUIT_CLIENT_SECRET||!env.INTUIT_TOKEN_ENCRYPTION_KEY)return json({error:"oauth_unconfigured"},503);
   await connectIntuitRealm(env,realm,code);
   return new Response("QuickBooks connected. You can close this tab.",{headers:{...noStore,"Content-Type":"text/plain; charset=utf-8"}});
  }catch{return json({error:"connection_failed"},502);}
 }
 return json({error:"not_found"},404);
}
