/* paukova mreža — osvjetljavanje niti; bez ove skripte linkovi rade isto */
(function(){
  var roots=document.querySelectorAll('[data-spiderweb]');
  Array.prototype.forEach.call(roots,function(root){
    var svg=root.querySelector('.sw-svg');
    if(!svg)return;
    var lines=svg.querySelectorAll('.sw-thread,.sw-ring,.sw-bridge');
    function clear(){Array.prototype.forEach.call(lines,function(l){l.classList.remove('is-on')});}
    function light(id){
      clear();
      if(!id)return;
      Array.prototype.forEach.call(lines,function(l){
        if(l.getAttribute('data-a')===id||l.getAttribute('data-b')===id)l.classList.add('is-on');
      });
    }
    Array.prototype.forEach.call(svg.querySelectorAll('[data-node]'),function(node){
      var id=node.getAttribute('data-node');
      node.addEventListener('mouseenter',function(){light(id)});
      node.addEventListener('focus',function(){light(id)});
      node.addEventListener('mouseleave',clear);
      node.addEventListener('blur',clear);
    });
    svg.addEventListener('mouseleave',clear);
  });
})();