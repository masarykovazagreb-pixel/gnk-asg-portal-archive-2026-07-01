import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const transport=readFileSync('workers/gnk-asg-direct-operator/src/outbound-mail-transport-v1.js','utf8');

assert.match(transport,/function sanitizeType\(value\)/);
assert.match(transport,/\^\[a-z0-9!#\$&\^_\.\+-\]\+\\\/\[a-z0-9!#\$&\^_\.\+-\]\+\$\/i\.test\(type\)/);
assert.match(transport,/application\/octet-stream/);
assert.doesNotMatch(transport,/\+\\\/\[a-z0-9!#\$&\^_\.\+-\]\+\/i\.test\(type\)/);

console.log(JSON.stringify({ok:true,contract:'attachment-content-type-must-match-entire-token'},null,2));
