const authorizeEndpoint = "https://appcenter.intuit.com/connect/oauth2";
const noStore = {"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
const json = (value,status=200) => Response.json(value,{status,headers:noStore});
const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
const sha = async value => encode(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))));
export async function intuitOAuth(request,env,url) {
 if (!url.pathname.startsWith("/oauth/intuit/")) return null;
 if (!env.INTUIT_CLIENT_ID || !env.INTUIT_REDIRECT_URI || !env.INTUIT_OAUTH_ADMIN_KEY || !env.DB) return json({error:"oauth_unconfigured"},503);
 if (url.pathname === "/oauth/intuit/start") {
  if(request.method!=="POST") return new Response(null,{status:405});
  if(request.headers.get("Authorization")!=="Bearer "+env.INTUIT_OAUTH_ADMIN_KEY) return new Response(null,{status:404});
  const state=encode(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare("INSERT INTO intuit_oauth_states (state_hash,expires_at) VALUES (?,?)").bind(await sha(state),new Date(Date.now()+600000).toISOString()).run();
  const target=new URL(authorizeEndpoint);
  for(const [key,value] of Object.entries({client_id:env.INTUIT_CLIENT_ID,scope:"com.intuit.quickbooks.accounting",redirect_uri:env.INTUIT_REDIRECT_URI,response_type:"code",state}))target.searchParams.set(key,value);
  return json({authorization_url:target.toString(),expires_in:600});
 }
 if(url.pathname==="/oauth/intuit/callback") return json({error:"callback_not_ready"},503);
 return json({error:"not_found"},404);
}
