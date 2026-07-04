(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GNKFinancialProjectionEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='2026-07-04.financial-projection.2';
const FLOW_METRICS=new Set(['revenue','profit']);
const STOCK_METRICS=new Set(['assets','capitalAndReserves','shortTermLiabilities','longTermLiabilities','totalLiabilities']);
const cleanNumber=value=>Number.isFinite(Number(value))?Number(value):null;
const round=(value,places=2)=>{const factor=10**places;return Math.round((value+Number.EPSILON)*factor)/factor;};
function formatMoney(value,currency='EUR'){
 const number=cleanNumber(value);
 if(number===null)return'INPUT REQUIRED';
 return new Intl.NumberFormat('en-GB',{style:'currency',currency,maximumFractionDigits:number>=1000000?0:2}).format(number);
}
function scenarioRows(entity,model){
 const interim=entity?.interimManagementInput||{};
 const scenarios=model?.projectionAssumptions?.flowMetrics?.scenarios||[];
 return scenarios.map(scenario=>{
  const values={};
  for(const metric of FLOW_METRICS){const h1=cleanNumber(interim[metric]);values[metric]=h1===null?null:round(h1*(1+Number(scenario.h2VsH1||0)),2);}
  for(const metric of STOCK_METRICS)values[metric]=cleanNumber(interim[metric]);
  return Object.freeze({id:String(scenario.id||''),label:String(scenario.id||'').replace(/(^|-)\w/g,match=>match.replace('-',' ').toUpperCase()),h2VsH1:Number(scenario.h2VsH1||0),fy2026VsFy2025:Number(scenario.fy2026VsFy2025||0),values:Object.freeze(values),disclosure:'Flow metrics are projected from H1. Stock metrics remain at the latest management-input balance until a new source is provided.'});
 });
}
function buildProjection(model){
 if(!model||!Array.isArray(model.entities))throw new Error('financial_planning_model_required');
 return Object.freeze({version:VERSION,status:'management-projection',currency:model.currency||'EUR',asOf:model.periods?.interim||'',baseline:model.periods?.baseline||'',ratio:Number(model.periods?.interimToBaselineRatio||0),disclosure:model.disclosure||'',comparisonRules:Object.freeze({...model.comparisonRules}),entities:Object.freeze(model.entities.map(entity=>Object.freeze({id:entity.id,name:entity.name,scope:entity.scope,baselineStatus:entity.baselineStatus,baseline:Object.freeze({...entity.baseline}),interim:Object.freeze({...entity.interimManagementInput}),scenarios:Object.freeze(scenarioRows(entity,model))}))});
}
function entityOf(projection,entityId){return(projection?.entities||[]).find(item=>item.id===entityId)||null;}
function profileOf(model,entityId){return(model?.entityProfiles||[]).find(item=>item.entityId===entityId)||null;}
function basisOf(model,basisId){return(model?.basisOptions||[]).find(item=>item.id===basisId)||null;}
function resolveBasis(entity,basis,customCeiling){
 if(!entity||!basis)return{amount:null,status:'basis-unavailable'};
 if(basis.source==='custom'){const amount=cleanNumber(customCeiling);return{amount,status:amount===null?'approved-input-required':'executive-input-reference'};}
 const parts=String(basis.source||'').split('.');
 if(parts[0]==='interim')return{amount:cleanNumber(entity.interim?.[parts[1]]),status:'management-input-reference'};
 if(parts[0]==='baseline')return{amount:cleanNumber(entity.baseline?.[parts[1]]),status:'official-baseline-reference'};
 if(parts[0]==='scenario'){const scenario=entity.scenarios?.find(item=>item.id===parts[1]);return{amount:cleanNumber(scenario?.values?.[parts[2]]),status:'management-projection-reference'};}
 return{amount:null,status:'basis-unavailable'};
}
function budgetEnvelope(projection,budgetModel,options={}){
 if(!projection||!budgetModel)throw new Error('projection_and_budget_model_required');
 const entityId=String(options.entityId||budgetModel.entityProfiles?.[0]?.entityId||'');
 const entity=entityOf(projection,entityId),profile=profileOf(budgetModel,entityId);
 if(!entity||!profile)throw new Error('budget_entity_profile_not_found');
 const basisId=String(options.basisId||profile.defaultBasis||budgetModel.basisOptions?.[0]?.id||'');
 const basis=basisOf(budgetModel,basisId);
 if(!basis)throw new Error('budget_basis_not_found');
 const resolved=resolveBasis(entity,basis,options.customCeiling);
 const weights=Object.entries(profile.departmentWeights||{}).map(([department,weight])=>({department,weight:Math.max(0,Number(weight||0))}));
 const totalWeight=weights.reduce((sum,item)=>sum+item.weight,0);
 if(totalWeight<=0)throw new Error('budget_weights_required');
 const allocations=weights.map(item=>{const share=item.weight/totalWeight;return Object.freeze({department:item.department,weight:item.weight,share:round(share,8),sharePercent:round(share*100,4),referenceAmount:resolved.amount===null?null:round(resolved.amount*share,2),referenceOnly:true,spendingAuthority:false});});
 return Object.freeze({version:VERSION,status:'relative-planning-envelope',entityId,entityName:entity.name,scope:entity.scope,basisId,basisLabel:basis.label,basisKind:basis.kind,basisStatus:resolved.status,referenceAmount:resolved.amount,totalWeight,departmentCount:allocations.length,spendingAuthority:false,contractAuthority:false,paymentAuthority:false,blindSummationForbidden:true,allocations:Object.freeze(allocations),disclosure:budgetModel.disclosure||''});
}
function budgetCapacity(projection,allocationShares={}){
 const entities=projection?.entities||[],group=entities.find(item=>item.id==='gnk-dinamo-group')||entities[0],baseScenario=group?.scenarios?.find(item=>item.id==='base'),projectedRevenue=cleanNumber(baseScenario?.values?.revenue),shares=Object.entries(allocationShares).map(([department,share])=>({department,share:Number(share||0)})),total=shares.reduce((sum,item)=>sum+item.share,0);
 return Object.freeze({status:'relative-planning-envelope',projectedRevenue,totalShare:round(total,6),spendingAuthority:false,allocations:Object.freeze(shares.map(item=>Object.freeze({department:item.department,share:item.share,referenceAmount:projectedRevenue===null?null:round(projectedRevenue*item.share,2),referenceOnly:true})))});
}
return Object.freeze({version:VERSION,buildProjection,budgetEnvelope,budgetCapacity,formatMoney});
});
