-- ============================================================
-- MÓDULO CLIENTES (CRM Básico) — GKAD STOCK V5
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. CREAR TABLA
CREATE TABLE IF NOT EXISTS public.customers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    document_type       TEXT DEFAULT 'CC',          -- CC, NIT, CE, PAS
    document_number     TEXT,
    email               TEXT,
    phone               TEXT,
    address             TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES para consultas rápidas por org
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_document       ON public.customers(document_number);

-- 3. TRIGGER: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. HABILITAR RLS (Row Level Security)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS — aislamiento estricto por organización
-- Cada inquilino solo ve/modifica sus propios clientes.

-- 5a. SELECT: solo ver clientes de mi organización
CREATE POLICY "customers_select_own_org"
ON public.customers FOR SELECT
USING (
    organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- 5b. INSERT: solo crear clientes en mi organización
CREATE POLICY "customers_insert_own_org"
ON public.customers FOR INSERT
WITH CHECK (
    organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- 5c. UPDATE: solo modificar clientes de mi organización
CREATE POLICY "customers_update_own_org"
ON public.customers FOR UPDATE
USING (
    organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- 5d. DELETE: solo eliminar clientes de mi organización
CREATE POLICY "customers_delete_own_org"
ON public.customers FOR DELETE
USING (
    organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- ============================================================
-- VERIFICACIÓN POST-INSTALACIÓN
-- ============================================================
-- SELECT COUNT(*) FROM public.customers;  -- debe devolver 0
-- SELECT * FROM pg_policies WHERE tablename = 'customers';  -- debe listar 4 políticas
