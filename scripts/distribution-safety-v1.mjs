import fs from 'node:fs';

// Missing/corrupt receipts must never be interpreted as permission to repost.
export function readDistributionState(file, {allowMissing=false, version=1}={}) {
  let value;
  try { value=JSON.parse(fs.readFileSync(file,'utf8')); }
  catch(error) {
    if(allowMissing && error.code==='ENOENT')return {version,posted:{}};
    throw new Error('Distribution receipts unavailable or invalid; publication stopped', {cause:error});
  }
  if(!value || typeof value!=='object' || !value.posted ||
    typeof value.posted!=='object' || Array.isArray(value.posted))
    throw new Error('Invalid durable distribution state; publication stopped');
  return value;
}

// v2 media uploads can return 202. Never attach an unfinished image or silently
// turn an image publication into a text-only post after a processing failure.
export async function waitForMedia({request, site, headers, upload, pause=ms=>new Promise(r=>setTimeout(r,ms)), attempts=10}) {
  if(!upload.id)throw new Error('Media server did not return upload ID');
  let media=upload;
  for(let i=0;i<attempts;i++) {
    if(String(media.id)!==String(upload.id))throw new Error('Media processing returned a different object');
    if(typeof media.url==='string' && media.url.startsWith('https://'))return media;
    if(i)await pause(1100);
    const response=await request(site+'/api/v1/media/'+encodeURIComponent(upload.id),{headers});
    if(!response.ok)throw new Error('Media processing verification HTTP '+response.status);
    media=await response.json();
  }
  throw new Error('Media is not ready; no status was published');
}
