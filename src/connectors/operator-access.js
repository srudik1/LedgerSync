const enc=new TextEncoder();
function decode(s){return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replaceAll("-","+").replaceAll("_","/")),c=>c.charCodeAt(0))))}
export async function verifyOperatorJwt(token,env){
 try{
  const parts=token.split(".");if(parts.length!==3)return false;
  const header=decode(parts[0]),payload=decode(parts[1]);
  if(header.alg!=="RS256"||!header.kid)return false;
  const now=Math.floor(Date.now()/1000);
  if(payload.aud!==env.INTUIT_ACCESS_AUD && !(Array.isArray(payload.aud)&&payload.aud.includes(env.INTUIT_ACCESS_AUD)))return false;
  if(payload.iss!==env.INTUIT_ACCESS_TEAM_DOMAIN)return false;
  if(payload.exp<=now||payload.nbf>now+60)return false;
  if(payload.email!=="srudik@gmail.com")return false;
  const u=new URL(env.INTUIT_ACCESS_TEAM_DOMAIN+"/cdn-cgi/access/certs");
  if(u.protocol!=="https:")return false;
  const r=await fetch(u.toString());if(!r.ok)return false;
  const keys=await r.json(),item=keys.keys?.find(k=>k.kid===header.kid);
  if(!item)return false;
  const key=await crypto.subtle.importKey("jwk",item,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const bytes=Uint8Array.from(atob(parts[2].replaceAll("-","+").replaceAll("_","/")),c=>c.charCodeAt(0));
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,bytes,enc.encode(parts[0]+"."+parts[1]));
 }catch{return false}
}
