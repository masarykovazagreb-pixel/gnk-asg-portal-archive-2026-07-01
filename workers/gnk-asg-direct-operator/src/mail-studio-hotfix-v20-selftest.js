export const VERSION='GNK_ASG_MAIL_STUDIO_HOTFIX_V20_SELFTEST_20260629';

export function validateMailStudioHotfixSource(source=''){
  const required=[
    "confirm:'SEND_MAIL'",
    "MANDATORY_BCC='rht@gmx.com'",
    "data?.status==='SENT'",
    "data?.mode==='test_recorded'",
    "next.id=`gnkMailV20_${action}`",
    "attachments:attachments()"
  ];
  const missing=required.filter(fragment=>!String(source).includes(fragment));
  return{ok:missing.length===0,missing,required};
}
