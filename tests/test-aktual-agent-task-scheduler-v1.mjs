import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const q=JSON.parse(fs.readFileSync('artifacts/aktual-agent-task-scheduler/queue.json','utf8'));
test('150 unique scoped free tasks and accountable ownership',()=>{
 assert.equal(q.agentRoles,150);
 assert.equal(q.tasksAssigned+q.tasksDeferred,150);
 const tasks=[...q.active,...q.deferred];assert.equal(new Set(tasks.map(t=>t.agentId)).size,150);
 assert.deepEqual(q.laneCounts,{'national-editorial':15,'regional-editorial':8,frontend:32,backend:25,seo:20,visual:18,qa:15,distribution:10,security:7});
 for(const task of tasks){assert.ok(task.owner&&task.assignment&&task.objective&&task.stage);assert.ok(task.evidence);assert.ok(task.completionCriteria.length>0);assert.equal(task.permissions.paidApiCalls,0);assert.equal(task.permissions.writeMain,false);assert.equal(task.permissions.deploy,false);assert.equal(task.permissions.publish,false);assert.equal(task.next,'QUEUED_FOR_REVIEW');}
});
test('No paid services, no silent approval and no production mutation',()=>{
 assert.equal(q.freeBudget.paidApiCalls,0);assert.equal(q.freeBudget.newCrons,0);
 assert.equal(q.decisions.autoApproveMain,false);assert.equal(q.decisions.autoPublish,false);assert.equal(q.decisions.autoDeploy,false);
});
