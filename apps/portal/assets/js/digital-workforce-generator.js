window.GNKDigitalWorkforceGenerator=(function(){
  const names=['Sofia','Daniel','Emma','Lucas','Maya','Elena','Oliver','Hana','Mateo','Nora','Liam','Lea','Noah','Mila','Elias','Eva','Adam','Sara','David','Lena','Ivan','Ana','Marko','Laura','Niko','Iva','Theo','Clara','Leo','Marta','Kenji','Aiko','Rafael','Julia','Bruno','Isabel','Amir','Priya','Arjun','Mei'];
  const initials=['A','B','C','D','E','F','G','H','K','L','M','N','P','R','S','T','V','Z'];
  const departments=[['REG','Registry Operations'],['FIN','Finance Operations'],['MED','Media Operations'],['PUB','Publishing Operations'],['SEO','SEO Operations'],['CMP','Compliance'],['SUP','Support'],['TECH','Technical Operations'],['QAA','Quality Assurance'],['REGN','Regional Operations']];
  const statuses=['active','busy','scheduled','idle','approval-required'];
  function pad(n,w){return String(n).padStart(w,'0')}
  function pick(arr,i){return arr[i%arr.length]}
  function profile(entityNumber,index,region){
    const dept=pick(departments,index+entityNumber);
    const name=pick(names,index*3+entityNumber)+' '+pick(initials,index+entityNumber)+'.';
    return {name,workerId:dept[0]+'-GNK'+pad(entityNumber,2)+'-'+pad(index+1,4),department:dept[1],region:region||'Global',status:pick(statuses,index+entityNumber),openTasks:(index+entityNumber)%9,qualityScore:92+((index+entityNumber)%8)};
  }
  function generateForEntity(entityNumber,count,region){const rows=[];for(let i=0;i<(count||10);i++)rows.push(profile(entityNumber,i,region));return rows}
  function generateAll(entityCount,countPerEntity){const rows=[];for(let e=1;e<=(entityCount||43);e++)rows.push(...generateForEntity(e,countPerEntity||10));return rows}
  return {generateForEntity,generateAll};
})();
