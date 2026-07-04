import assert from 'node:assert/strict';
import {
  GLOBAL_SERVICE_CENTRES,
  centreLocation,
  centreRoleLabel,
  randomCentreIndex,
  differentRandomCentreIndex,
  chooseRandomServiceCentre,
  __test
} from '../src/global-service-centres-v1.js';

const expected=['new-york','london','paris','frankfurt','dubai','singapore','tokyo','sydney','toronto','zurich'];
assert.equal(GLOBAL_SERVICE_CENTRES.length,10);
assert.deepEqual(GLOBAL_SERVICE_CENTRES.map(item=>item.id),expected);
assert.equal(new Set(GLOBAL_SERVICE_CENTRES.map(item=>centreLocation(item))).size,10);
assert.equal(centreRoleLabel('outbound'),'Sending Global Service Centre');
assert.equal(centreRoleLabel('inbound'),'Receiving Global Service Centre');

for(let index=0;index<10;index+=1)assert.equal(randomCentreIndex(index),index);
assert.equal(randomCentreIndex(10),0);
assert.equal(randomCentreIndex(-1),9);

for(let previous=0;previous<10;previous+=1){
  const seen=new Set();
  for(let value=0;value<9;value+=1){
    const selected=differentRandomCentreIndex(previous,value);
    assert.notEqual(selected,previous);
    assert.ok(selected>=0&&selected<10);
    seen.add(selected);
  }
  assert.equal(seen.size,9,`Every alternative centre must be reachable from ${previous}`);
}

__test.memoryLast.clear();
const stored=new Map();
const env={GNK_ASG_KV:{async get(key){return stored.get(key)||null;},async put(key,value){stored.set(key,value);}}};
let previous='';
const observed=new Set();
for(let index=0;index<60;index+=1){
  const centre=await chooseRandomServiceCentre(env,'contract-test');
  assert.ok(expected.includes(centre.id));
  assert.notEqual(centre.id,previous,'The same centre must not repeat immediately');
  previous=centre.id;
  observed.add(centre.id);
}
assert.ok(observed.size>=6,'Random rotation should demonstrate broad centre distribution');
assert.equal(stored.get('mail:service-centre:last:contract-test:v1'),previous);

console.log(`GLOBAL_SERVICE_CENTRES_OK centres=${GLOBAL_SERVICE_CENTRES.length} observed=${observed.size}`);
