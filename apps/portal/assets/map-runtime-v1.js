(function(){
var data=window.GNK_WORLD_NETWORK||[];
var ns='http://www.w3.org/2000/svg';
var routes=document.getElementById('routes');
var nodes=document.getElementById('nodes');
if(!routes||!nodes||!data.length)return;
function point(lat,lon){return[(lon+180)/360*1600,70+(90-lat)/180*620]}
function svg(tag,values){var item=document.createElementNS(ns,tag);for(var key in values)item.setAttribute(key,values[key]);return item}
var hub=point(data[0][4],data[0][5]);
data.forEach(function(city,index){
 var p=point(city[4],city[5]);
 if(index){
  var middle=(hub[0]+p[0])/2;
  var curve=(hub[1]+p[1])/2-Math.min(170,35+Math.abs(p[0]-hub[0])*.12);
  routes.appendChild(svg('path',{d:'M'+hub[0]+' '+hub[1]+' Q'+middle+' '+curve+' '+p[0]+' '+p[1],'class':'route '+city[6]}));
 }
 var group=svg('g',{'class':'node '+city[6]+(index===0?' hub':'')});
 var title=svg('title',{});title.textContent=city[0]+' / '+city[1];group.appendChild(title);
 group.appendChild(svg('circle',{'class':'halo',cx:p[0],cy:p[1],r:index===0?8:5}));
 group.appendChild(svg('circle',{'class':'dot',cx:p[0],cy:p[1],r:index===0?5:3.5}));
 nodes.appendChild(group);
});
})();
