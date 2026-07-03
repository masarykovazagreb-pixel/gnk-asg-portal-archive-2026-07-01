import assert from 'node:assert/strict';
import {emailStatusDayWindow,DEFAULT_TIME_ZONE,VERSION} from '../workers/gnk-asg-direct-operator/src/email-status-date-window-v1.js';

const summer=emailStatusDayWindow(new Date('2026-07-03T12:00:00Z'));
assert.equal(summer.timeZone,DEFAULT_TIME_ZONE);
assert.equal(summer.localDate,'2026-07-03');
assert.equal(summer.start,'2026-07-02T22:00:00.000Z');
assert.equal(summer.end,'2026-07-03T22:00:00.000Z');

const winter=emailStatusDayWindow(new Date('2026-01-03T12:00:00Z'));
assert.equal(winter.localDate,'2026-01-03');
assert.equal(winter.start,'2026-01-02T23:00:00.000Z');
assert.equal(winter.end,'2026-01-03T23:00:00.000Z');

const dst=emailStatusDayWindow(new Date('2026-03-29T12:00:00Z'));
assert.equal(dst.localDate,'2026-03-29');
assert.equal((Date.parse(dst.end)-Date.parse(dst.start))/3600000,23);
assert.match(VERSION,/DATE_WINDOW/);

console.log(JSON.stringify({ok:true,version:VERSION,summer,winter,dstHours:23},null,2));
