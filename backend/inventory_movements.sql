-- #################################################################
-- inventory_movements.sql
-- GKAD STOCK - Trazabilidad Inbound (Kardex Básico)
-- OBJETIVO: Registrar cada ingreso de mercancía con persistencia de contexto.
-- #################################################################

-- 1. CREACIÓN DE TABLA DE MOVIMIENTOS
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL, -- Audit Forever (Captura estática del nombre al momento del ingreso)
    quantity_added NUMERIC(12,3) NOT NULL CHECK (quantity_added > 0),
    movement_type TEXT NOT NULL DEFAULT 'IN' CHECK (movement_type IN ('IN', 'OUT', 'ADJUST')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. POLÍTICAS DE SEGURIDAD RLS (AISLAMIENTO SAAS)
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 2.1 Política de Aislamiento Corporativo
CREATE POLICY "Corp_Isolation_Movements" ON public.inventory_movements 
FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 3. ÍNDICES DE RENDIMIENTO (Optimización para filtros por fecha)
CREATE INDEX IF NOT EXISTS idx_movements_org_date ON public.inventory_movements(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_product ON public.inventory_movements(product_id);

-- NOTA: Este script debe ser ejecutado en el Editor SQL de Supabase antes de probar la integración.
