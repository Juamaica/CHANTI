// ============================================
// CHANTI - Configuración de Supabase
// ============================================
// 1. Andá a tu proyecto en supabase.com > Settings > API
// 2. Copiá "Project URL" y "anon public key" acá abajo
const SUPABASE_URL = "TU_SUPABASE_URL_AQUI";
const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY_AQUI";

const WHATSAPP_NUMBER = "59173148844"; // 591 + tu número, sin espacios ni +

let supabase = null;
try {
  if (SUPABASE_URL.startsWith("http") && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("Supabase no configurado todavía:", e);
  supabase = null;
}

// Productos de respaldo (se usan si Supabase no está conectado aún)
const FALLBACK_PRODUCTS = [
  { id: "1", nombre: "Chantillí Clásico", descripcion: "Crema batida fresca con gelatina de colores, la receta paceña de siempre.", precio: 5, categoria: "chantilli", imagen_url: "https://images.unsplash.com/photo-1646388022965-2bfa12635f01?auto=format&fit=crop&w=500&q=80" },
  { id: "2", nombre: "Chantillí con Chocolate", descripcion: "Nuestro clásico con lluvia de chocolate por encima.", precio: 7, categoria: "chantilli", imagen_url: "https://images.unsplash.com/photo-1545396635-c83eba7be00f?auto=format&fit=crop&w=500&q=80" },
  { id: "3", nombre: "Chantillí con Oreo", descripcion: "Crema batida con trocitos de galleta Oreo crocante.", precio: 7, categoria: "chantilli", imagen_url: "https://images.unsplash.com/photo-1623728720458-8c2f5a9dc13c?auto=format&fit=crop&w=500&q=80" },
  { id: "4", nombre: "Batido Crema-Coca Cola", descripcion: "Crema de leche batida con Coca-Cola bien helada.", precio: 6, categoria: "batido", imagen_url: "https://images.unsplash.com/photo-1574706226623-e5cc0da928c6?auto=format&fit=crop&w=500&q=80" },
  { id: "5", nombre: "Batido Crema-Malta", descripcion: "Crema de leche batida con Malta, dulce y espumoso.", precio: 6, categoria: "batido", imagen_url: "https://images.unsplash.com/photo-1583024012457-b6de05b7003a?auto=format&fit=crop&w=500&q=80" },
  { id: "6", nombre: "Combo Chanti", descripcion: "Un Chantillí clásico + un Batido a elección.", precio: 10, categoria: "combo", imagen_url: "https://images.unsplash.com/photo-1646388022965-2bfa12635f01?auto=format&fit=crop&w=500&q=80" },
];

let products = [];
let cart = {}; // { productId: { ...product, qty } }
let currentFilter = "todos";

// ---------- Cargar productos (SIEMPRE termina en fallback si algo falla) ----------
async function loadProducts() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("disponible", true)
        .order("orden", { ascending: true });
      if (!error && data && data.length) {
        products = data;
        renderProducts();
        return;
      }
    }
  } catch (e) {
    console.warn("No se pudo cargar desde Supabase, usando catálogo local:", e);
  }
  products = FALLBACK_PRODUCTS;
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const list = currentFilter === "todos" ? products : products.filter(p => p.categoria === currentFilter);

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">No hay productos en esta categoría todavía.</div>`;
    return;
  }

  grid.innerHTML = list.map(p => `
    <div class="card">
      <div class="card-media"><img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy"></div>
      <div class="card-body">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion || ""}</p>
        <div class="card-footer">
          <span class="price">Bs ${Number(p.precio).toFixed(0)}</span>
          <button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.7 14.2c-.2.6-1.4 1.2-1.9 1.3-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1-2.5.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.6.8 1.9.8 2 .1.2.1.4 0 .6-.1.2-.1.3-.3.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.2.5.1.6-.1l1-1.1c.2-.3.4-.2.7-.1l1.8.9c.2.1.4.2.5.3.1.2.1.9-.1 1.5Z"/></svg>
            Pedir ahora
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

function addToCart(id) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return;
  const current = cart[id]?.qty || 0;
  cart[id] = { ...product, qty: current + 1 };
  updateCartUI();
  showToast(`${product.nombre} agregado`);
  openCart();
}

function changeQty(id, delta) {
  const current = cart[id]?.qty || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) {
    delete cart[id];
  } else {
    cart[id].qty = next;
  }
  updateCartUI();
}

// ---------- Carrito lateral ----------
const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");

function openCart() {
  cartPanel.classList.add("show");
  cartOverlay.classList.add("show");
}
function closeCart() {
  cartPanel.classList.remove("show");
  cartOverlay.classList.remove("show");
}
document.getElementById("cartToggle").addEventListener("click", openCart);
document.getElementById("cartClose").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

function updateCartUI() {
  const items = Object.entries(cart);
  const count = items.reduce((s, [, i]) => s + i.qty, 0);
  const total = items.reduce((s, [, i]) => s + i.qty * Number(i.precio), 0);

  const badge = document.getElementById("cartBadge");
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";

  const itemsEl = document.getElementById("cartItems");
  const footEl = document.getElementById("cartFoot");

  if (!items.length) {
    itemsEl.innerHTML = `<div class="cart-empty">Todavía no agregaste nada 🍨</div>`;
    footEl.style.display = "none";
    return;
  }

  itemsEl.innerHTML = items.map(([id, i]) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <b>${i.nombre}</b>
        <span>Bs ${i.precio} c/u</span>
      </div>
      <div class="qty-row">
        <button class="qty-btn" onclick="changeQty('${id}', -1)">−</button>
        <span class="qty-num">${i.qty}</span>
        <button class="qty-btn" onclick="changeQty('${id}', 1)">+</button>
      </div>
    </div>
  `).join("");

  footEl.style.display = "block";
  document.getElementById("cartTotal").textContent = `Bs ${total.toFixed(0)}`;
}

// ---------- Filtros ----------
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderProducts();
  });
});

// ---------- Modal de checkout ----------
const modalOverlay = document.getElementById("modalOverlay");

document.getElementById("openCheckout").addEventListener("click", () => {
  if (!Object.keys(cart).length) return;
  modalOverlay.classList.add("show");
});
document.getElementById("closeModal").addEventListener("click", () => modalOverlay.classList.remove("show"));
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove("show"); });

// ---------- Enviar pedido ----------
document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const notas = document.getElementById("notas").value.trim();
  const items = Object.values(cart);
  const total = items.reduce((s, i) => s + i.qty * Number(i.precio), 0);

  if (!items.length) return;

  // Guardar pedido en Supabase (si está conectado) — nunca bloquea el flujo si falla
  if (supabase) {
    try {
      await supabase.from("pedidos").insert({
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        zona_entrega: "Warnes - Satélite Norte",
        items: items.map(i => ({ producto_id: i.id, nombre: i.nombre, precio: i.precio, cantidad: i.qty })),
        total,
        notas,
      });
    } catch (err) {
      console.warn("No se pudo guardar el pedido en Supabase:", err);
    }
  }

  const lineas = items.map(i => `• ${i.qty}x ${i.nombre} — Bs ${(i.qty * i.precio).toFixed(0)}`).join("%0A");
  const mensaje =
    `Hola Chanti! 👋 Quiero hacer este pedido:%0A%0A${lineas}%0A%0A` +
    `*Total: Bs ${total.toFixed(0)}*%0A%0A` +
    `Nombre: ${nombre}%0ATeléfono: ${telefono}%0AZona: Warnes - Satélite Norte` +
    (notas ? `%0ANotas: ${notas}` : "");

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`, "_blank");

  cart = {};
  updateCartUI();
  modalOverlay.classList.remove("show");
  closeCart();
  showToast("¡Pedido enviado! Revisá WhatsApp para confirmar.");
});

// ---------- Toast ----------
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

// ---------- Estado abierto/cerrado (martes y jueves, 1pm-8pm hora Bolivia) ----------
function updateStatus() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }));
  const day = now.getDay(); // 2 = martes, 4 = jueves
  const hour = now.getHours() + now.getMinutes() / 60;
  const isOpen = (day === 2 || day === 4) && hour >= 13 && hour < 20;

  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  dot.classList.toggle("open", isOpen);
  dot.classList.toggle("closed", !isOpen);
  text.textContent = isOpen ? "Abierto ahora" : "Cerrado — abrimos Mar y Jue, 1-8pm";
}

// ---------- Init ----------
loadProducts();
updateStatus();
setInterval(updateStatus, 60000);
