/* Schawa Grill V5 — client-side demonstration, no automatic WhatsApp bot. */
const CONFIG={whatsappNumber:'',currency:'EUR'};
const products=[
{id:'classic',name:'Shawarma Klassik',desc:'ca. 500 g · Klassische Shawarma',price:10,category:'shawarma',image:'shawarma-card.webp'},
{id:'xl',name:'Shawarma XL',desc:'ca. 650 g · Extra große Shawarma',price:12,category:'shawarma',image:'shawarma-card.webp'},
{id:'spicy',name:'Shawarma Scharf',desc:'ca. 500 g · Pikante Shawarma',price:10,category:'shawarma',image:'shawarma-card.webp'},
{id:'cheese',name:'Shawarma Käse',desc:'ca. 530 g · Mit Käse',price:11,category:'shawarma',image:'shawarma-card.webp',defaultCheese:true},
{id:'mushroom',name:'Shawarma Pilze',desc:'ca. 550 g · Mit marinierten Champignons',price:11.5,category:'shawarma',image:'shawarma-card.webp',mushroom:true},
{id:'hawaii',name:'Shawarma Hawaii',desc:'ca. 550 g · Hähnchen, Ananas und Mais',price:11.5,category:'shawarma',image:'shawarma-card.webp',hawaii:true},
{id:'combo-classic',name:'Shawarma Menü',desc:'Shawarma Klassik + Pommes + Getränk nach Wahl',price:14.5,category:'combos',image:'combo-classic.webp',shawarmaId:'classic'},
{id:'combo-xl',name:'Shawarma XL Menü',desc:'Shawarma XL + Pommes + Getränk nach Wahl',price:16.5,category:'combos',image:'combo-xl.webp',shawarmaId:'xl'},
{id:'fries',name:'Pommes Frites',desc:'Knusprige Pommes',price:4,category:'sides',image:'snack-fries.webp'},
{id:'nuggets',name:'Chicken Nuggets',desc:'Knusprige Nuggets',price:6,category:'sides',image:'snack-nuggets.webp'},
{id:'shrimp',name:'Frittierte Garnelen',desc:'Knusprige Garnelen',price:8,category:'sides',image:'snack-shrimp.webp'},
{id:'water',name:'Mineralwasser',desc:'0,5 l · still oder sprudelnd',price:2.5,category:'drinks',image:'water-black.webp'},
{id:'cola',name:'Coca-Cola',desc:'0,5 l',price:2.5,category:'drinks',image:'cola-black.webp'},
{id:'sprite',name:'Sprite',desc:'0,5 l',price:2.5,category:'drinks',image:'sprite-black.webp'},
{id:'coffee',name:'Kaffee',desc:'250 ml',price:2.5,category:'drinks',image:'coffee.webp'},
{id:'tea',name:'Tee',desc:'250 ml',price:2,category:'drinks',image:'tea.webp'}
];
const ingredients=[['lavash','ingredient-lavash.webp','Armenischer Lavash'],['meat','ingredient-meat.webp','Hähnchenfleisch'],['tomato','ingredient-tomato.webp','Tomaten'],['carrot','ingredient-carrot.webp','Koreanische Karotten'],['cabbage','ingredient-cabbage.webp','Weißkohl'],['pickle','ingredient-pickle.webp','Salzgurken'],['fries','ingredient-fries.webp','Kartoffeln'],['sauce','ingredient-sauce.webp','Knoblauchsoße'],['cheese','ingredient-cheese.webp','Käse'],['pineapple','ingredient-pineapple.webp','Ananas'],['corn','ingredient-corn.webp','Mais'],['mushroom','ingredient-mushroom.webp','Marinierte Champignons']];
const extrasPhotos={onion:'ingredient-onion.webp',meat:'ingredient-meat.webp',sauce:'ingredient-sauce.webp',cheese:'ingredient-cheese.webp',hot:'ingredient-hot.svg'};
const extras=[['onion','Zwiebeln',0],['hot','Scharfe Soße',0],['meat','Extra Fleisch',2]];
// Indicative prices for optional ingredients; confirm before opening.
const ingredientAddPrices={cheese:1,pineapple:0.5,corn:0.5,mushroom:1};
const mandatoryIngredients=new Set(['lavash','meat']);
let cart=[],filter='all',serial=0;
const CART_KEY='schawa-grill-cart-v1';
function saveCart(){try{localStorage.setItem(CART_KEY,JSON.stringify(cart))}catch(err){console.warn('Warenkorb konnte nicht gespeichert werden',err)}}
function restoreCart(){try{const saved=JSON.parse(localStorage.getItem(CART_KEY)||'[]');if(!Array.isArray(saved))return;cart=saved.filter(x=>x&&products.some(p=>p.id===x.id)).slice(0,100).map(x=>{const p=products.find(p=>p.id===x.id),base=newLine(p);return {...base,uid:base.uid,drink:drinkChoices.some(d=>d[0]===x.drink)?x.drink:base.drink,ingredients:{...base.ingredients,...(x.ingredients&&typeof x.ingredients==='object'?x.ingredients:{})},extras:{...(x.extras&&typeof x.extras==='object'?x.extras:{})},halved:!!x.halved,note:typeof x.note==='string'?x.note.slice(0,220):''}});saveCart()}catch(err){console.warn('Warenkorb konnte nicht geladen werden',err)}}
const $=s=>document.querySelector(s), euro=n=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'}), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isShawarma=p=>p.category==='shawarma'||p.category==='combos';
const drinkChoices=[['water','Mineralwasser'],['cola','Coca-Cola'],['sprite','Sprite']];
function toggleHomeCategory(cat){const target=document.querySelector('.home-category-panel[data-cat="'+cat+'"]');if(!target)return;const opening=target.hidden;document.querySelectorAll('.home-category-panel').forEach(x=>x.hidden=true);document.querySelectorAll('.home-category-toggle').forEach(x=>x.setAttribute('aria-expanded','false'));target.hidden=!opening;document.querySelector('.home-category-toggle[data-cat="'+cat+'"]')?.setAttribute('aria-expanded',String(opening));}
function go(page){const prior=lastOrder();if(page==='order'&&prior&&['done','cancelled','no_show'].includes(prior.status))page='home';syncActiveOrder();document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===page));$('#drawer').hidden=true;syncMenu();window.scrollTo(0,0);updateBottom();history.replaceState(null,'','#'+page)}
function goPreorder(){go(activeOrder()||cart.length?'order':'menu')}
function setFilter(cat){filter=cat;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter===cat));renderMenu()}
function ingredientsFor(p){return ingredients.filter(([id])=>{if(p.hawaii&&['tomato','pickle','cheese'].includes(id))return false;return !['cheese','pineapple','corn','mushroom'].includes(id)||((id==='cheese'&&p.defaultCheese)||(p.hawaii&&['pineapple','corn'].includes(id))||(p.mushroom&&id==='mushroom'))})}
function defaultIds(p){return new Set(ingredientsFor(p).map(([id])=>id))}
function eggFreeIcon(){return `<span class="eggfree-badge" title="Ohne Ei" aria-label="Ohne Ei"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C8.8 3 6.4 8.5 6.4 13a5.6 5.6 0 0 0 11.2 0C17.6 8.5 15.2 3 12 3Z" fill="#fff1d4" stroke="#8e6749" stroke-width="1.7"/><circle cx="12" cy="12.5" r="3" fill="#f2b93b"/><path d="M4 20 20 4" stroke="#db182c" stroke-width="3.5" stroke-linecap="round"/></svg></span>`}
function ingredientsHtml(line,editable,product){
 const p=product||(line&&products.find(x=>x.id===line.id))||products[0];
 const defaults=defaultIds(p);
 const shown=editable?ingredients.filter(([id])=>defaults.has(id)):ingredientsFor(p);
 return `<div class="ingredients ${editable?'editable':''}">${shown.map(([id,icon,label])=>{
  const mandatory=mandatoryIngredients.has(id);
  const defaultIncluded=defaults.has(id);
  const enabled=mandatory||(line?(line.ingredients[id]===true):defaultIncluded);
  const extraCost=!defaultIncluded&&!mandatory?(ingredientAddPrices[id]||0):0;
  const priceLabel=editable&&!defaultIncluded?`<span class="ingredient-price">${extraCost?'+'+euro(extraCost):'Gratis'}</span>`:'';
  const optionalLabel=editable&&!defaultIncluded?'<span class="ingredient-optional">Extra</span>':'';
  return editable?`<label class="ingredient ingredient-toggle ${id==='sauce'?'ingredient-sauce-item':''} ${enabled?'':'removed'} ${mandatory?'mandatory':''} ${!defaultIncluded?'ingredient-addable':''}" ${mandatory?'title="Pflichtzutat – immer enthalten"':''}><input type="checkbox" data-ingredient="${id}" data-line="${line.uid}" ${enabled?'checked':''} ${mandatory?'disabled':''}><img class="ingredient-photo" src="assets/${icon}" alt="" loading="lazy">${id==='sauce'?eggFreeIcon():''}<span class="ingredient-label">${label}</span>${optionalLabel}${priceLabel}${mandatory?'<span class="ingredient-lock" aria-label="Pflichtzutat">🔒</span>':''}</label>`:`<span class="ingredient ${id==='sauce'?'ingredient-sauce-item':''}"><img class="ingredient-photo" src="assets/${icon}" alt="" loading="lazy">${id==='sauce'?eggFreeIcon():''}<span class="ingredient-label">${label}</span>${mandatory?'<span class="ingredient-lock" aria-label="Pflichtzutat">🔒</span>':''}</span>`
 }).join('')}</div>`
}
function extrasHtml(line){
 const p=products.find(x=>x.id===line.id), defaults=defaultIds(p);
 const optional=ingredients.filter(([id])=>['cheese','pineapple','corn','mushroom'].includes(id)&&!defaults.has(id));
 const baseExtras=extras.map(([id,label,price])=>`<label class="extra-row"><input type="checkbox" data-extra="${id}" data-line="${line.uid}" ${line.extras[id]?'checked':''} ><span>${label}</span><small>${price===0?'Kostenlos':'+'+euro(price)}</small></label>`);
 const ingredientExtras=optional.map(([id,,label])=>`<label class="extra-row"><input type="checkbox" data-ingredient="${id}" data-line="${line.uid}" ${line.ingredients[id]?'checked':''}><span>${label}</span><small>+${euro(ingredientAddPrices[id]||0)}</small></label>`);
 const all=[...baseExtras,...ingredientExtras];
 const free=all.filter((_,i)=>i<baseExtras.length&&extras[i][2]===0);
 const paid=all.filter((_,i)=>i>=baseExtras.length||extras[i][2]>0);
 return `<p class="option-hint">Extras wählen (kostenlose zuerst):</p><div class="extras extras-rows">${[...free,...paid].join('')}</div>`;
}
function priceOf(line){const p=products.find(x=>x.id===line.id);const defaults=defaultIds(p);const added=ingredients.reduce((sum,[id])=>sum+(!defaults.has(id)&&line.ingredients[id]===true?(ingredientAddPrices[id]||0):0),0);return line.price+added+extras.reduce((n,[id,,price])=>n+(line.extras[id]?price:0),0)}
function newLine(p){return {drink:p.category==='combos'?'water':null,uid:++serial,id:p.id,name:p.name,price:p.price,image:p.image,category:p.category,ingredients:Object.fromEntries(ingredients.map(([id])=>[id,defaultIds(p).has(id)])),extras:{},halved:false,note:''}}
function renderHomeCategories(){document.querySelectorAll('.home-category-panel').forEach(panel=>{const cat=panel.dataset.cat;panel.innerHTML=products.filter(p=>p.category===cat).map(p=>`<button class="home-product" data-add="${p.id}"><img src="assets/${p.image}" alt=""><span><strong>${esc(p.name)}</strong><small>${esc(p.desc)}</small></span><b>${euro(p.price)} +</b></button>`).join('')})}
function productBadge(p){const labels={spicy:['🌶 Scharf','hot'],classic:['Bestseller','best'],hawaii:['Neu','new']};const b=labels[p.id];return b?`<span class="product-badge badge-${b[1]}">${b[0]}</span>`:''}
function renderMenu(){
 const items=products.filter(p=>filter==='all'||p.category===filter);
 const html=items.map(p=>`<article class="product ${isShawarma(p)?'product-collapsible':''}" data-product="${p.id}">
 <button type="button" class="product-summary" data-toggle-ingredients="${p.id}" aria-expanded="false" aria-label="${esc(p.name)}: Zutaten ansehen">
 ${productBadge(p)}
 <span class="product-thumb ${isShawarma(p)?'shawarma-thumb':''}"><img src="assets/${p.image}" alt="" loading="lazy"></span>
 <span class="product-main"><span class="product-name">${esc(p.name)}</span><span class="product-description">${esc(p.desc)}</span><span class="price">${euro(p.price)}</span></span>
 ${isShawarma(p)?'<span class="product-toggle-label">Zutaten ansehen <span class="product-toggle-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></span>':''}
 </button>
 ${isShawarma(p)?`<div class="product-ingredients" hidden>${ingredientsHtml(null,false,p)}</div>`:''}
 <button type="button" class="product-order-btn" data-add="${p.id}" aria-label="${esc(p.name)} bestellen">${isShawarma(p)?'🌯 Jetzt bestellen':'＋ Hinzufügen'} <span aria-hidden="true">›</span></button>
 </article>`).join('');
 $('#products').innerHTML=html;$('#homeProducts').innerHTML=html;
}
function toggleProductIngredients(button){
 const card=button.closest('.product');if(!card)return;
 const details=card.querySelector('.product-ingredients');if(!details)return;
 const opening=details.hidden;
 const list=card.parentElement;
 list.querySelectorAll('.product-ingredients:not([hidden])').forEach(el=>{
  el.hidden=true;const other=el.closest('.product');other.classList.remove('ingredients-open');
  const trigger=other.querySelector('.product-summary');trigger.setAttribute('aria-expanded','false');
  const label=trigger.querySelector('.product-toggle-label');if(label)label.innerHTML='Zutaten ansehen <span class="product-toggle-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>';
 });
 details.hidden=!opening;card.classList.toggle('ingredients-open',opening);
 button.setAttribute('aria-expanded',String(opening));
 const label=button.querySelector('.product-toggle-label');if(label)label.innerHTML=(opening?'Zutaten schließen':'Zutaten ansehen')+' <span class="product-toggle-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>';
}

function add(id,button){if(activeOrder()){go('order');return;}const p=products.find(x=>x.id===id);if(!p)return;const line=newLine(p);cart.push(line);saveCart();renderOrder();updateBottom();showAddedToast(p.name);if(button){button.classList.add('added-success');const original=button.innerHTML;button.innerHTML='<span class="button-check">✓</span> Hinzugefügt';button.disabled=true;setTimeout(()=>{if(button.isConnected){button.innerHTML=original;button.disabled=false;button.classList.remove('added-success')}},1050)}}
let toastTimer;function showAddedToast(name){const toast=$('#addedToast');if(!toast)return;toast.querySelector('.toast-product').textContent=name;toast.classList.add('show');toast.setAttribute('aria-hidden','false');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.classList.remove('show');toast.setAttribute('aria-hidden','true')},2700)}
function remove(uid){cart=cart.filter(x=>x.uid!==uid);saveCart();renderOrder();updateBottom()}
function minus(id){const i=cart.map(x=>x.id).lastIndexOf(id);if(i>=0){cart.splice(i,1);saveCart();renderOrder();updateBottom()}}
function amount(){return cart.reduce((s,x)=>s+priceOf(x),0)}
function row(p){const count=cart.filter(x=>x.id===p.id).length;return `<div class="order-product"><div class="order-product-top"><div class="order-thumb ${isShawarma(p)?'shawarma-thumb':''}"><img src="assets/${p.image}" alt="" loading="lazy"></div><div class="name"><strong>${esc(p.name)}</strong><small>${euro(p.price)} · ${esc(p.desc)}</small></div><div class="qty"><button data-minus="${p.id}" aria-label="${esc(p.name)} reduzieren" ${count===0?'disabled':''}>−</button><span>${count}</span><button data-add="${p.id}" aria-label="${esc(p.name)} hinzufügen">+</button></div></div></div>`}
function renderOrder(){renderCart();syncActiveOrder()}
function renderCart(){const el=$('#cartItems');el.innerHTML=cart.length?cart.map(x=>`<article class="cart-line"><div class="cart-line-top"><img class="cart-mini-photo" src="assets/${x.image}" alt=""><strong>${esc(x.name)}</strong><strong>${euro(priceOf(x))}</strong><div class="cart-qty"><button data-remove="${x.uid}" aria-label="Eine Portion entfernen">−</button><span>1</span><button data-add="${x.id}" aria-label="Eine Portion hinzufügen">+</button></div><button class="remove-line" data-remove="${x.uid}" aria-label="Entfernen">×</button></div>${x.category==='combos'?`<div class="combo-included">✓ Shawarma · ✓ Pommes Frites · ✓ 1 Getränk</div><label class="combo-drink">Getränk wählen<select data-combo-drink="${x.uid}">${drinkChoices.map(([id,label])=>`<option value="${id}" ${x.drink===id?'selected':''}>${label}</option>`).join('')}</select></label>`:''}${isShawarma(x)?`<p class="option-hint"><strong>Shawarma zusammenstellen</strong> · Zutaten antippen, um sie abzuwählen:</p>${ingredientsHtml(x,true)}${extrasHtml(x)}<label class="half-option"><input type="checkbox" data-half="${x.uid}" ${x.halved?'checked':''}>In zwei Hälften schneiden (kostenlos)</label><label class="line-comment">Kommentar zu dieser Shawarma<textarea rows="2" maxlength="220" data-note="${x.uid}" placeholder="z. B. wenig Soße, extra knusprig ...">${esc(x.note)}</textarea></label>`:''}</article>`).join(''):'<p class="muted">Noch keine Produkte ausgewählt.</p>';$('#total').textContent=euro(amount());$('#checkoutTotal').textContent=euro(amount())}
function updateBottom(){const count=cart.length;$('#bottomCount').textContent=count+' Artikel · '+euro(amount());$('#bottomBar').classList.toggle('visible',count>0&&!$('#order').classList.contains('active'));const badge=$('#bottomCount');badge.classList.remove('count-pop');void badge.offsetWidth;badge.classList.add('count-pop');document.body.classList.toggle('has-cart',count>0);document.querySelectorAll('.bottom-checkout').forEach(b=>b.classList.toggle('cart-ready',count>0))}
const ORDER_QUEUE='schawa-kitchen-demo-v1', LAST_ORDER='schawa-last-web-order-v1';
const ru=()=>document.documentElement.lang==='ru', tr=(de,r)=>ru()?r:de;
function queueRead(){const q=JSON.parse(localStorage.getItem(ORDER_QUEUE)||'null');return q&&Array.isArray(q.orders)?q:{orders:[],paused:false,wait:15}}
function activeOrder(){const o=lastOrder();return o&&!['done','cancelled','no_show'].includes(o.status)?o:null}
function lastOrder(){try{return queueRead().orders.find(o=>o.id===localStorage.getItem(LAST_ORDER))}catch{return null}}
function receiptStatus(o){return ({new:tr('Wartet auf Bestätigung','Ожидает подтверждения'),waiting:tr('Bestätigt','Подтверждён'),due:tr('Bestätigt','Подтверждён'),cooking:tr('In Zubereitung','Готовится'),ready:tr('Abholbereit','Готов к выдаче'),done:tr('Abgeholt','Выдан'),cancelled:tr('Abgelehnt','Отклонён'),no_show:tr('Nicht abgeholt','Не забрали')})[o.status]||o.status}
function receiptColor(id){return ['#f1f2f3','#171717']}
function itemDetails(i){return [...(i.remove||[]).map(v=>'Ohne '+v),...(i.extras||[]).map(v=>'+ '+v),i.note].filter(Boolean).join(' · ')}
let receiptPrevious='';
function receiptProgress(o){const stage=({new:1,waiting:2,due:2,cooking:3,ready:4,done:4})[o.status]||0;const labels=[tr('Bestellt','Заказ'),tr('Bestätigt','Подтверждён'),tr('Zubereitung','Готовится'),tr('Abholbereit','К выдаче')];const icon=stage===3?`<svg viewBox="0 0 80 80" aria-hidden="true"><g class="grill-heat" fill="none" stroke="#d97706" stroke-width="3" stroke-linecap="round"><path d="M24 28q-7-6 0-12t0-10"/><path d="M40 28q-7-6 0-12t0-10"/><path d="M56 28q-7-6 0-12t0-10"/></g><g class="grill-meat"><path d="M18 37q8-12 22-5t22 8q5 12-12 15L24 53q-13-3-6-16" fill="#b86b39" stroke="#80401f" stroke-width="2"/><path d="m27 35-5 14m17-15-5 17m17-13-5 15" stroke="#713f24" stroke-width="3" stroke-linecap="round"/></g><path d="M12 58h56l-8 9H20z" fill="#16754b"/><path d="m26 67-3 8m31-8 3 8" stroke="#16754b" stroke-width="4" stroke-linecap="round"/></svg>`:stage===4?`<svg viewBox="0 0 80 80" aria-hidden="true"><g class="ready-bag"><path d="M19 27h42l5 44H14z" fill="#d9ad70" stroke="#946633" stroke-width="2" stroke-linejoin="round"/><path d="M29 29V20a11 11 0 0 1 22 0v9" fill="none" stroke="#946633" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="48" r="12" fill="#16754b"/><path d="m34 48 4 4 8-9" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g><g class="bag-spark" stroke="#16754b" stroke-width="2.5" stroke-linecap="round"><path d="M8 17v8m-4-4h8m60-8v8m-4-4h8"/></g></svg>`:stage===2?'✓':stage===1?'…':'!';return `<div class="receipt-status ${stage?'':'receipt-failed'}"><span class="receipt-symbol ${stage===3||stage===4?'receipt-illustration':''}">${icon}</span><h2>${esc(receiptStatus(o))}</h2></div><div class="receipt-progress" aria-label="${esc(receiptStatus(o))}"><div class="receipt-track"><div id="receiptFill" style="width:${Math.max(0,stage-1)*100/3}%"></div></div>${labels.map((label,i)=>`<div class="receipt-step ${i<stage?'reached':''} ${i===stage-1?'current':''}"><span>${i+1<stage?'✓':i+1}</span><small>${label}</small></div>`).join('')}</div>`}
function showReceipt(open=true){const o=activeOrder();if(!o)return;const [bg,fg]=receiptColor(o.id);const key=JSON.stringify([o.id,o.status,o.pickup,o.mode,o.items,o.note,ru()]);if(receiptPrevious===key&&!open)return;const oldWidth=$('#receiptFill')?.style.width;receiptPrevious=key;$('#receiptBody').innerHTML=`${receiptProgress(o)}<div class="receipt-num" style="background:${bg};color:${fg}">#${esc(o.id.slice(-6))}</div><div class="receipt-time">${tr('Abholung ca.','Выдача около')} ${esc(o.pickup)}</div><small>${esc(o.mode==='На месте'?tr('Vor Ort essen','На месте'):tr('Zum Mitnehmen','С собой'))}</small>${o.items.map(i=>`<div class="receipt-item"><strong>${i.qty} × ${esc(i.name)}</strong><small>${esc(itemDetails(i))}</small></div>`).join('')}${o.note?`<small>${esc(o.note)}</small>`:''}<div class="receipt-total">${tr('Zahlung vor Ort','Оплата на месте')}: ${euro(o.items.reduce((a,i)=>a+i.price*i.qty,0))}</div><small>${tr('Demo · Bitte Bestellnummer bei Abholung zeigen.','Демо · Покажите номер при получении.')}</small>`;const fill=$('#receiptFill');if(fill&&oldWidth){const target=fill.style.width;fill.style.width=oldWidth;requestAnimationFrame(()=>requestAnimationFrame(()=>fill.style.width=target))}$('#saveReceipt').textContent=tr('Bestellung speichern (PNG)','Сохранить заказ (PNG)');if(open)go('order')}
function sendOrder(e){e.preventDefault();if(activeOrder()){syncActiveOrder();go('order');return;}if(!cart.length)return;try{const q=queueRead(),prev=lastOrder();if(prev&&!['done','cancelled','no_show'].includes(prev.status)){showReceipt();return}if(q.paused){alert(tr('Bestellungen pausiert.','Приём заказов приостановлен.'));return}if(cart.some(x=>(q.unavailable||[]).includes(x.id)||(x.category==='combos'&&[x.id==='combo-xl'?'xl':'classic','fries',x.drink].some(id=>(q.unavailable||[]).includes(id))))){alert(tr('Ein Produkt ist nicht verfügbar.','Один из товаров закончился.'));return}const items=cart.map(x=>{const defaults=defaultIds(products.find(p=>p.id===x.id));return {id:x.id,name:x.name,qty:1,price:priceOf(x),remove:isShawarma(x)?ingredients.filter(([id])=>defaults.has(id)&&!mandatoryIngredients.has(id)&&x.ingredients[id]===false).map(v=>v[2]):[],extras:isShawarma(x)?[...ingredients.filter(([id])=>!defaults.has(id)&&x.ingredients[id]===true).map(v=>v[2]),...extras.filter(([id])=>x.extras[id]===true).map(v=>v[1])]:[],note:[x.note,x.halved?'In zwei Hälften schneiden':'',x.category==='combos'?'Getränk: '+(drinkChoices.find(d=>d[0]===x.drink)?.[1]||'Mineralwasser'):''].filter(Boolean).join(' · ')}});let id;do{id='W-'+String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000)}while(q.orders.some(o=>String(o.id).slice(-6)===id.slice(-6)));const due=Date.now()+Math.max(Number($('#pickup').value)||20,Number(q.wait)||15)*60000;const o={id,date:new Date().toISOString(),due,pickup:new Date(due).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}),status:'new',source:'Сайт',mode:document.querySelector('input[name="orderMode"]:checked')?.value==='Vor Ort essen'?'На месте':'С собой',items,note:$('#comment').value.trim()};q.orders.push(o);localStorage.setItem(ORDER_QUEUE,JSON.stringify(q));localStorage.setItem(LAST_ORDER,id);cart=[];saveCart();renderOrder();updateBottom();$('#comment').value='';showReceipt()}catch(err){alert(tr('Bestellung konnte nicht gespeichert werden.','Не удалось сохранить заказ.'));console.error(err)}}
const orderButtons=new Map();
function syncActiveOrder(){
 const o=activeOrder(), active=!!o;
 const finished=lastOrder();
 const returnHome=!active&&finished&&['done','cancelled','no_show'].includes(finished.status)&&($('#order').classList.contains('active')||location.hash==='#order');
 if(!active&&localStorage.getItem(LAST_ORDER))localStorage.removeItem(LAST_ORDER);
 if(active){cart=[];saveCart();if($('#cartItems').querySelector('.cart-line'))renderCart()}
 document.body.classList.toggle('has-active-order',active);
 $('#receipt').hidden=!active;document.querySelectorAll('dialog[open]').forEach(d=>{if(d.id==='receipt')d.close()});$('#orderForm').hidden=active;$('#order .cart-panel').hidden=active;$('#order .order-head').hidden=active;
 document.querySelectorAll('[data-page="order"]').forEach(b=>{
  if(!orderButtons.has(b))orderButtons.set(b,b.innerHTML);
  if(active){if(!b.dataset.activeLabel){b.dataset.activeLabel='1';b.innerHTML=b.closest('#drawer')?'<span class="nav-symbol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 12l2 2 4-4"/></svg></span><span>Bestellung ansehen</span>':'<span>Bestellung ansehen</span><b aria-hidden="true">›</b>'}}
  else if(b.dataset.activeLabel){delete b.dataset.activeLabel;b.innerHTML=orderButtons.get(b)}
 });
 if(active)showReceipt(false);else{receiptPrevious='';$('#receiptBody').innerHTML=''}
 if(returnHome)go('home');
}
window.addEventListener('storage',e=>{if(e.key===ORDER_QUEUE||e.key===LAST_ORDER){syncActiveOrder();updateBottom()}});
window.addEventListener('focus',()=>{syncActiveOrder();updateBottom()});
window.addEventListener('pageshow',()=>{syncActiveOrder();updateBottom()});
$('#langBtn')?.addEventListener('click',()=>setTimeout(()=>{receiptPrevious='';syncActiveOrder()},0));
const RECEIPT_SITE='https://sergeyboldetsky.github.io/schawa-grill/';
$('#saveReceipt').onclick=async()=>{
 const o=lastOrder();if(!o)return;const button=$('#saveReceipt');button.disabled=true;
 try{
  const qr=new Image();qr.src='assets/site-qr.png';await qr.decode();
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),W=800,M=48;
  const rows=[];let y=48;
  function line(value,size=26,color='#17251e',bold=false,center=false){
   const font=`${bold?'700':'400'} ${size}px Arial`;ctx.font=font;
   const chunks=[];let current='';for(const ch of String(value)){if(current&&ctx.measureText(current+ch).width>W-2*M){chunks.push(current.trim());current=''}current+=ch}if(current)chunks.push(current.trim());
   for(const text of chunks){rows.push({text,font,color,center,y,size});y+=size+12;}
  }
  function gap(n=18){y+=n}function rule(){rows.push({rule:true,y});y+=24}
  line('SCHAWA GRILL',42,'#16754b',true,true);line(tr('Bestellbestätigung','Карточка заказа'),24,'#64748b',false,true);gap();
  line(receiptStatus(o),30,'#16754b',true,true);line('#'+o.id.slice(-6),64,receiptColor(o.id)[1],true,true);
  line(tr('Abholung ca.','Выдача около')+' '+o.pickup,34,'#17251e',true,true);line(o.mode==='На месте'?tr('Vor Ort essen','На месте'):tr('Zum Mitnehmen','С собой'),24,'#64748b',false,true);rule();
  for(const i of o.items){line(i.qty+' × '+i.name+'  ·  '+euro(i.price*i.qty),28,'#17251e',true);if(itemDetails(i))line(itemDetails(i),23,'#475569');gap(8)}
  if(o.note){line(o.note,23,'#475569');gap()}rule();line(tr('Zahlung vor Ort','Оплата на месте')+': '+euro(o.items.reduce((a,i)=>a+i.price*i.qty,0)),32,'#16754b',true);gap();
  line(tr('Bitte Bestellnummer bei Abholung zeigen.','Покажите номер при получении.'),24,'#475569',false,true);line(tr('Demo · kein Kassenbon','Демо · не кассовый чек'),20,'#64748b',false,true);gap();rule();
  const qrY=y; y+=230;line(tr('Unsere Website','Наш сайт'),24,'#16754b',true,true);line(RECEIPT_SITE,22,'#475569',false,true);
  canvas.width=W;canvas.height=y+40;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,canvas.height);
  for(const r of rows){if(r.rule){ctx.fillStyle='#dce5df';ctx.fillRect(M,r.y,W-2*M,2);continue}ctx.font=r.font;ctx.fillStyle=r.color;ctx.textAlign=r.center?'center':'left';ctx.textBaseline='top';ctx.fillText(r.text,r.center?W/2:M,r.y)}
  ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,(W-220)/2,qrY,220,220);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Schawa-Grill-'+o.id.slice(-6)+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){console.error(e);alert(tr('Bild konnte nicht gespeichert werden.','Не удалось сохранить изображение.'))}finally{button.disabled=false}
};


document.addEventListener('click',e=>{const nav=e.target.closest('[data-page]');if(nav){e.preventDefault();if(nav.matches('[data-preorder]'))goPreorder();else go(nav.dataset.page);if(nav.dataset.category)setFilter(nav.dataset.category)}const productToggle=e.target.closest('[data-toggle-ingredients]');if(productToggle)toggleProductIngredients(productToggle);const accordion=e.target.closest('.home-category-toggle');if(accordion)toggleHomeCategory(accordion.dataset.cat);const f=e.target.closest('[data-filter]');if(f)setFilter(f.dataset.filter);const a=e.target.closest('[data-add]');if(a)add(a.dataset.add,a);const cookie=e.target.closest('[data-cookie-ok]');if(cookie){try{localStorage.setItem('schawa-cookie-notice-seen','1')}catch(_){}document.querySelector('#storageNotice')?.remove()}const r=e.target.closest('[data-remove]');if(r)remove(+r.dataset.remove);const m=e.target.closest('[data-minus]');if(m)minus(m.dataset.minus);});
document.addEventListener('change',e=>{const drink=e.target.closest('[data-combo-drink]');if(drink){const line=cart.find(x=>x.uid===+drink.dataset.comboDrink);if(line){line.drink=drink.value;saveCart();renderCart();}}const ing=e.target.closest('[data-ingredient]');if(ing){const line=cart.find(x=>x.uid===+ing.dataset.line);if(line){if(mandatoryIngredients.has(ing.dataset.ingredient))return;line.ingredients[ing.dataset.ingredient]=ing.checked;saveCart();renderCart();updateBottom()}}const extra=e.target.closest('[data-extra]');if(extra){const line=cart.find(x=>x.uid===+extra.dataset.line);if(line){line.extras[extra.dataset.extra]=extra.checked;saveCart();renderCart();updateBottom()}}const half=e.target.closest('[data-half]');if(half){const line=cart.find(x=>x.uid===+half.dataset.half);if(line){line.halved=half.checked;saveCart()}}});
document.addEventListener('input',e=>{const note=e.target.closest('[data-note]');if(note){const line=cart.find(x=>x.uid===+note.dataset.note);if(line){line.note=note.value;saveCart()}}});
function syncMenu(){const open=!$('#drawer').hidden;$('#menuBtn').classList.toggle('is-open',open);$('#menuBtn').setAttribute('aria-expanded',String(open));$('#menuBtn').setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');$('#menuBtn').innerHTML='<span class="menu-glyph">'+(open?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>')+'</span><span class="menu-caption">'+(open?'Schließen':'Menü')+'</span>'}$('#menuBtn').addEventListener('click',()=>{$('#drawer').hidden=!$('#drawer').hidden;syncMenu()});$('#clearCart').addEventListener('click',()=>{cart=[];saveCart();renderOrder();updateBottom()});$('#orderForm').addEventListener('submit',sendOrder);
for(let n=15;n<=60;n+=5)$('#pickup').insertAdjacentHTML('beforeend',`<option value="${n}" ${n===20?'selected':''}>In ${n} Minuten</option>`);
$('#pickupOptions').addEventListener('click',e=>{const btn=e.target.closest('[data-minutes]');if(!btn)return;$('#pickup').value=btn.dataset.minutes;document.querySelectorAll('#pickupOptions .pickup-option').forEach(b=>{const active=b===btn;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});$('#pickup').dispatchEvent(new Event('change',{bubbles:true}));});
// Pickup estimate uses Europe/Berlin regardless of the customer's device timezone.
function updatePickupEstimate(){
 const el=$('#pickupEstimate');if(!el)return;
 const minutes=Number($('#pickup').value)||20;
 const target=new Date(Date.now()+minutes*60000);
 const time=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(target);
 el.textContent='Voraussichtliche Abholung gegen '+time+' Uhr (Münchner Zeit) · unverbindlich bis zur Bestätigung.';
}
$('#pickup').addEventListener('change',updatePickupEstimate);
window.addEventListener('focus',updatePickupEstimate);
updatePickupEstimate();
$('#year').textContent=new Date().getFullYear();restoreCart();renderMenu();renderOrder();go(['home','menu','order','about','contact','privacy'].includes(location.hash.slice(1))?location.hash.slice(1):'home');
for(const id of ['googleRoute','wazeRoute'])document.getElementById(id)?.addEventListener('click',()=>alert('Demo: Standort noch nicht bestätigt. Navigation wird nach Festlegung der Adresse aktiviert.'));

document.getElementById('headerMap')?.addEventListener('click',()=>alert('Der Standort wird vor der Eröffnung bekanntgegeben. Die Google-Maps-Navigation wird dann aktiviert.'));

// Informational notice: site uses localStorage for cart and language; no tracking cookies are set by this code.
try{if(localStorage.getItem('schawa-cookie-notice-seen')==='1')document.querySelector('#storageNotice')?.remove()}catch(_){}
