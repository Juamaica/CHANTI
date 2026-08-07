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
  if (SUPABASE_URL.startsWith("http")) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("Supabase no configurado todavía:", e);
}

// Productos de respaldo por si Supabase aún no está conectado
const FALLBACK_PRODUCTS = [
  { id: "1", nombre: "Chantillí Clásico", descripcion: "Crema batida fresca con gelatina de colores, la receta paceña de siempre.", precio: 5, categoria: "chantilli", imagen_emoji: "🍨" },
  { id: "2", nombre: "Chantillí con Chocolate", descripcion: "Nuestro clásico con lluvia de chocolate por encima.", precio: 7, categoria: "chantilli", imagen_emoji: "🍫" },
  { id: "3", nombre: "Chantillí con Oreo", descripcion: "Crema batida con trocitos de galleta Oreo crocante.", precio: 7, categoria: "chantilli", imagen_emoji: "🍪" },
  { id: "4", nombre: "Batido Crema-Coca Cola", descripcion: "Crema de leche batida con Coca-Cola bien helada.", precio: 6, categoria: "batido", imagen_emoji: "🥤" },
  { id: "5", nombre: "Batido Crema-Malta", descripcion: "Crema de leche batida con Malta, dulce y espumoso.", precio: 6, categoria: "batido", imagen_emoji: "🧋" },
  { id: "6", nombre: "Combo Chanti", descripcion: "Un Chantillí clásico + un Batido a elección.", precio: 10, categoria: "combo", imagen_emoji: "🎉" },
];

let products = [];
let cart = {}; // { productId: { ...product, qty } }
let currentFilter = "todos";

// ---------- Cargar productos ----------
async function loadProducts() {
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

  grid.innerHTML = list.map(p => {
    const qty = cart[p.id]?.qty || 0;
    return `
    <div class="card">
      <div class="card-media">${p.imagen_emoji || "🍧"}</div>
      <div class="card-body">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion || ""}</p>
        <div class="card-footer">
          <span class="price">Bs ${Number(p.precio).toFixed(0)}</span>
          <div class="qty-row">
            <button class="qty-btn" onclick="changeQty('${p.id}', -1)">−</button>
            <span class="qty-num" id="qty-${p.id}">${qty}</span>
            <button class="qty-btn" onclick="changeQty('${p.id}', 1)">+</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
}

function changeQty(id, delta) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const current = cart[id]?.qty || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) {
    delete cart[id];
  } else {
    cart[id] = { ...product, qty: next };
  }
  const el = document.getElementById(`qty-${id}`);
  if (el) el.textContent = next;
  updateCartBar();
}

function updateCartBar() {
  const items = Object.values(cart);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * Number(i.precio), 0);
  document.getElementById("cartCount").textContent = count;
  document.getElementById("cartTotal").textContent = `Bs ${total.toFixed(0)}`;
  document.getElementById("cartBar").classList.toggle("show", count > 0);
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
  renderModalSummary();
  modalOverlay.classList.add("show");
});
document.getElementById("closeModal").addEventListener("click", () => modalOverlay.classList.remove("show"));
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove("show"); });

function renderModalSummary() {
  const items = Object.values(cart);
  const total = items.reduce((s, i) => s + i.qty * Number(i.precio), 0);
  const rows = items.map(i => `
    <div class="modal-summary-row"><span>${i.qty}x ${i.nombre}</span><span>Bs ${(i.qty * i.precio).toFixed(0)}</span></div>
  `).join("");
  document.getElementById("modalSummary").innerHTML = rows + `
    <div class="modal-summary-row total"><span>Total</span><span>Bs ${total.toFixed(0)}</span></div>`;
}

// ---------- Enviar pedido ----------
document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const notas = document.getElementById("notas").value.trim();
  const items = Object.values(cart);
  const total = items.reduce((s, i) => s + i.qty * Number(i.precio), 0);

  if (!items.length) return;

  // Guardar pedido en Supabase (si está conectado)
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

  // Armar mensaje de WhatsApp
  const lineas = items.map(i => `• ${i.qty}x ${i.nombre} — Bs ${(i.qty * i.precio).toFixed(0)}`).join("%0A");
  const mensaje =
    `Hola Chanti! 👋 Quiero hacer este pedido:%0A%0A${lineas}%0A%0A` +
    `*Total: Bs ${total.toFixed(0)}*%0A%0A` +
    `Nombre: ${nombre}%0ATeléfono: ${telefono}%0AZona: Warnes - Satélite Norte` +
    (notas ? `%0ANotas: ${notas}` : "");

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`, "_blank");

  cart = {};
  updateCartBar();
  renderProducts();
  modalOverlay.classList.remove("show");
  showToast("¡Pedido enviado! Revisá WhatsApp para confirmar.");
});

// ---------- Toast ----------
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

// ---------- Estado abierto/cerrado (martes y jueves, 1pm-8pm hora Bolivia) ----------
function updateStatus() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }));
  const day = now.getDay(); // 2 = martes, 4 = jueves
  const hour = now.getHours() + now.getMinutes() / 60;
  const isOpenDay = day === 2 || day === 4;
  const isOpenHour = hour >= 13 && hour < 20;
  const isOpen = isOpenDay && isOpenHour;

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
