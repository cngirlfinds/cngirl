
const root = document.getElementById("detail-root");

const imgPath = v => String(v || "").replace(/^\/assets\//, "assets/");
const asGallery = g => Array.isArray(g) ? g.filter(Boolean) : typeof g === "string" && g ? [g] : [];
const text = (tag, value, cls) => {
  const e = document.createElement(tag);
  e.textContent = value || "";
  if (cls) e.className = cls;
  return e;
};

// Estadísticas de CN Girl
const STATS_URL = "https://vrydz hkdofhmgkjpwywu.supabase.co/functions/v1/registrar-visita".replace("vrydz h", "vrydz h".replace(" ", ""));

function getVisitorId() {
  const key = "cngirl_visitor_id";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function registrarEvento(productId, eventType) {
  fetch(STATS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      product_id: String(productId),
      event_type: eventType,
      visitor_id: getVisitorId()
    }),
    keepalive: true
  }).catch(error => console.warn("Estadísticas:", error));
}

async function init() {
  try {
    const r = await fetch("data/products.json", { cache: "no-store" });
    if (!r.ok) throw Error("No se pudo cargar el catálogo");

    const raw = await r.json();
    const items = Array.isArray(raw) ? raw : [raw];
    const id = Number(new URLSearchParams(location.search).get("id"));
    const p = items[id];

    if (!Number.isInteger(id) || !p) {
      root.replaceChildren(text("p", "No encontramos este producto."));
      return;
    }

    document.title = (p.name || "Producto") + " — CNgirl";

    const grid = document.createElement("div");
    grid.className = "detail-grid";

    const left = document.createElement("div");
    const right = document.createElement("div");
    right.className = "detail-info";

    const main = document.createElement("img");
    main.className = "detail-main";
    main.alt = p.name || "Producto";
    main.src = imgPath(p.image);
    left.append(main);

    // Pages CMS almacena las fotos de compradores en buyerPhotos.
    const gallery = asGallery(p.buyerPhotos ?? p.gallery);
    const photos = [p.image, ...gallery].filter(Boolean);

    if (photos.length > 1) {
      const thumbs = document.createElement("div");
      thumbs.className = "thumbs";

      photos.forEach((path, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", i === 0 ? "Ver imagen principal" : "Ver foto real " + i);

        const im = document.createElement("img");
        im.src = imgPath(path);
        im.alt = i === 0 ? "Imagen principal" : "Foto real de comprador " + i;

        b.append(im);
        b.onclick = () => {
          main.src = imgPath(path);
          main.alt = im.alt;
        };
        thumbs.append(b);
      });

      left.append(thumbs);
    }

    right.append(
      text("div", p.brand, "detail-brand"),
      text("h1", p.name),
      text("div", Number(p.price || 0).toLocaleString("es-ES", {
        style: "currency",
        currency: "EUR"
      }), "detail-price")
    );

    right.append(text("h2", "Fotos reales de compradores", "real-title"));

    if (gallery.length) {
      right.append(text("p", "Fotografías aportadas por compradores. La apariencia puede variar según el vendedor y el pedido.", "real-note"));
      right.append(text("p", "Pulsa las miniaturas para ampliar las fotografías.", "photo-tag"));
    } else {
      right.append(text("p", "Todavía no hay fotos reales de compradores para este producto.", "empty-gallery"));
    }

    if (/^https?:\/\//.test(p.url || "")) {
      const a = document.createElement("a");
      a.href = p.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer sponsored";
      a.className = "buy";
      a.textContent = "VER PRODUCTO EN LA TIENDA ↗";

      a.addEventListener("click", () => registrarEvento(id, "click"));

      right.append(a);
    }

    grid.append(left, right);
    root.replaceChildren(grid);

    // Registrar la visita cuando la ficha se ha cargado.
    registrarEvento(id, "view");

  } catch (e) {
    console.error(e);
    root.replaceChildren(text("p", "No se ha podido cargar la ficha. Inténtalo de nuevo."));
  }
}

init();
