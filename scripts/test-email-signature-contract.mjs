import assert from 'node:assert/strict';
import {LOGO_URL,WEBSITE,VERSION,renderBrandSignatureHtml,renderBrandSignatureText} from '../workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js';

const base={name:'GNK ASG <Director>',unit:'Corporate & Media',subline:'GNK ASG d.o.o.',address:'Zagrebačka cesta 130, 10090 Zagreb',registry:'OIB: 75227917632 · MBS: 081512375',email:'office@gnk-asg.hr',web:WEBSITE};
const cid=renderBrandSignatureHtml({...base,logoSrc:'cid:gnk-asg-logo'});
assert.match(VERSION,/V11_20260713_CANONICAL_LOGO/);
assert.match(cid,/src="cid:gnk-asg-logo"/);
assert.match(cid,/mailto:office@gnk-asg\.hr/);
assert.match(cid,/GNK ASG &lt;Director&gt;/);
assert.match(cid,/alt="GNK ASG"/);
assert.match(cid,/color:#111111/);
assert.match(cid,/border-top:2px solid #b88a2f/);
assert.match(cid,/width="108"/);
assert.doesNotMatch(cid,/<Director>|letter-spacing:\.12em/);

const remote=renderBrandSignatureHtml({...base,logoSrc:LOGO_URL});
assert.match(LOGO_URL,/logo-gnk-asg-email\.png/);
assert.match(remote,/https:\/\/gnk-asg\.hr\/assets\/logo-gnk-asg-email\.png/);
assert.doesNotMatch(remote,/logo-gnk-asg-email\.jpg|logo-gnk-asg-gold\.svg/);

const unsafe=renderBrandSignatureHtml({...base,email:'bad\n@example.com',web:'javascript:alert(1)',logoSrc:'javascript:alert(2)'});
assert.doesNotMatch(unsafe,/javascript:/i);
assert.doesNotMatch(unsafe,/mailto:bad/i);
assert.match(unsafe,/logo-gnk-asg-email\.png/);

const text=renderBrandSignatureText(base);
assert.match(text,/GNK ASG/);
assert.match(text,/office@gnk-asg\.hr/);
assert.match(text,/https:\/\/gnk-asg\.hr/);
assert.doesNotMatch(text,/<br>|<table|<img/i);

console.log(JSON.stringify({ok:true,contract:'email-signature-v11-canonical-png',modes:['cid','canonical-png-fallback','text-brand-fallback'],mailSent:false},null,2));