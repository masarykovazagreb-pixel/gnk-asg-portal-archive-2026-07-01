import { readFile } from 'node:fs/promises';

const endpoint = 'https://gnk-asg.hr/api/mail-agent/send';
const recipients = ['rht2@gmx.com', 'sefic20@gmx.com'];
const allowed = new Set(recipients);
const token = String(process.env.GNK_ASG_OPERATOR_TOKEN || '').trim();
const pdfPath = process.env.GNK_ASG_TEST_PDF || 'tests/mass-mail/GNK_DINAMO_Global_Network_3D_Globe.pdf';

if (!token) throw new Error('GNK_ASG_OPERATOR_TOKEN secret is missing.');
if (recipients.length !== 2 || recipients.some(address => !allowed.has(address))) {
  throw new Error('Recipient safety lock failed.');
}

const pdf = await readFile(pdfPath);
if (!pdf.length) throw new Error('PDF is empty.');
if (pdf.length > 8_000_000) throw new Error('PDF exceeds the 8 MB limit.');

const attachment = {
  filename: 'GNK_DINAMO_Global_Network_3D_Globe.pdf',
  mimeType: 'application/pdf',
  size: pdf.length,
  base64: pdf.toString('base64')
};

const results = [];

for (let index = 0; index < recipients.length; index += 1) {
  const to = recipients[index];
  const payload = {
    from: 'media@gnk-asg.hr',
    fromName: 'GNK ASG Media',
    to,
    subject: `[TEST ${index + 1}/2] GNK DINAMO Ltd. – 3D globalni globus mreže`,
    body: [
      'Poštovani,',
      '',
      'ovo je kontrolna testna poruka GNK ASG Mass Mail sustava.',
      '',
      'U privitku se nalazi PDF „GNK DINAMO Ltd. – 3D globalni globus mreže”.',
      'Molimo provjerite isporuku poruke i mogućnost otvaranja PDF privitka.',
      '',
      'Ova poruka poslana je isključivo u odobrenom testnom režimu.'
    ].join('\n'),
    language: 'hr',
    signatureProfile: 'media',
    attachments: [attachment]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'x-operator-token': token,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw: raw.slice(0, 500) };
  }

  const ok = response.ok && data?.ok === true;
  results.push({ to, status: response.status, ok, id: data?.id || null, result: data?.result || null });

  console.log(JSON.stringify({
    recipient: to,
    httpStatus: response.status,
    ok,
    attachmentCount: data?.result?.attachmentCount ?? null,
    failedCount: data?.result?.failedCount ?? null,
    messageId: data?.result?.deliveries?.[0]?.messageId ?? null
  }));

  if (!ok) {
    throw new Error(`Test send failed for ${to}: HTTP ${response.status} ${JSON.stringify(data)}`);
  }
}

if (results.length !== 2 || results.some(item => !item.ok)) {
  throw new Error('Two-recipient test did not complete successfully.');
}

console.log('GNK ASG Mass Mail PDF test completed for both approved addresses.');
