(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GNKFinancialProjectionEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='2026-07-04.financial-projection.1';
const FLOW_METRICS=new Set(['revenue','profit']);
const STOCK_METRICS=new Set(['assets','capitalAndReserves','shortTermLiabilities','longTermLiabilities']);
const cleanNumber=value=>Number.isFinite(Number(value))?Number(value):null;
const round=(value,places=2)=>{const factor=10**places;return Math.round((value+Number.EPSILON)*factor)/factor;};
function formatMoney(value,currency='EUR'){
 const number=cleanNumber(value);
 if(number===null)return'INPUT REQUIRED';
 return new Intl.NumberFormat('en-GB',{style:'currency',currency,maximumFractionDigits:number>=1000000?0:2}).format(number);
}
function scenarioRows(entity,model){
 const baseline=entity?.baseline||{},interim=entity?.interimManagementInput||{};
 const scenarios=model?.projectionAssumptions?.flowMetrics?.scenarios||[];
 return scenarios.map(scenario=>{
   const values={};
   for(const metric of FLOW_METRICS){
     const h1=cleanNumber(interim[metric]);
     values[metric]=h1===null?null:round(h1*(1+Number(scenario.h2VsH1||0)),2);
   }
   for(const metric of STOCK_METRICS){
     values[metric]=cleanNumber(interim[metric]);
   }
   return Object.freeze({
     id:String(scenario.id||''),
     label:String(scenario.id||'').replace(/(^|-)\w/g,match=>match.replace('-',' ').toUpperCase()),
     h2VsH1:Number(scenario.h2VsH1||0),
     fy2026VsFy2025:Number(scenario.fy2026VsFy2025||0),
     values:Object.freeze(values),
     disclosure:'Flow metrics are projected from H1. Stock metrics remain at the latest management-input balance until a new source is provided.'
   });
 });
}
function buildProjection(model){
 if(!model||!Array.isArray(model.entities))throw new Error('financial_planning_model_required');
 return Object.freeze({
   version:VERSION,
   status:'management-projection',
   asOf:model.periods?.interim||'',
   baseline:model.periods?.baseline||'',
   ratio:Number(model.periods?.interimToBaselineRatio||0),
   disclosure:model.disclosure||'',
   entities:Object.freeze(model.entities.map(entity=>Object.freeze({
     id:entity.id,
     name:entity.name,
     scope:entity.scope,
     baselineStatus:entity.baselineStatus,
     baseline:Object.freeze({...entity.baseline}),
     interim:Object.freeze({...entity.interimManagementInput}),
     scenarios:Object.freeze(scenarioRows(entity,model))
   })))
 });
}
function budgetCapacity(projection,allocationShares={}){
 const entities=projection?.entities||[];
 const group=entities.find(item=>item.id==='gnk-dinamo-group')||entities[0];
 const baseScenario=group?.scenarios?.find(item=>item.id==='base');
 const projectedRevenue=cleanNumber(baseScenario?.values?.revenue);
 const shares=Object.entries(allocationShares).map(([department,share])=>({department,share:Number(share||0)}));
 const total=shares.reduce((sum,item)=>sum+item.share,0);
 return Object.freeze({
   status:'relative-planning-envelope',
   projectedRevenue,
   totalShare:round(total,6),
   spendingAuthority:false,
   allocations:Object.freeze(shares.map(item=>Object.freeze({
     department:item.department,
     share:item.share,
     referenceAmount:projectedRevenue===null?null:round(projectedRevenue*item.share,2),
     referenceOnly:true
   })))
 });
}
return Object.freeze({version:VERSION,buildProjection,budgetCapacity,formatMoney});
});
