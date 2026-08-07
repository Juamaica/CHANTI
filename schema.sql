-- ============================================
-- CHANTI - Esquema de base de datos Supabase
-- ============================================
-- Copia y pega todo este archivo en:
-- Supabase Dashboard > SQL Editor > New query > Run

-- Tabla de productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric(10,2) not null,
  categoria text not null check (categoria in ('chantilli', 'batido', 'combo')),
  imagen_emoji text default '🍧',
  disponible boolean default true,
  orden integer default 0,
  creado_en timestamptz default now()
);

-- Tabla de pedidos
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  cliente_telefono text not null,
  zona_entrega text default 'Warnes - Satélite Norte',
  items jsonb not null,        -- [{producto_id, nombre, precio, cantidad}]
  total numeric(10,2) not null,
  estado text default 'pendiente' check (estado in ('pendiente', 'confirmado', 'entregado', 'cancelado')),
  notas text,
  creado_en timestamptz default now()
);

-- Habilitar Row Level Security
alter table productos enable row level security;
alter table pedidos enable row level security;

-- Cualquiera puede LEER productos disponibles (para el catálogo público)
create policy "Productos visibles para todos"
  on productos for select
  using (true);

-- Cualquiera puede CREAR pedidos (checkout público)
create policy "Cualquiera puede crear pedidos"
  on pedidos for insert
  with check (true);

-- Solo lectura de pedidos propios queda deshabilitada por defecto
-- (para ver pedidos, usa el panel admin con tu usuario de Supabase logueado)
create policy "Pedidos visibles solo autenticado"
  on pedidos for select
  using (auth.role() = 'authenticated');

create policy "Productos editables solo autenticado"
  on productos for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================
-- Productos iniciales de Chanti
-- ============================================
insert into productos (nombre, descripcion, precio, categoria, imagen_emoji, orden) values
  ('Chantillí Clásico', 'Crema batida fresca con gelatina de colores, la receta paceña de siempre.', 5.00, 'chantilli', '🍨', 1),
  ('Chantillí con Chocolate', 'Nuestro clásico con lluvia de chocolate por encima.', 7.00, 'chantilli', '🍫', 2),
  ('Chantillí con Oreo', 'Crema batida con trocitos de galleta Oreo crocante.', 7.00, 'chantilli', '🍪', 3),
  ('Batido Crema-Coca Cola', 'Crema de leche batida con Coca-Cola bien helada.', 6.00, 'batido', '🥤', 4),
  ('Batido Crema-Malta', 'Crema de leche batida con Malta, dulce y espumoso.', 6.00, 'batido', '🧋', 5),
  ('Combo Chanti', 'Un Chantillí clásico + un Batido a elección.', 10.00, 'combo', '🎉', 6)
on conflict do nothing;
