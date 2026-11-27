// Only an authorized editorial asset pipeline may put approved objects in MEDIA.
const formats=new Set(["image/jpeg","image/png","image/webp"]);
const licenses=new Set(["owned","licensed","public-domain","cc-by","cc-by-sa","ai-illustration"]);
export function normalizeMedia(value){
 if(value==null)return null;
 const {key,sha256,mime,width,height,credit,license,sourceUrl,alt,caption,rightsVerified}=value;
 if(rightsVerified!==true||!licenses.has(license)||!formats.has(mime)||!/^approved\/[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(key||"")||!/^[a-f0-9]{64}$/.test(sha256||"")||!key.includes(sha256)||!Number.isInteger(width)||!Number.isInteger(height)||width<1200||height<630||width>12000||height>12000||typeof credit!=="string"||!credit.trim()||typeof alt!=="string"||!alt.trim()||typeof caption!=="string"||!caption.trim())throw Error("Unapproved or invalid media");
 let source=null;if(sourceUrl){const u=new URL(sourceUrl);if(u.protocol!=="https:"||u.username||u.password)throw Error("Invalid image source");source=u.href}
 if(["licensed","public-domain","cc-by","cc-by-sa"].includes(license)&&!source)throw Error("Missing source evidence");
 return {key,sha256,mime,width,height,credit:credit.trim().slice(0,200),license,sourceUrl:source,alt:alt.trim().slice(0,250),caption:caption.trim().slice(0,500),rightsVerified:true};
}
export async function approvedObject(bucket,media,read=false){
 if(!bucket||!media)throw Error("Media unavailable");
 const object=await bucket[read?"get":"head"](media.key);
 if(!object||object.size<1000||object.size>15*1024*1024||object.httpMetadata?.contentType!==media.mime||object.customMetadata?.sha256!==media.sha256||object.customMetadata?.rightsApproved!=="true"||object.customMetadata?.width!==String(media.width)||object.customMetadata?.height!==String(media.height))throw Error("Media verification failed");
 return object;
}
export const imagePage=slug=>"/slika/"+slug+"/";
export const imageAsset=(slug,media)=>media?"/slika/"+slug+"/foto":"/slika/"+slug+".svg";
