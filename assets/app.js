/* Schawa Grill V5 — client-side demonstration, no automatic WhatsApp bot. */
const CONFIG={whatsappNumber:'',currency:'EUR'};
const products=[
{id:'classic',name:'Shawarma Klassik',desc:'ca. 500 g · Klassische Shawarma',price:10,category:'shawarma',image:'shawarma-card.webp'},
{id:'xl',name:'Shawarma XL',desc:'ca. 650 g · Extra große Shawarma',price:12,category:'shawarma',image:'shawarma-card.webp'},
{id:'spicy',name:'Shawarma Scharf',desc:'ca. 500 g · Pikante Shawarma',price:10,category:'shawarma',image:'shawarma-card.webp'},
{id:'cheese',name:'Shawarma Käse',desc:'ca. 530 g · Mit Käse',price:11,category:'shawarma',image:'shawarma-card.webp',defaultCheese:true},
{id:'hawaii',name:'Shawarma Hawaii',desc:'ca. 550 g · Hähnchen, Ananas und Mais',price:11.5,category:'shawarma',image:'shawarma-card.webp',hawaii:true},
{id:'combo-classic',name:'Shawarma Menü',desc:'Shawarma Klassik + Pommes + Getränk nach Wahl',price:14.5,category:'combos',image:'combo-classic.webp',shawarmaId:'classic'},
{id:'combo-xl',name:'Shawarma XL Menü',desc:'Shawarma XL + Pommes + Getränk nach Wahl',price:16.5,category:'combos',image:'combo-xl.webp',shawarmaId:'xl'},
{id:'fries',name:'Pommes Frites',desc:'Knusprige Pommes',price:4,category:'sides',image:'snack-fries.webp'},
{id:'nuggets',name:'Chicken Nuggets',desc:'Knusprige Nuggets',price:6,category:'sides',image:'snack-nuggets.webp'},
{id:'shrimp',name:'Frittierte Garnelen',desc:'Knusprige Garnelen',price:8,category:'sides',image:'snack-shrimp.webp'},
{id:'water',name:'Mineralwasser',desc:'0,5 l · still oder sprudelnd',price:2.5,category:'drinks',image:'water-black.webp'},
{id:'cola',name:'Coca-Cola',desc:'0,33 l',price:2.5,category:'drinks',image:'cola-black.webp'},
{id:'sprite',name:'Sprite',desc:'0,33 l',price:2.5,category:'drinks',image:'sprite-black.webp'}
];
const ingredients=[['lavash','ingredient-lavash.webp','Armenischer Lavash'],['meat','ingredient-meat.webp','Hähnchenfleisch'],['tomato','ingredient-tomato.webp','Tomaten'],['carrot','ingredient-carrot.webp','Koreanische Karotten'],['cabbage','ingredient-cabbage.webp','Weißkohl'],['pickle','ingredient-pickle.webp','Salzgurken'],['fries','ingredient-fries.webp','Kartoffeln'],['sauce','ingredient-sauce.webp','Knoblauchsoße'],['cheese','ingredient-cheese.webp','Käse'],['pineapple','ingredient-pineapple.webp','Ananas'],['corn','ingredient-corn.webp','Mais']];
const extrasPhotos={onion:'ingredient-onion.webp',meat:'ingredient-meat.webp',sauce:'ingredient-sauce.webp',cheese:'ingredient-cheese.webp',hot:'ingredient-hot.svg'};
const extras=[['onion','Zwiebeln',0],['sauce','Extra Knoblauchsoße',0],['hot','Scharfe Soße',0],['meat','Extra Fleisch',2]];
// Indicative prices for optional ingredients; confirm before opening.
const ingredientAddPrices={cheese:1,pineapple:0.5,corn:0.5};
const mandatoryIngredients=new Set(['lavash','meat']);
let cart=[],filter='all',serial=0;
const $=s=>document.querySelector(s), euro=n=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'}), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isShawarma=p=>p.category==='shawarma'||p.category==='combos';
const drinkChoices=[['water','Mineralwasser'],['cola','Coca-Cola'],['sprite','Sprite']];
function toggleHomeCategory(cat){const target=document.querySelector('.home-category-panel[data-cat="'+cat+'"]');if(!target)return;const opening=target.hidden;document.querySelectorAll('.home-category-panel').forEach(x=>x.hidden=true);document.querySelectorAll('.home-category-toggle').forEach(x=>x.setAttribute('aria-expanded','false'));target.hidden=!opening;document.querySelector('.home-category-toggle[data-cat="'+cat+'"]')?.setAttribute('aria-expanded',String(opening));}
function go(page){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===page));$('#drawer').hidden=true;syncMenu();window.scrollTo(0,0);updateBottom();history.replaceState(null,'','#'+page)}
function setFilter(cat){filter=cat;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter===cat));renderMenu()}
function ingredientsFor(p){return ingredients.filter(([id])=>{if(p.hawaii&&['tomato','pickle','cheese'].includes(id))return false;return !['cheese','pineapple','corn'].includes(id)||((id==='cheese'&&p.defaultCheese)||(p.hawaii&&['pineapple','corn'].includes(id)))})}
function defaultIds(p){return new Set(ingredientsFor(p).map(([id])=>id))}
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
  return editable?`<label class="ingredient ingredient-toggle ${enabled?'':'removed'} ${mandatory?'mandatory':''} ${!defaultIncluded?'ingredient-addable':''}" ${mandatory?'title="Pflichtzutat – immer enthalten"':''}><input type="checkbox" data-ingredient="${id}" data-line="${line.uid}" ${enabled?'checked':''} ${mandatory?'disabled':''}><img class="ingredient-photo" src="assets/${icon}" alt="" loading="lazy"><span class="ingredient-label">${label}</span>${optionalLabel}${priceLabel}${mandatory?'<span class="ingredient-lock" aria-label="Pflichtzutat">🔒</span>':''}</label>`:`<span class="ingredient"><img class="ingredient-photo" src="assets/${icon}" alt="" loading="lazy"><span class="ingredient-label">${label}</span>${mandatory?'<span class="ingredient-lock" aria-label="Pflichtzutat">🔒</span>':''}</span>`
 }).join('')}</div>`
}
function extrasHtml(line){
 const p=products.find(x=>x.id===line.id), defaults=defaultIds(p);
 const optional=ingredients.filter(([id])=>['cheese','pineapple','corn'].includes(id)&&!defaults.has(id));
 const baseExtras=extras.map(([id,label,price])=>`<label class="extra-row"><input type="checkbox" data-extra="${id}" data-line="${line.uid}" ${line.extras[id]?'checked':''} ${id==='sauce'&&line.ingredients.sauce===false?'disabled':''}><span>${label}</span><small>${price===0?'Kostenlos':'+'+euro(price)}</small></label>`);
 const ingredientExtras=optional.map(([id,,label])=>`<label class="extra-row"><input type="checkbox" data-ingredient="${id}" data-line="${line.uid}" ${line.ingredients[id]?'checked':''}><span>${label}</span><small>+${euro(ingredientAddPrices[id]||0)}</small></label>`);
 const all=[...baseExtras,...ingredientExtras];
 const free=all.filter((_,i)=>i<baseExtras.length&&extras[i][2]===0);
 const paid=all.filter((_,i)=>i>=baseExtras.length||extras[i][2]>0);
 return `<p class="option-hint">Extras wählen (kostenlose zuerst):</p><div class="extras extras-rows">${[...free,...paid].join('')}</div>`;
}
function priceOf(line){const p=products.find(x=>x.id===line.id);const defaults=defaultIds(p);const added=ingredients.reduce((sum,[id])=>sum+(!defaults.has(id)&&line.ingredients[id]===true?(ingredientAddPrices[id]||0):0),0);return line.price+added+extras.reduce((n,[id,,price])=>n+(line.extras[id]?price:0),0)}
function newLine(p){return {drink:p.category==='combos'?'water':null,uid:++serial,id:p.id,name:p.name,price:p.price,image:p.image,category:p.category,ingredients:Object.fromEntries(ingredients.map(([id])=>[id,defaultIds(p).has(id)])),extras:{},halved:false,note:''}}
function renderHomeCategories(){document.querySelectorAll('.home-category-panel').forEach(panel=>{const cat=panel.dataset.cat;panel.innerHTML=products.filter(p=>p.category===cat).map(p=>`<button class="home-product" data-add="${p.id}"><img src="assets/${p.image}" alt=""><span><strong>${esc(p.name)}</strong><small>${esc(p.desc)}</small></span><b>${euro(p.price)} +</b></button>`).join('')})}
function renderMenu(){const items=products.filter(p=>filter==='all'||p.category===filter);const html=items.map(p=>`<article class="product">${p.id==='spicy'?'<span class="spicy-badge">🌶 Scharf</span>':''}<div class="product-thumb ${isShawarma(p)?'shawarma-thumb':''}"><img src="assets/${p.image}" alt="${esc(p.name)}" loading="lazy"></div><div class="product-main"><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><div class="price">${euro(p.price)}</div></div>${isShawarma(p)?`<div class="product-ingredients">${ingredientsHtml(null,false,p)}</div>`:''}<button class="product-order-btn" data-add="${p.id}" aria-label="${esc(p.name)} bestellen">${isShawarma(p)?'🌯 Jetzt bestellen':'＋ Hinzufügen'} <span aria-hidden="true">›</span></button></article>`).join('');$('#products').innerHTML=html;$('#homeProducts').innerHTML=html}
function add(id){const p=products.find(x=>x.id===id);if(!p)return;cart.push(newLine(p));renderOrder();updateBottom();showAddedToast(p.name)}
let toastTimer;function showAddedToast(name){const toast=$('#addedToast');if(!toast)return;toast.querySelector('.toast-product').textContent=name;toast.classList.add('show');toast.setAttribute('aria-hidden','false');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.classList.remove('show');toast.setAttribute('aria-hidden','true')},2700)}
function remove(uid){cart=cart.filter(x=>x.uid!==uid);renderOrder();updateBottom()}
function minus(id){const i=cart.map(x=>x.id).lastIndexOf(id);if(i>=0){cart.splice(i,1);renderOrder();updateBottom()}}
function amount(){return cart.reduce((s,x)=>s+priceOf(x),0)}
function row(p){const count=cart.filter(x=>x.id===p.id).length;return `<div class="order-product"><div class="order-product-top"><div class="order-thumb ${isShawarma(p)?'shawarma-thumb':''}"><img src="assets/${p.image}" alt="" loading="lazy"></div><div class="name"><strong>${esc(p.name)}</strong><small>${euro(p.price)} · ${esc(p.desc)}</small></div><div class="qty"><button data-minus="${p.id}" aria-label="${esc(p.name)} reduzieren" ${count===0?'disabled':''}>−</button><span>${count}</span><button data-add="${p.id}" aria-label="${esc(p.name)} hinzufügen">+</button></div></div></div>`}
function renderOrder(){renderCart()}
function renderCart(){const el=$('#cartItems');el.innerHTML=cart.length?cart.map(x=>`<article class="cart-line"><div class="cart-line-top"><img class="cart-mini-photo" src="assets/${x.image}" alt=""><strong>${esc(x.name)}</strong><strong>${euro(priceOf(x))}</strong><div class="cart-qty"><button data-remove="${x.uid}" aria-label="Eine Portion entfernen">−</button><span>1</span><button data-add="${x.id}" aria-label="Eine Portion hinzufügen">+</button></div><button class="remove-line" data-remove="${x.uid}" aria-label="Entfernen">×</button></div>${x.category==='combos'?`<div class="combo-included">✓ Shawarma · ✓ Pommes Frites · ✓ 1 Getränk</div><label class="combo-drink">Getränk wählen<select data-combo-drink="${x.uid}">${drinkChoices.map(([id,label])=>`<option value="${id}" ${x.drink===id?'selected':''}>${label}</option>`).join('')}</select></label>`:''}${isShawarma(x)?`<p class="option-hint"><strong>Shawarma zusammenstellen</strong> · Zutaten antippen, um sie abzuwählen:</p>${ingredientsHtml(x,true)}${extrasHtml(x)}<label class="half-option"><input type="checkbox" data-half="${x.uid}" ${x.halved?'checked':''}>In zwei Hälften schneiden (kostenlos)</label><label class="line-comment">Kommentar zu dieser Shawarma<textarea rows="2" maxlength="220" data-note="${x.uid}" placeholder="z. B. wenig Soße, extra knusprig ...">${esc(x.note)}</textarea></label>`:''}</article>`).join(''):'<p class="muted">Noch keine Produkte ausgewählt.</p>';$('#total').textContent=euro(amount());$('#checkoutTotal').textContent=euro(amount())}
function updateBottom(){const count=cart.length;$('#bottomCount').textContent=count+' Artikel · '+euro(amount());$('#bottomBar').classList.toggle('visible',count>0&&!$('#order').classList.contains('active'));document.body.classList.toggle('has-cart',count>0)}
function sendOrder(e){e.preventDefault();if(!cart.length){alert('Bitte zuerst Produkte auswählen.');return}const lines=cart.map((x,i)=>{const defaults=defaultIds(products.find(p=>p.id===x.id));const removed=isShawarma(x)?ingredients.filter(([id])=>defaults.has(id)&&!mandatoryIngredients.has(id)&&x.ingredients[id]===false).map(x=>x[2]):[];const ingredientAdded=isShawarma(x)?ingredients.filter(([id])=>!defaults.has(id)&&x.ingredients[id]===true).map(x=>x[2]):[];const added=extras.filter(([id])=>x.extras[id]).map(x=>x[1]);const drink=x.category==='combos'?'\n   Getränk: '+(drinkChoices.find(d=>d[0]===x.drink)?.[1]||'Mineralwasser')+'\n   Inklusive: Pommes Frites':'';return `${i+1}. ${x.name} — ${euro(priceOf(x))}${removed.length?'\n   Ohne: '+removed.join(', '):''}${ingredientAdded.length?'\n   Hinzugefügt: '+ingredientAdded.join(', '):''}${added.length?'\n   Extras: '+added.join(', '):''}${drink}${x.halved?'\n   In zwei Hälften schneiden':''}${x.note?'\n   Kommentar: '+x.note:''}`});const msg=['🌯 *Schawa Grill — Vorbestellung*','',...lines,'',`*Gesamt:* ${euro(amount())}`,`*Abholung in:* ${$('#pickup').value} Minuten`,`*Verzehr:* ${document.querySelector('input[name="orderMode"]:checked')?.value||'Zum Mitnehmen'}`, `*Allgemeiner Kommentar:* ${$('#comment').value.trim()||'—'}`,'','Bitte Verfügbarkeit und Abholzeit bestätigen.'].join('\n');if(CONFIG.whatsappNumber){window.open('https://wa.me/'+CONFIG.whatsappNumber+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer')}else{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(msg).then(()=>alert('Demo: Bestellung kopiert. WhatsApp-Nummer ist noch nicht eingerichtet.')).catch(()=>prompt('Demo-Bestellung kopieren:',msg));else prompt('Demo-Bestellung kopieren:',msg)}}
document.addEventListener('click',e=>{const nav=e.target.closest('[data-page]');if(nav){e.preventDefault();go(nav.dataset.page);if(nav.dataset.category)setFilter(nav.dataset.category)}const accordion=e.target.closest('.home-category-toggle');if(accordion)toggleHomeCategory(accordion.dataset.cat);const f=e.target.closest('[data-filter]');if(f)setFilter(f.dataset.filter);const a=e.target.closest('[data-add]');if(a)add(a.dataset.add);const r=e.target.closest('[data-remove]');if(r)remove(+r.dataset.remove);const m=e.target.closest('[data-minus]');if(m)minus(m.dataset.minus);});
document.addEventListener('change',e=>{const drink=e.target.closest('[data-combo-drink]');if(drink){const line=cart.find(x=>x.uid===+drink.dataset.comboDrink);if(line)line.drink=drink.value;}const ing=e.target.closest('[data-ingredient]');if(ing){const line=cart.find(x=>x.uid===+ing.dataset.line);if(line){if(mandatoryIngredients.has(ing.dataset.ingredient))return;line.ingredients[ing.dataset.ingredient]=ing.checked;if(ing.dataset.ingredient==='sauce'&&!ing.checked)line.extras.sauce=false;renderCart();updateBottom()}}const extra=e.target.closest('[data-extra]');if(extra){const line=cart.find(x=>x.uid===+extra.dataset.line);if(line){if(extra.dataset.extra==='sauce'&&line.ingredients.sauce===false)return;line.extras[extra.dataset.extra]=extra.checked;renderCart();updateBottom()}}const half=e.target.closest('[data-half]');if(half){const line=cart.find(x=>x.uid===+half.dataset.half);if(line)line.halved=half.checked}});
document.addEventListener('input',e=>{const note=e.target.closest('[data-note]');if(note){const line=cart.find(x=>x.uid===+note.dataset.note);if(line)line.note=note.value}});
function syncMenu(){const open=!$('#drawer').hidden;$('#menuBtn').classList.toggle('is-open',open);$('#menuBtn').setAttribute('aria-expanded',String(open));$('#menuBtn').setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');$('#menuBtn').innerHTML='<span class="menu-glyph">'+(open?'×':'☰')+'</span><span class="menu-caption">'+(open?'Schließen':'Menü')+'</span>'}$('#menuBtn').addEventListener('click',()=>{$('#drawer').hidden=!$('#drawer').hidden;syncMenu()});$('#clearCart').addEventListener('click',()=>{cart=[];renderOrder();updateBottom()});$('#orderForm').addEventListener('submit',sendOrder);
for(let n=15;n<=60;n+=5)$('#pickup').insertAdjacentHTML('beforeend',`<option value="${n}" ${n===20?'selected':''}>In ${n} Minuten</option>`);
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
$('#year').textContent=new Date().getFullYear();renderMenu();renderOrder();go(['home','menu','order','about','contact','privacy'].includes(location.hash.slice(1))?location.hash.slice(1):'home');
for(const id of ['googleRoute','wazeRoute'])document.getElementById(id)?.addEventListener('click',()=>alert('Demo: Standort noch nicht bestätigt. Navigation wird nach Festlegung der Adresse aktiviert.'));

document.getElementById('headerMap')?.addEventListener('click',()=>alert('Der Standort wird vor der Eröffnung bekanntgegeben. Die Google-Maps-Navigation wird dann aktiviert.'));
