(CM=>{
CM.node=(tag,text='',cls='')=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
CM.clear=node=>node.replaceChildren();
CM.safeDoc=value=>{const doc=new DOMParser().parseFromString(String(value||''),'text/html');doc.querySelectorAll('script,iframe,object,embed,form,meta[http-equiv]').forEach(n=>n.remove());doc.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(/^on/i.test(a.name)||(/^(href|src)$/i.test(a.name)&&/^javascript:/i.test(a.value)))n.removeAttribute(a.name)});return doc};
CM.safeHtml=value=>CM.safeDoc(value).body.outerHTML.replace(/^<body>|<\/body>$/g,'');
CM.setEditor=value=>{const editor=CM.$('body-editor'),doc=CM.safeDoc(value);editor.replaceChildren(...[...doc.body.childNodes].map(n=>document.importNode(n,true)))};
CM.editorHtml=()=>[...CM.$('body-editor').childNodes].map(n=>n.nodeType===3?CM.esc(n.textContent):n.outerHTML||'').join('');
})(window.CM);
