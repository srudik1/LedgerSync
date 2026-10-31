const encoder=new TextEncoder();
const to64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
const from64=value=>Uint8Array.from(atob(value.replaceAll("-","+").replaceAll("_","/")),c=>c.charCodeAt(0));
async function cryptoKey(env){
 const secret=from64(env.INTUIT_TOKEN_ENCRYPTION_KEY);
 if(secret.length!==32)throw Error("invalid_crypto_key");
 return crypto.subtle.importKey("raw",secret,"AES-GCM",false,["encrypt","decrypt"]);
}
export async function protectTokens(env,realm,tokens){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:encoder.encode(realm)},await cryptoKey(env),encoder.encode(JSON.stringify(tokens)));
 return JSON.stringify({version:1,iv:to64(iv),data:to64(new Uint8Array(data))});
}
export async function revealTokens(env,realm,payload){
 const item=JSON.parse(payload);
 if(item.version!==1)throw Error("unsupported_cipher");
 const data=await crypto.subtle.decrypt({name:"AES-GCM",iv:from64(item.iv),additionalData:encoder.encode(realm)},await cryptoKey(env),from64(item.data));
 return JSON.parse(new TextDecoder().decode(data));
}
