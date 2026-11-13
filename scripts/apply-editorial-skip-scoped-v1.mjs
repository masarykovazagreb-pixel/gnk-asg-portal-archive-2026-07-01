#!/usr/bin/env node
// Explicitly limited, read-only by default; no share routes, frozen/ protected
// material, symlinks, unrecognised templates, metadata or article text.
import fs from 'node:fs';
import path from 'node:path';
import {addEditorialSkip} from './lib/editorial-skip-v1.mjs';
const root='apps/portal';
const dirs=['objave','komentari','analize','en/publications','en/commentary','en/analyses'];
const apply=process.argv.includes('--apply');
const counts={patched:0,already:0,protected:0,unsupported:0};
const planned=[];
function* walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())yield*walk(file);else if(item.isFile()&&item.name.endsWith('.html'))yield file;}}
for(const dir of dirs)for(const file of walk(path.join(root,dir))){
 const original=fs.readFileSync(file,'utf8'),result=addEditorialSkip(original,path.relative(root,file));counts[result.status]++;
 if(result.status==='patched')planned.push([file,result.html]);
}
if(apply)for(const [file,html] of planned)fs.writeFileSync(file,html);
console.log(JSON.stringify({mode:apply?'apply':'dry-run',counts,examples:planned.slice(0,8).map(([file])=>file)}));
