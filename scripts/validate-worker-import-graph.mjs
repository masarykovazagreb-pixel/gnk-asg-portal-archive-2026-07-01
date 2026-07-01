import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const entry=path.resolve(root,process.argv[2]||'workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v1.js');
const seen=new Set();
const failures=[];

function resolveImport(from,specifier){
  const base=path.resolve(path.dirname(from),specifier);
  const candidates=path.extname(base)?[base]:[base,`${base}.js`,path.join(base,'index.js')];
  return candidates.find(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile())||null;
}

function visit(file){
  const normalized=path.resolve(file);
  if(seen.has(normalized))return;
  seen.add(normalized);
  if(!normalized.startsWith(root+path.sep)){
    failures.push(`Import escapes repository root: ${normalized}`);
    return;
  }
  if(!fs.existsSync(normalized)){
    failures.push(`Missing module: ${path.relative(root,normalized)}`);
    return;
  }
  const check=spawnSync(process.execPath,['--check',normalized],{encoding:'utf8'});
  if(check.status!==0){
    failures.push(`Syntax error in ${path.relative(root,normalized)}\n${check.stderr||check.stdout}`);
    return;
  }
  const source=fs.readFileSync(normalized,'utf8');
  const specs=[];
  for(const regex of [
    /\b(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?['"](\.[^'"]+)['"]/g,
    /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g
  ]){
    let match;
    while((match=regex.exec(source)))specs.push(match[1]);
  }
  for(const specifier of specs){
    const resolved=resolveImport(normalized,specifier);
    if(!resolved)failures.push(`Missing import ${specifier} from ${path.relative(root,normalized)}`);
    else if(path.extname(resolved)==='.js')visit(resolved);
  }
}

visit(entry);

if(failures.length){
  console.error('Worker import graph FAILED');
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Worker import graph PASSED: ${seen.size} active JavaScript modules validated.`);
