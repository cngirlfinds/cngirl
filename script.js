
const cats=["Camisetas","Chaquetas","Sudaderas","Pantalones","Conjuntos","Zapatillas","Botas y botines","Zapatos y tacones","Sandalias y chanclas","Bolsos","Joyería","Accesorios","Relojes","Maletas y equipaje"];
const featured=["Juicy Couture","Victoria's Secret","Rick Owens","Chrome Hearts","Miu Miu","Balenciaga","Nike","Vivienne Westwood"];
const palette={Negro:"#151515",Blanco:"#fff",Rosa:"#f28cbd",Rojo:"#ba2d3e",Azul:"#4c7dc3",Marrón:"#81583c",Gris:"#999",Verde:"#4d956d",Beige:"#d4bba0",Morado:"#8c61b0",Amarillo:"#edca53",Naranja:"#eb8843",Dorado:"#c6a24b",Plateado:"#b6bdc5"};

let products=[],brands=[],cat="",gender="",color="";
let visitasPorProducto={};

const SUPABASE_STATS_URL="https://vrydzhkdofhmgkjpwywu.supabase.co/rest/v1/rpc/cngirl_public_views";
const SUPABASE_PUBLIC_KEY="sb_publishable_lf6NPiYEJqdvsW8PU1_VOA_nGuOinYb";

const el=id=>document.getElementById(id);
const norm=v=>String(v||"").trim().toLocaleLowerCase("es");

function normalizarBusqueda(v){
 return norm(v)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/[’‘`´]/g,"'")
  .replace(/\s+/g," ");
}

// VISITAS PÚBLICAS
async function cargarVisitas(){
 try{
  const r=await fetch(SUPABASE_STATS_URL,{
   method:"POST",
   headers:{
    "apikey":SUPABASE_PUBLIC_KEY,
    "Content-Type":"application/json"
   },
   body:"{}"
  });

  if(!r.ok)throw Error("Error HTTP "+r.status);

  const datos=await r.json();
  visitasPorProducto={};

  datos.forEach(p=>{
   visitasPorProducto[String(p.product_id)]=Number(p.visitas)||0;
  });
 }catch(e){
  console.warn("No se pudieron cargar las visitas:",e);
 }
}

function makeButton(label,active,fn){
 const b=document.createElement("button");
 b.type="button";
 b.textContent=label;
 b.className=active?"active":"";
 b.onclick=fn;
 return b;
}

// FILTROS
function filters(){
 el("categories").replaceChildren();

 ["Todas",...cats].forEach(c=>{
  el("categories").append(
   makeButton(c,c==="Todas"?!cat:cat===c,()=>{
    cat=c==="Todas"?"":c;
    filters();
    render();
   })
  );
 });

 el("genders").replaceChildren();

 ["Todos","Mujer","Hombre","Unisex"].forEach(g=>{
  el("genders").append(
   makeButton(g,g==="Todos"?!gender:gender===g,()=>{
    gender=g==="Todos"?"":g;
    filters();
    render();
   })
  );
 });

 el("colors").replaceChildren();

 el("colors").append(
  makeButton("Todos",!color,()=>{
   color="";
   filters();
   render();
  })
 );

 Object.entries(palette).forEach(([name,hex])=>{
  const b=document.createElement("button");
  b.type="button";
  b.title=name;
  b.setAttribute("aria-label",name);
  b.setAttribute("aria-pressed",String(color===name));
  b.className="color-dot"+(color===name?" active":"");
  b.style.setProperty("--swatch",hex);

  b.onclick=()=>{
   color=color===name?"":name;
   filters();
   render();
  };

  el("colors").append(b);
 });
}

// MARCAS
function setBrand(b){
 const select=el("brand");

 // Asegurarnos de que la marca exista en el desplegable.
 if(b && !Array.from(select.options).some(o=>o.value===b)){
  select.add(new Option(b,b));
 }

 select.value=b;
 el("brand-search").value="";
 updateBrandOptions();
 render();

 el("catalogo").scrollIntoView({behavior:"smooth"});
}

function updateBrandOptions(){
 const search=normalizarBusqueda(el("brand-search").value);
 const select=el("brand");
 const selected=select.value;

 select.replaceChildren(new Option("Todas las marcas",""));

 brands
  .filter(b=>
   normalizarBusqueda(b).includes(search)||
   b===selected
  )
  .forEach(b=>select.add(new Option(b,b)));

 select.value=selected;
}

function buscarMarcaConEnter(){
 const busqueda=normalizarBusqueda(el("brand-search").value);
 if(!busqueda)return;

 const marca=
  brands.find(b=>normalizarBusqueda(b)===busqueda)||
  brands.find(b=>normalizarBusqueda(b).startsWith(busqueda))||
  brands.find(b=>normalizarBusqueda(b).includes(busqueda));

 if(marca){
  setBrand(marca);
 }else{
  // Si no coincide con una marca de la lista,
  // buscar igualmente el texto en el catálogo.
  el("brand").value="";
  el("search").value=el("brand-search").value;
  el("header-search").value=el("brand-search").value;
  render();
  el("catalogo").scrollIntoView({behavior:"smooth"});
 }
}

// BUSCAR PRODUCTOS POR NOMBRE O MARCA
function coincideBusqueda(p,q){
 if(!q)return true;

 const marcasAdicionales=Array.isArray(p.extraBrands)
  ?p.extraBrands
  :[];

 const campos=[
  p.name,
  p.brand,
  p.category,
  ...marcasAdicionales
 ];

 const texto=normalizarBusqueda(campos.join(" "));

 // Coincidencia normal, incluyendo nombres y marcas.
 if(texto.includes(q))return true;

 // Permite búsquedas de varias palabras sin exigir
 // que aparezcan juntas en el mismo orden.
 const palabras=q.split(/\s+/).filter(Boolean);

 if(palabras.length>1 &&
    palabras.every(palabra=>texto.includes(palabra))){
  return true;
 }

 // Coincidencia con marcas conocidas del catálogo.
 return brands.some(marca=>{
  const nombreMarca=normalizarBusqueda(marca);

  if(!nombreMarca.includes(q))return false;

  return normalizarBusqueda(p.brand)===nombreMarca ||
   marcasAdicionales.some(b=>
    normalizarBusqueda(b)===nombreMarca
   );
 });
}

// MOSTRAR PRODUCTOS
function render(){
 const q=normalizarBusqueda(
  el("search").value||el("header-search").value
 );

 const b=el("brand").value;

 let arr=products.filter(p=>{
  const pg=norm(p.gender);
  const pc=norm(p.color);

  const genderOk=
   !gender||
   pg===norm(gender)||
   (gender!=="Unisex"&&pg==="unisex");

  const brandOk=
   !b||
   normalizarBusqueda(p.brand)===normalizarBusqueda(b)||
   (
    Array.isArray(p.extraBrands)&&
    p.extraBrands.some(m=>
     normalizarBusqueda(m)===normalizarBusqueda(b)
    )
   );

  return (!cat||norm(p.category)===norm(cat))
   &&brandOk
   &&genderOk
   &&(!color||pc===norm(color))
   &&coincideBusqueda(p,q);
 });

 const sort=el("sort").value;

 arr.sort((a,b)=>
  sort==="cheap"
   ?Number(a.price)-Number(b.price)
   :sort==="expensive"
   ?Number(b.price)-Number(a.price)
   :sort==="az"
   ?String(a.name).localeCompare(String(b.name),"es")
   :String(b.date||"").localeCompare(String(a.date||""))
 );

 el("count").textContent=arr.length+" productos";

 const box=el("products");
 box.replaceChildren();

 if(!arr.length){
  const div=document.createElement("div");
  div.className="empty";

  div.textContent=products.length
   ?"No encontramos productos con esos filtros ♡"
   :"Próximamente, tus nuevos favoritos ♡ — Estamos preparando los primeros hallazgos de CNgirl.";

  box.append(div);
 }

 arr.forEach(p=>{
  if(!/^https?:\/\//.test(p.url||""))return;

  const id=products.indexOf(p);

  const a=document.createElement("a");
  a.className="product";
  a.href="producto.html?id="+encodeURIComponent(id);

  const img=document.createElement("img");
  img.src=(p.image||"").replace(/^\/assets\//,"assets/");
  img.alt=p.name||"Producto";
  img.loading="lazy";

  const info=document.createElement("div");
  info.className="info";

  const brand=document.createElement("div");
  brand.className="brand";
  brand.textContent=p.brand||"";

  const name=document.createElement("h3");
  name.textContent=p.name||"";

  const price=document.createElement("strong");
  price.textContent=Number(p.price).toLocaleString("es-ES",{
   style:"currency",
   currency:"EUR"
  });

  const link=document.createElement("span");
  link.className="link";
  link.textContent="VER FOTOS Y PRODUCTO ↗";

  // CONTADOR DE VISITAS
  const contador=document.createElement("span");
  contador.className="cngirl-views";
  contador.setAttribute("aria-label","Visitas del producto");

  contador.textContent=
   "👁️ "+(visitasPorProducto[String(id)]||0)
    .toLocaleString("es-ES");

  contador.style.display="inline-block";
  contador.style.marginTop="9px";
  contador.style.fontSize="13px";
  contador.style.color="#95657e";
  contador.style.fontWeight="600";

  info.append(brand,name,price,link,contador);
  a.append(img,info);
  box.append(a);
 });
}

// CARGAR CATÁLOGO
async function init(){
 try{
  const [loadedBrands,loadedProducts]=await Promise.all([
   fetch("data/brands.json").then(x=>x.json()),
   fetch("data/products.json").then(x=>x.json())
  ]);

  brands=Array.isArray(loadedBrands)?loadedBrands:[];

  products=Array.isArray(loadedProducts)
   ?loadedProducts
   :(loadedProducts&&typeof loadedProducts==="object"
     ?[loadedProducts]
     :[]);

  brands.forEach(b=>{
   const btn=document.createElement("button");
   btn.textContent=b;
   btn.onclick=()=>setBrand(b);
   el("all-brands").append(btn);
  });

  featured.forEach(b=>{
   const btn=document.createElement("button");
   btn.textContent=b;
   btn.onclick=()=>setBrand(b);
   el("featured").append(btn);
  });

  updateBrandOptions();
  filters();
  render();

  // Cargar las visitas sin bloquear el catálogo.
  await cargarVisitas();
  render();

 }catch(e){
  console.error("Error al cargar el catálogo:",e);
  el("products").textContent=
   "Error al cargar el catálogo. Abre la web desde GitHub Pages.";
 }
}

// BUSCADOR GENERAL
["search","header-search"].forEach(id=>{
 el(id).addEventListener("input",()=>{
  const other=id==="search"
   ?"header-search"
   :"search";

  el(other).value=el(id).value;
  render();
 });
});

// FILTRO DE MARCAS Y ORDEN
["brand","sort"].forEach(id=>{
 el(id).addEventListener("change",render);
});

// BUSCADOR DE MARCAS
el("brand-search").addEventListener(
 "input",
 updateBrandOptions
);

el("brand-search").addEventListener("keydown",e=>{
 if(e.key==="Enter"){
  e.preventDefault();
  buscarMarcaConEnter();
 }
});

// LIMPIAR FILTROS
el("clear").onclick=()=>{
 cat="";
 gender="";
 color="";

 el("search").value="";
 el("header-search").value="";
 el("brand").value="";
 el("brand-search").value="";
 el("sort").value="new";

 updateBrandOptions();
 filters();
 render();
};

// PANEL DE FILTROS
function panel(open){
 el("filter-panel").classList.toggle("open",open);
 el("toggle-filters").setAttribute("aria-expanded",String(open));
}

el("toggle-filters").onclick=()=>{
 panel(!el("filter-panel").classList.contains("open"));
};

el("close-filters").onclick=()=>panel(false);
el("apply-filters").onclick=()=>panel(false);

// ARRANCAR WEB
init();
