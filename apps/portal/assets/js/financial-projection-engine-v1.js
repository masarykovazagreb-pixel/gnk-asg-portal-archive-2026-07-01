(function(){
 'use strict';
 if(typeof document!=='undefined'){
  document.write('<script src="/assets/js/financial-projection-engine-v2.js"><\/script>');
  return;
 }
 if(typeof module==='object'&&module.exports){
  module.exports=require('./financial-projection-engine-v2.js');
 }
})();
