#!/usr/bin/env node
// Dry-run by default. Restrict traversal to these two column trees; skip symlinks.
import fs from 'node:fs';
import path from 'node:path';
import {addColumnSkip} from './lib/column-skip-v1.mjs';
const root='apps/portal', dirs=['gnk-aktual/kolumne','en/gnk-aktual/columns'];
const counts={patched:0,already:0,protected:0,unsupported:0}, edits=[];
function* walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())yield*walk(f);else if(e.isFile()&&e.name==='index.html')yield f;}}
for(const dir of dirs)for(const file of walk(path.join(root,dir))){const result=addColumnSkip(fs.readFileSync(file,'utf8'),path.relative(root,file).split(path.sep).join('/'));counts[result.status]++;if(result.status==='patched')edits.push([file,result.html]);}
if(process.argv.includes('--apply'))for(const [file,html] of edits)fs.writeFileSync(file,html);
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',counts,examples:edits.slice(0,8).map(([file])=>file)}));
