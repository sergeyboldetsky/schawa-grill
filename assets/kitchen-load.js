(function(root){
 const key='schawa-load-mode-v1', queue='schawa-kitchen-demo-v1';
 const ids=['classic','xl','spicy','cheese','mushroom','hawaii'];
 function mode(){return localStorage.getItem(key)||'auto'}
 function calculate(s,now=Date.now()){
 let waiting=0,cooking=0;
 for(const o of s.orders||[]){if(!['new','waiting','due','cooking'].includes(o.status))continue;if(['new','waiting'].includes(o.status)&&Number(o.due)>now+30*60000)continue;
 (o.items||[]).forEach((i,j)=>{const id=i.id==='combo-classic'?'classic':i.id==='combo-xl'?'xl':i.id;if(!ids.includes(id))return;const n=Math.max(0,Number(i.qty)||0);if(o.status==='cooking'&&(o.cookStarted||[]).includes(j+':'+id))cooking+=n;else waiting+=n;});}
 const score=waiting+cooking*.5;const m=mode();return {waiting,cooking,score,level:m==='auto'?(score<=10?'normal':score<15?'busy':'high'):m};
 }
 function read(){try{return calculate(JSON.parse(localStorage.getItem(queue)||'{"orders":[]}'))}catch{return {level:'normal',waiting:0,cooking:0,score:0}}}
 root.SchawaLoad={key,mode,calculate,read};
})(globalThis);
