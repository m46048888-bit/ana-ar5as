'use strict';
let categories=[],products={},cart=JSON.parse(localStorage.getItem('anaAr5Cart')||'{}'),currentCategory=null,currentGender='all',currentSize='all',currentSub='all';
const $=s=>document.querySelector(s);const money=n=>`$${Number(n).toFixed(2)}`;
function saveCart(){localStorage.setItem('anaAr5Cart',JSON.stringify(cart));renderCart()}
function allProducts(){return categories.flatMap(c=>products[c.id]||[])}
function imageMarkup(src,emoji='🛍️',cls='product-img'){return src?`<div class="${cls}"><img src="${esc(src)}" alt="" loading="lazy"></div>`:`<div class="${cls}">${emoji}</div>`}
function esc(s){return String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}

async function loadStore(){
  const { data: cats, error: catErr } = await sb
    .from('categories')
    .select('*, subcategories(*)')
    .order('sort_order', { ascending: true });
  if (catErr) throw catErr;

  const { data: prods, error: prodErr } = await sb
    .from('products')
    .select('*, subcategories(name)')
    .order('id', { ascending: false });
  if (prodErr) throw prodErr;

  categories = (cats || []).map(c => ({
    ...c,
    subcategories: (c.subcategories || []).sort((a,b) => a.sort_order - b.sort_order),
  }));

  products = {};
  categories.forEach(c => products[c.id] = []);
  (prods || []).forEach(p => {
    if (!products[p.category_id]) products[p.category_id] = [];
    products[p.category_id].push({
      ...p,
      subcategory_name: p.subcategories ? p.subcategories.name : null,
    });
  });

  renderCategories();
  renderCart();
}

function renderCategories(){$('#categoryCards').innerHTML=categories.map(c=>`<button class="category ${c.image?'has-image':''}" data-cat="${esc(c.id)}">${c.image?`<img class="category-image" src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy">`:''}<span class="cat-overlay"></span><span class="cat-icon">${({accessories:'💎',makeup:'💄',perfumes:'🧴',flowers:'🌹',home:'🏠',cleaners:'🧼',underwear:'🩲',gifts:'🎁',birthday:'🎂',games:'🎮',stationery:'✏️',bags:'👜'})[c.id]||'🛍️'}</span><div class="cat-content"><h3>${esc(c.name)}</h3><small>${(products[c.id]||[]).length} منتج</small></div></button>`).join('');document.querySelectorAll('.category').forEach(x=>x.onclick=()=>showCategory(x.dataset.cat))}
function currentSubcats(){const c=categories.find(x=>x.id===currentCategory);return (c&&c.subcategories)||[]}
function renderSubFilters(){const subs=currentSubcats();const has=subs.length>0;$('#subFilters').classList.toggle('hidden',!has);if(!has)return;$('#subFilters').innerHTML=`<button class="filter-btn active" data-sub="all">الكل</button>`+subs.map(s=>`<button class="filter-btn" data-sub="${s.id}">${esc(s.name)}</button>`).join('');$('#subFilters').querySelectorAll('.filter-btn').forEach(b=>b.onclick=()=>{currentSub=b.dataset.sub;$('#subFilters').querySelectorAll('.filter-btn').forEach(x=>x.classList.toggle('active',x===b));renderProducts()})}
function showCategory(id){let c=categories.find(x=>x.id===id);currentCategory=id;currentGender='all';currentSize='all';currentSub='all';$('#sectionTitle').textContent=c.name;$('#productSearch').value='';$('#perfumeFilters').classList.toggle('hidden',id!=='perfumes');document.querySelectorAll('#perfumeFilters .filter-btn,.size-btn').forEach(b=>b.classList.remove('active'));document.querySelector('#perfumeFilters .filter-btn[data-gender="all"]')?.classList.add('active');document.querySelector('.size-btn[data-size="all"]')?.classList.add('active');renderSubFilters();renderProducts();$('#products').classList.remove('hidden');location.hash='products';window.scrollTo({top:$('#products').offsetTop-80,behavior:'smooth'})}
function renderProducts(){if(!currentCategory)return;const q=($('#productSearch').value||'').trim().toLowerCase();const hasSubs=currentSubcats().length>0;const list=(products[currentCategory]||[]).filter(p=>{const okSearch=(p.name||'').toLowerCase().includes(q)||(p.description||'').toLowerCase().includes(q);const genderOk=currentCategory!=='perfumes'||currentGender==='all'||p.gender===currentGender;const sizeOk=currentCategory!=='perfumes'||currentSize==='all'||p.size===currentSize;const subOk=!hasSubs||currentSub==='all'||String(p.subcategory_id)===String(currentSub);return okSearch&&genderOk&&sizeOk&&subOk});$('#productsGrid').innerHTML=list.map(p=>`<article class="product">${imageMarkup(p.image,'🛍️')}<h3>${esc(p.name)}</h3><p class="product-description">${esc(p.description||'')}</p>${currentCategory==='perfumes'?`<div class="product-meta"><span>${p.gender==='men'?'رجالي':'نسائي'}</span><span>${p.size==='small'?'صغير':p.size==='medium'?'وسط':'كبير'}</span></div>`:(hasSubs&&p.subcategory_name?`<div class="product-meta"><span>${esc(p.subcategory_name)}</span></div>`:'')}<div class="product-row"><span class="price">${money(p.price)}</span><button class="add" data-id="${p.id}">+ أضف للسلة</button></div></article>`).join('');$('#noResults').classList.toggle('hidden',list.length>0);document.querySelectorAll('.add').forEach(b=>b.onclick=()=>addToCart(+b.dataset.id))}
function addToCart(id){cart[id]=(cart[id]||0)+1;saveCart();openCart()}
function renderCart(){let aps=allProducts();let list=Object.entries(cart).filter(([,q])=>q>0).map(([id,q])=>{let p=aps.find(x=>String(x.id)===id);return p?`<div class="cart-item"><div><h4>${esc(p.name)}</h4><small>${money(p.price)} × ${q}</small><div class="qty"><button data-dec="${p.id}">−</button><span>${q}</span><button data-inc="${p.id}">+</button><button class="remove" data-remove="${p.id}">حذف</button></div></div><strong class="price">${money(p.price*q)}</strong></div>`:''}).join('');$('#cartItems').innerHTML=list||'<div class="empty">السلة فاضية حالياً 🛒<br>اختار منتجاتك وخلّينا نجهز طلبك.</div>';let total=0,count=0;Object.entries(cart).forEach(([id,q])=>{let p=aps.find(x=>String(x.id)===id);if(p){total+=p.price*q;count+=q}});$('#cartTotal').textContent=money(total);$('#cartCount').textContent=count;document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{cart[b.dataset.inc]=(cart[b.dataset.inc]||0)+1;saveCart()});document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{cart[b.dataset.dec]=Math.max(0,(cart[b.dataset.dec]||0)-1);if(!cart[b.dataset.dec])delete cart[b.dataset.dec];saveCart()});document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{delete cart[b.dataset.remove];saveCart()})}
function openCart(){$('#overlay').classList.remove('hidden');$('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false')}function closeCart(){$('#overlay').classList.add('hidden');$('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true')}

/* ===== قائمة الموبايل ===== */
function toggleMenu(force){
  const nav=$('#mainNav'),btn=$('#menuToggle'),ov=$('#navOverlay');
  const open=force!==undefined?force:!nav.classList.contains('open');
  nav.classList.toggle('open',open);
  btn.classList.toggle('open',open);
  btn.setAttribute('aria-expanded',String(open));
  ov.classList.toggle('hidden',!open);
}
$('#menuToggle').onclick=()=>toggleMenu();
$('#navOverlay').onclick=()=>toggleMenu(false);
document.querySelectorAll('#mainNav a').forEach(a=>a.onclick=()=>toggleMenu(false));

/* ===== البحث الشامل بكل المنتجات ===== */
function categoryNameOf(catId){const c=categories.find(x=>x.id===catId);return c?c.name:''}
function renderGlobalSearch(){
  const box=$('#globalSearchResults');
  const q=($('#globalSearch').value||'').trim().toLowerCase();
  if(!q){box.classList.add('hidden');box.innerHTML='';return}
  const list=allProducts().filter(p=>(p.name||'').toLowerCase().includes(q)||(p.description||'').toLowerCase().includes(q)).slice(0,24);
  if(!list.length){box.innerHTML='<div class="gs-empty">ما لقينا نتائج مطابقة.</div>';box.classList.remove('hidden');return}
  box.innerHTML=list.map(p=>`<button class="gs-item" data-gid="${p.id}" data-gcat="${esc(p.category_id)}">${imageMarkup(p.image,'🛍️','gs-img')}<div class="gs-info"><strong>${esc(p.name)}</strong><small>${esc(categoryNameOf(p.category_id))}</small></div><span class="price">${money(p.price)}</span></button>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-gid]').forEach(b=>b.onclick=()=>{
    showCategory(b.dataset.gcat);
    $('#productSearch').value='';
    box.classList.add('hidden');
    $('#globalSearch').value='';
    toggleMenu(false);
  });
}
$('#globalSearch').addEventListener('input',renderGlobalSearch);
$('#globalSearch').addEventListener('focus',renderGlobalSearch);
document.addEventListener('click',e=>{
  if(!$('#globalSearchWrap').contains(e.target)) $('#globalSearchResults').classList.add('hidden');
});

/* ===== QR Code لرابط الموقع ===== */
function renderQr(){
  const el=$('#qrcode');
  if(!el||typeof QRCode==='undefined') return;
  el.innerHTML='';
  new QRCode(el,{text:window.location.origin+window.location.pathname,width:120,height:120,colorDark:'#0d1e17',colorLight:'#f4ead8',correctLevel:QRCode.CorrectLevel.M});
}
renderQr();
$('#productSearch').addEventListener('input',renderProducts);document.querySelectorAll('#perfumeFilters .filter-btn').forEach(b=>b.onclick=()=>{currentGender=b.dataset.gender;document.querySelectorAll('#perfumeFilters .filter-btn').forEach(x=>x.classList.toggle('active',x===b));renderProducts()});document.querySelectorAll('.size-btn').forEach(b=>b.onclick=()=>{currentSize=b.dataset.size;document.querySelectorAll('.size-btn').forEach(x=>x.classList.toggle('active',x===b));renderProducts()});$('#openCart').onclick=openCart;$('#closeCart').onclick=closeCart;$('#overlay').onclick=closeCart;$('#backToCategories').onclick=()=>{$('#products').classList.add('hidden');location.hash='categories';window.scrollTo({top:$('#categories').offsetTop-80,behavior:'smooth'})};$('#checkout').onclick=()=>{const aps=allProducts(),lines=Object.entries(cart).map(([id,q])=>{const p=aps.find(x=>String(x.id)===id);return p&&q?`• ${p.name} × ${q} = ${money(p.price*q)}`:null}).filter(Boolean);if(!lines.length)return alert('السلة فاضية');const total=Object.entries(cart).reduce((s,[id,q])=>{const p=aps.find(x=>String(x.id)===id);return s+(p?p.price*q:0)},0);const text=encodeURIComponent(`مرحباً، بدي أطلب من عنا أرخص:\n${lines.join('\n')}\nالمجموع: ${money(total)}`);window.open(`https://wa.me/96170301197?text=${text}`,'_blank','noopener,noreferrer')};$('#year').textContent=new Date().getFullYear();loadStore().catch(()=>{$('#categoryCards').innerHTML='<div class="empty">تعذر تحميل المتجر حالياً.</div>'});
