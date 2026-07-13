import assert from 'node:assert/strict';
import {
  LOGO_URL,
  WEBSITE,
  renderBrandSignatureHtml,
  renderBrandSignatureText
} from '../workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js';

const base={
  name:'GNK ASG <Director>',
  unit:'Corporate & Media',
  subline:'GNK ASG d.o.o.',
  address:'Zagrebačka cesta 130, 10090 Zagreb',
  registry:'OIB: 75227917632 · MBS: 081512375',
  email:'office@gnk-asg.hr',
  web:WEBSITE
};

const cid=renderBrandSignatureHtml({...base,logoSrc:'cid:gnk-asg-logo'});
assert.match(cid,/src="cid:gnk-asg-logo"/);
assert.match(cid,/mailto:office@gnk-asg\.hr/);
assert.match(cid,/GNK ASG &lt;Director&gt;/);
assert.match(cid,/GNK ASG — gold corporate mark/);
assert.doesNotMatch(cid,/<Director>/);

const remote=renderBrandSignatureHtml({...base,logoSrc:LOGO_URL});
assert.match(remote,/https:\/\/gnk-asg\.hr\/assets\/logo-gnk-asg-gold\.svg/);
assert.match(remote,/color:#b88a2f/);

const unsafe=renderBrandSignatureHtml({...base,email:'bad\n@example.com',web:'javascript:alert(1)',logoSrc:'javascript:alert(2)'});
assert.doesNotMatch(unsafe,/javascript:/i);
assert.doesNotMatch(unsafe,/mailto:bad/i);
assert.match(unsafe,/https:\/\/gnk-asg\.hr/);
assert.match(unsafe,/logo-gnk-asg-gold\.svg/);

const text=renderBrandSignatureText(base);
assert.match(text,/GNK ASG/);
assert.match(text,/office@gnk-asg\.hr/);
assert.match(text,/https:\/\/gnk-asg\.hr/);
assert.doesNotMatch(text,/<br>|<table|<img/i);

console.log(JSON.stringify({ok:true,contract:'email-signature-v9-gold',modes:['cid','gold-svg-fallback','text-brand-fallback'],mailSent:false},null,2));
