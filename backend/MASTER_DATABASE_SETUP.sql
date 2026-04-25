-- #################################################################
-- MASTER_DATABASE_SETUP.sql
-- PROYECTO: GKAD STOCK - SaaS Multi-Tenant Professional
-- OBJETIVO: Sincronización de Identidad, Seguridad y Operación
-- #################################################################

-- 1. EXTENSIONES (Habilitación de UUID y Utilidades)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS DE DATOS (Enums de Rol de Usuario)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'vendedor', 'cashier', 'seller');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- #################################################################
-- SECCIÓN 2: ESTRUCTURA DE TABLAS (ORDEN JERÁRQUICO)
-- #################################################################

-- Table: Organizations (Inquilinos/Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    tax_id TEXT, -- NIT/RUT
    plan TEXT DEFAULT 'Starter', -- Starter, Professional, Enterprise
    health_status TEXT DEFAULT 'Saludable',
    is_active BOOLEAN DEFAULT true,
    billing_status TEXT DEFAULT 'activo' CHECK (billing_status IN ('activo', 'suspendido')),
    next_billing_date DATE DEFAULT (CURRENT_DATE + interval '30 days'),
    license_price DECIMAL(12,2) DEFAULT 50000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: Profiles (Extensión de Auth.Users con Aislamiento SaaS)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'vendedor',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    theme_color TEXT DEFAULT '#3b82f6',
    created_by UUID REFERENCES profiles(id),
    require_password_change BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table: Categories (Clasificación Multi-Tenant)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: Products (Inventario Global Blindado)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'unid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: Sales (Cabecera de Facturación Atómica)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    amount_received DECIMAL(12,2),
    change_given DECIMAL(12,2),
    billing_resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: Sale Items (Detalle con Inyección de Org para RLS)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);

-- Table: Expenses (Egresos Corporativos)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Servicios', 'Mercancía', 'Nómina', 'Otros')),
    amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: System Logs (Consola de Auditoría y Telemetría)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    level TEXT CHECK (level IN ('info', 'warning', 'error', 'critical')) DEFAULT 'info',
    module TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- #################################################################
-- SECCIÓN 3: LOGICA DE NEGOCIO Y FUNCIONES POS
-- #################################################################

-- Motor de Extracción de Organización (Visión Multitenant)
CREATE OR REPLACE FUNCTION get_user_org()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RPC: Proceso de Venta Atómica (Garantiza integridad total)
CREATE OR REPLACE FUNCTION process_sale_transaction(
    p_organization_id UUID,
    p_user_id UUID,
    p_total DECIMAL,
    p_subtotal DECIMAL,
    p_tax DECIMAL,
    p_payment_method TEXT,
    p_amount_received DECIMAL,
    p_change_given DECIMAL,
    p_items JSONB
)
RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
BEGIN
    INSERT INTO public.sales (
        organization_id, user_id, total, subtotal, tax, 
        payment_method, amount_received, change_given
    ) VALUES (
        p_organization_id, p_user_id, p_total, p_subtotal, p_tax, 
        p_payment_method, p_amount_received, p_change_given
    ) RETURNING id INTO v_sale_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, price DECIMAL, subtotal DECIMAL)
    LOOP
        INSERT INTO public.sale_items (
            sale_id, organization_id, product_id, quantity, price, subtotal
        ) VALUES (
            v_sale_id, p_organization_id, v_item.product_id, v_item.quantity, v_item.price, v_item.subtotal
        );
    END LOOP;

    RETURN v_sale_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fallo en Transacción POS: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- #################################################################
-- SECCIÓN 4: TRIGGERS DE INVENTARIO (BLINDAJE SAAS)
-- #################################################################

CREATE OR REPLACE FUNCTION trigger_reduce_stock_after_item_sale()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT stock INTO current_stock FROM public.products 
    WHERE id = NEW.product_id AND organization_id = NEW.organization_id FOR UPDATE;

    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Producto no pertenece a la organización operadora.';
    END IF;

    IF current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Stock insuficiente para la transacción.';
    END IF;

    UPDATE public.products SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id AND organization_id = NEW.organization_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_after_sale_item_insert ON sale_items;
CREATE TRIGGER tr_after_sale_item_insert
AFTER INSERT ON sale_items
FOR EACH ROW EXECUTE FUNCTION trigger_reduce_stock_after_item_sale();

-- #################################################################
-- SECCIÓN 5: SEGURIDAD RLS (AISLAMIENTO CORPORATIVO)
-- #################################################################

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso Corporativo Unificadas
CREATE POLICY "Corp_Isolation_Organizations" ON organizations FOR SELECT USING (id = get_user_org());
CREATE POLICY "Corp_Isolation_Profiles" ON profiles FOR ALL USING (organization_id = get_user_org() OR role = 'super_admin');
CREATE POLICY "Corp_Isolation_Categories" ON categories FOR ALL USING (organization_id = get_user_org());
CREATE POLICY "Corp_Isolation_Products" ON products FOR ALL USING (organization_id = get_user_org());
CREATE POLICY "Corp_Isolation_Sales" ON sales FOR ALL USING (organization_id = get_user_org());
CREATE POLICY "Corp_Isolation_SaleDetails" ON sale_items FOR ALL USING (organization_id = get_user_org());
CREATE POLICY "Corp_Isolation_Expenses" ON expenses FOR ALL USING (organization_id = get_user_org());

-- #################################################################
-- FINAL: LEGALIZACIÓN DE INVENTARIO HUÉRFANO (Opcional)
-- #################################################################

-- UPDATE categories SET organization_id = 'f6dddc08-47e4-4778-804b-4592839f9a2a' WHERE organization_id IS NULL;
-- UPDATE products SET organization_id = 'f6dddc08-47e4-4778-804b-4592839f9a2a' WHERE organization_id IS NULL;

-- #################################################################
-- SECCIÓN 6: CONSOLIDACIÓN DE FACTURACIÓN (MIGRACIONES V1 & V2)
-- #################################################################

-- 1. Asegurar columnas comerciales en organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'activo' CHECK (billing_status IN ('activo', 'suspendido'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS next_billing_date DATE DEFAULT (CURRENT_DATE + interval '30 days');
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS license_price DECIMAL(12,2) DEFAULT 50000;

-- 2. Esquema de Precios y Planes V2 (GKAD STOCK 2026)
UPDATE organizations SET plan = 'Esencial', license_price = 39000 WHERE plan = 'Starter' OR plan = 'Esencial';
UPDATE organizations SET plan = 'Avanzado', license_price = 65000 WHERE plan = 'Professional' OR plan = 'Avanzado';
UPDATE organizations SET plan = 'Premium', license_price = 145000 WHERE plan = 'Enterprise' OR plan = 'Premium';
UPDATE organizations SET plan = 'Esencial', license_price = 39000 WHERE plan IS NULL OR plan = '';

-- #################################################################
-- SECCIÓN 7: RETAIL HARDWARE SUPPORT (SCALES & SCANNERS)
-- #################################################################

-- 1. Soporte Decimal para Inventario (Básculas Ready)
ALTER TABLE public.products 
  ALTER COLUMN stock TYPE NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS is_weighted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;

-- 2. Soporte Decimal para Ventas
ALTER TABLE public.sale_items 
  ALTER COLUMN quantity TYPE NUMERIC(12,3);

-- 3. ACTUALIZACIÓN DEL MOTOR DE TRANSACCIÓN POS (REDEFINE PARA DECIMALES)
CREATE OR REPLACE FUNCTION process_sale_transaction(
    p_organization_id UUID,
    p_user_id UUID,
    p_total DECIMAL,
    p_subtotal DECIMAL,
    p_tax DECIMAL,
    p_payment_method TEXT,
    p_amount_received DECIMAL,
    p_change_given DECIMAL,
    p_items JSONB
)
RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
BEGIN
    INSERT INTO public.sales (
        organization_id, user_id, total, subtotal, tax, 
        payment_method, amount_received, change_given
    ) VALUES (
        p_organization_id, p_user_id, p_total, p_subtotal, p_tax, 
        p_payment_method, p_amount_received, p_change_given
    ) RETURNING id INTO v_sale_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, price DECIMAL, subtotal DECIMAL)
    LOOP
        INSERT INTO public.sale_items (
            sale_id, organization_id, product_id, quantity, price, subtotal
        ) VALUES (
            v_sale_id, p_organization_id, v_item.product_id, v_item.quantity, v_item.price, v_item.subtotal
        );
    END LOOP;

    RETURN v_sale_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fallo en Transacción POS Decimal: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ACTUALIZACIÓN DEL TRIGGER DE STOCK (DEPRECADO POR DECIMAL SAFE)
CREATE OR REPLACE FUNCTION trigger_reduce_stock_after_item_sale()
RETURNS TRIGGER AS $$
DECLARE
    current_stock NUMERIC;
BEGIN
    SELECT stock INTO current_stock FROM public.products 
    WHERE id = NEW.product_id AND organization_id = NEW.organization_id FOR UPDATE;

    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Producto no corporativo.';
    END IF;

    IF current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Stock insuficiente (Requerido: %, Disponible: %)', NEW.quantity, current_stock;
    END IF;

    UPDATE public.products SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id AND organization_id = NEW.organization_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
