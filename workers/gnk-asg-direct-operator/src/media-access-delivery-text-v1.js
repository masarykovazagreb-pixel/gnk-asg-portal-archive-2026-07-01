export const VERSION='GNK_ASG_MEDIA_ACCESS_DELIVERY_TEXT_V1_20260628';
const clean=value=>String(value??'').trim();

export function mediaAccessDeliveryText(prepared){
  const hr=/hrvat|croat|serb|srps|hr/i.test(clean(prepared?.language));
  if(hr){
    return [
      'SIGURAN PRISTUP MEDIJSKOJ PRIJAVI',
      `Jednokratni pristupni kod: ${prepared.code}`,
      'Pristupna stranica: https://gnk-asg.hr/media-access/',
      `Kod vrijedi do: ${prepared.expiresAt}`,
      'Kod se može upotrijebiti samo jednom. Nakon prijave sesija vrijedi najviše 12 sati.'
    ].join('\n');
  }
  return [
    'SECURE MEDIA APPLICATION ACCESS',
    `One-time access code: ${prepared.code}`,
    'Access page: https://gnk-asg.hr/media-access/',
    `Code expires at: ${prepared.expiresAt}`,
    'The code can be used once only. After login, the session lasts for up to 12 hours.'
  ].join('\n');
}
