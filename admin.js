'use strict';
let state={categories:[]};
const $=s=>document.querySelector(s);
const BUCKET='product-images';

function esc(s){return String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
function msg(t,cls=''){ $('#msg').className=cls;$('#msg').textContent=t;setTimeout(()=>$('#msg').textContent='',cls==='error'?9000:4000)}

function randomFileName(originalName){
  const ext=(originalName.split('.').pop()||'jpg').toLowerCase();
  const bytes=new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex}.${ext}`;
}

async function uploadImage(file){
  const allowed=['image/jpeg','image/png','image/webp','image/gif'];
  if(!allowed.includes(file.type)) throw new Error('نوع الصورة غير مسموح');
  if(file.size>5*1024*1024) throw new Error('الصورة أكبر من 5MB');
  const name=randomFileName(file.name);
  const { error } = await sb.storage.from(BUCKET).upload(name, file, { upsert: true });
  if(error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

function filenameFromUrl(url){
  if(!url) return null;
  try{ return decodeURIComponent(url.split('/').pop()); }catch{ return url.split('/').pop(); }
}
async function deleteImage(url){
  const name=filenameFromUrl(url);
  if(name) await sb.storage.from(BUCKET).remove([name]).catch(()=>{});
}

async function load(){
  const { data: cats, error: catErr } = await sb.from('categories').select('*, subcategories(*)').order('sort_order');
  if(catErr){ msg(catErr.message,'error'); return; }
  const { data: prods, error: prodErr } = await sb.from('products').select('*, subcategories(name)').order('id',{ascending:false});
  if(prodErr){ msg(prodErr.message,'error'); return; }

  const categories = (cats||[]).map(c=>({...c, subcategories:(c.subcategories||[]).sort((a,b)=>a.sort_order-b.sort_order)}));
  const productsByCat = {};
  categories.forEach(c=>productsByCat[c.id]=[]);
  (prods||[]).forEach(p=>{
    if(!productsByCat[p.category_id]) productsByCat[p.category_id]=[];
    productsByCat[p.category_id].push({...p, subcategory_name: p.subcategories?p.subcategories.name:null});
  });
  state = { categories: categories.map(c=>({...c, products: productsByCat[c.id]||[]})) };

  $('#pcat').innerHTML=state.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#scCat').innerHTML=state.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#bulkCat').innerHTML=state.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  updatePsub($('#pcat').value);
  updateBulkSub($('#bulkCat').value);
  render();
}

function updatePsub(catId){const c=state.categories.find(x=>x.id===catId);const subs=(c&&c.subcategories)||[];const has=subs.length>0;$('#psubWrap').style.display=has?'grid':'none';$('#psub').innerHTML='<option value="">بدون</option>'+subs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');}
function updateBulkSub(catId){const c=state.categories.find(x=>x.id===catId);const subs=(c&&c.subcategories)||[];const has=subs.length>0;$('#bulkSubWrap').style.display=has?'grid':'none';$('#bulkSub').innerHTML='<option value="">بدون</option>'+subs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');}

function render(){
 $('#cats').innerHTML=state.categories.map(c=>`<div class="admin-item"><div>${c.image?`<img src="${esc(c.image)}">`:'🖼️'}</div><strong>${esc(c.name)}</strong><div class="mini-actions"><label><input type="file" accept="image/*" data-cat="${esc(c.id)}" style="display:none"><button type="button" data-pick="${esc(c.id)}">صورة</button></label><button class="danger" data-delcat="${esc(c.id)}">حذف</button></div></div>`).join('');
 $('#products').innerHTML=state.categories.flatMap(c=>c.products.map(p=>`<div class="admin-item"><div>${p.image?`<img src="${esc(p.image)}">`:'🛍️'}</div><div><strong>${esc(p.name)}</strong><div class="muted">${esc(c.name)}${p.subcategory_name?' · '+esc(p.subcategory_name):''} · $${Number(p.price).toFixed(2)}</div></div><div class="mini-actions"><button data-edit="${p.id}">تعديل</button><button class="danger" data-delete="${p.id}">حذف</button></div></div>`)).join('')||'<p class="muted">لا توجد منتجات.</p>';
 $('#subcats').innerHTML=state.categories.flatMap(c=>(c.subcategories||[]).map(s=>`<div class="admin-item"><div><strong>${esc(s.name)}</strong><div class="muted">${esc(c.name)}</div></div><div class="mini-actions"><button class="danger" data-delsub="${s.id}">حذف</button></div></div>`)).join('')||'<p class="muted">لا توجد أقسام فرعية بعد.</p>';
 document.querySelectorAll('[data-cat]').forEach(i=>i.onchange=uploadCategory);
 document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>document.querySelector(`[data-cat="${CSS.escape(b.dataset.pick)}"]`).click());
 document.querySelectorAll('[data-delcat]').forEach(b=>b.onclick=()=>removeCategory(b.dataset.delcat));
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(+b.dataset.edit));
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(+b.dataset.delete));
 document.querySelectorAll('[data-delsub]').forEach(b=>b.onclick=()=>removeSub(+b.dataset.delsub));
}

$('#addCatBtn').onclick=async()=>{
  const name=$('#newCatName').value.trim();
  if(!name) return msg('اكتب اسم القسم','error');
  try{
    const id='cat_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    const maxOrder=Math.max(-1, ...state.categories.map(c=>c.sort_order??0));
    const { error } = await sb.from('categories').insert({id,name,sort_order:maxOrder+1});
    if(error) throw error;
    $('#newCatName').value='';
    await load();
    msg('تمت إضافة القسم بنجاح 🎉','ok');
  }catch(x){ msg(x.message,'error'); }
};

async function removeCategory(id){
  const c=state.categories.find(x=>x.id===id);
  if(!c) return;
  const productCount=(c.products||[]).length;
  const subCount=(c.subcategories||[]).length;
  if(productCount>0 || subCount>0){
    if(!confirm(`هالقسم فيه ${productCount} منتج و${subCount} قسم فرعي. حذف القسم رح يحذفهم معه نهائياً. متأكد؟`)) return;
  } else if(!confirm('حذف هذا القسم نهائياً؟')) return;
  try{
    for(const s of (c.subcategories||[])){
      await sb.from('products').update({subcategory_id:null}).eq('subcategory_id',s.id);
      await sb.from('subcategories').delete().eq('id',s.id);
    }
    for(const p of (c.products||[])){
      const { error } = await sb.from('products').delete().eq('id',p.id);
      if(error) throw error;
      if(p.image) await deleteImage(p.image);
    }
    const { error } = await sb.from('categories').delete().eq('id',id);
    if(error) throw error;
    if(c.image) await deleteImage(c.image);
    await load();
    msg('تم حذف القسم','ok');
  }catch(x){ msg(x.message,'error'); }
}

async function uploadCategory(e){
  const catId=e.target.dataset.cat;
  const file=e.target.files[0];
  if(!file) return;
  try{
    const c=state.categories.find(x=>x.id===catId);
    const newUrl=await uploadImage(file);
    const { error } = await sb.from('categories').update({image:newUrl}).eq('id',catId);
    if(error) throw error;
    if(c && c.image) await deleteImage(c.image);
    await load();
    msg('تم تحديث صورة القسم','ok');
  }catch(x){ msg(x.message,'error'); }
}

function find(id){for(const c of state.categories){const p=c.products.find(p=>Number(p.id)===Number(id));if(p)return {...p,cat:c.id}}}
function edit(id){let p=find(id);if(!p)return;$('#pid').value=p.id;$('#pcat').value=p.cat;updatePsub(p.cat);$('#psub').value=p.subcategory_id||'';$('#pname').value=p.name;$('#pprice').value=p.price;$('#pdesc').value=p.description||'';$('#pgender').value=p.gender||'men';$('#psize').value=p.size||'medium';$('#perf').style.display=p.cat==='perfumes'?'block':'none';$('#ppreview').innerHTML=p.image?`<img src="${esc(p.image)}">`:'';$('#cancelEdit').style.display='inline-block';scrollTo({top:0,behavior:'smooth'});}

async function remove(id){
  if(!confirm('حذف هذا المنتج نهائياً؟'))return;
  try{
    const p=find(id);
    const { error } = await sb.from('products').delete().eq('id',id);
    if(error) throw error;
    if(p && p.image) await deleteImage(p.image);
    await load();
    msg('تم حذف المنتج','ok');
  }catch(x){ msg(x.message,'error'); }
}

async function removeSub(id){
  if(!confirm('حذف هذا القسم الفرعي؟ المنتجات المرتبطة فيه بترجع بدون قسم فرعي.'))return;
  try{
    const { error: e1 } = await sb.from('products').update({subcategory_id:null}).eq('subcategory_id',id);
    if(e1) throw e1;
    const { error: e2 } = await sb.from('subcategories').delete().eq('id',id);
    if(e2) throw e2;
    await load();
    msg('تم حذف القسم الفرعي','ok');
  }catch(x){ msg(x.message,'error'); }
}

$('#pcat').onchange=()=>{$('#perf').style.display=$('#pcat').value==='perfumes'?'block':'none';updatePsub($('#pcat').value)};

$('#productForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const id=$('#pid').value?Number($('#pid').value):null;
    const cat=$('#pcat').value;
    const subRaw=$('#psub').value;
    const name=$('#pname').value.trim();
    const price=Number($('#pprice').value);
    const desc=$('#pdesc').value.trim();
    let gender=null, size=null;
    if(cat==='perfumes'){ gender=$('#pgender').value; size=$('#psize').value; }
    if(!name || !(price>=0)) throw new Error('لازم اسم المنتج والسعر وقسم صحيح');

    let image=undefined;
    const file=$('#pimage').files[0];
    if(file){ image=await uploadImage(file); }

    const payload={
      category_id:cat,
      subcategory_id: subRaw?Number(subRaw):null,
      name, price, description:desc, gender, size,
    };
    if(image!==undefined) payload.image=image;

    let oldImage=null;
    if(id){
      const existing=find(id);
      oldImage = existing ? existing.image : null;
      const { error } = await sb.from('products').update(payload).eq('id',id);
      if(error) throw error;
    } else {
      const { error } = await sb.from('products').insert(payload);
      if(error) throw error;
    }
    if(image!==undefined && oldImage && oldImage!==image) await deleteImage(oldImage);

    e.target.reset();
    $('#pid').value='';
    $('#ppreview').innerHTML='';
    $('#cancelEdit').style.display='none';
    updatePsub($('#pcat').value);
    await load();
    msg('تم حفظ المنتج بنجاح','ok');
  }catch(x){ msg(x.message,'error'); }
};

$('#cancelEdit').onclick=()=>{$('#productForm').reset();$('#pid').value='';$('#ppreview').innerHTML='';$('#cancelEdit').style.display='none';$('#perf').style.display='none';updatePsub($('#pcat').value)};

$('#scAdd').onclick=async()=>{
  const cat=$('#scCat').value, name=$('#scName').value.trim();
  if(!name) return msg('اكتب اسم القسم الفرعي','error');
  try{
    const c=state.categories.find(x=>x.id===cat);
    const maxOrder=Math.max(-1, ...((c&&c.subcategories||[]).map(s=>s.sort_order)));
    const { error } = await sb.from('subcategories').insert({category_id:cat,name,sort_order:maxOrder+1});
    if(error) throw error;
    $('#scName').value='';
    await load();
    msg('تم إضافة القسم الفرعي','ok');
  }catch(x){ msg(x.message,'error'); }
};

$('#bulkCat').onchange=()=>updateBulkSub($('#bulkCat').value);

function parseBulkLine(line){
 const arabicDigits='٠١٢٣٤٥٦٧٨٩';
 let s=line.replace(/[٠-٩]/g,d=>String(arabicDigits.indexOf(d)));
 s=s.replace(/،/g,',').trim();
 let m=s.match(/^(.+?)\s*[,\-:]\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\$?\s*$/);
 if(!m)m=s.match(/^(.+?)\s+\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\$?\s*$/);
 if(!m)return null;
 const name=m[1].trim().replace(/^[,\-:]+|[,\-:]+$/g,'').trim();
 const price=m[2].trim();
 if(!name||!price)return null;
 return {name,price};
}

$('#bulkAdd').onclick=async()=>{
 const cat=$('#bulkCat').value, sub=$('#bulkSub').value, raw=$('#bulkList').value;
 const lines=raw.split('\n').map(l=>l.trim()).filter(Boolean);
 if(!lines.length)return msg('اكتب سطر وحد ع الأقل: الاسم,السعر','error');
 let ok=0,fail=[];
 for(const line of lines){
  const parsed=parseBulkLine(line);
  if(!parsed){fail.push(line);continue;}
  try{
    const { error } = await sb.from('products').insert({
      category_id:cat,
      subcategory_id: sub?Number(sub):null,
      name:parsed.name, price:Number(parsed.price), description:'', gender:null, size:null,
    });
    if(error) throw error;
    ok++;
    $('#bulkProgress').textContent=`تمت إضافة ${ok} من ${lines.length}...`;
  }
  catch(x){fail.push(line+' — '+x.message);}
 }
 await load();
 $('#bulkList').value='';
 if(fail.length){$('#bulkProgress').textContent='';msg(`تمت إضافة ${ok} منتج. ${fail.length} سطر ما انضاف — تأكد الشكل: الاسم,السعر:
`+fail.join('\n'),'error')}
 else{$('#bulkProgress').textContent='';msg(`تمت إضافة ${ok} منتج بنجاح 🎉`,'ok')}
};

$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const { error } = await sb.auth.signInWithPassword({
      email: $('#email').value,
      password: $('#password').value,
    });
    if(error) throw error;
    $('#login').style.display='none';
    $('#dash').style.display='block';
    await load();
  }catch(x){ $('#loginMsg').textContent = x.message==='Invalid login credentials' ? 'البريد الإلكتروني أو كلمة السر غير صحيحة' : x.message; }
};

$('#logout').onclick=async()=>{ await sb.auth.signOut(); location.reload(); };

(async()=>{
  const { data: { session } } = await sb.auth.getSession();
  if(session){
    $('#login').style.display='none';
    $('#dash').style.display='block';
    await load();
  }
})();
