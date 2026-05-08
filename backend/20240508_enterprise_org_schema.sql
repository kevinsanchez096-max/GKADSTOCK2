-- ==========================================
-- MIGRACIÓN: GKAD STOCK V5.0 ENTERPRISE
-- OBJETIVO: Unificación de Datos Corporativos
-- ==========================================

-- 1. EXTENSIÓN DE COLUMNAS NORMALIZADAS
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS corporate_email TEXT,
ADD COLUMN IF NOT EXISTS legal_representative TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS primary_address TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 19.00,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'COP',
ADD COLUMN IF NOT EXISTS billing_resolution TEXT,
ADD COLUMN IF NOT EXISTS footer_message TEXT,
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS theme_secondary_color TEXT DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS theme_style TEXT DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. MIGRACIÓN DE DATOS EXISTENTES (Preservar integridad)
UPDATE organizations 
SET 
    company_name = COALESCE(name, 'Nueva Empresa'),
    primary_address = address,
    phone_number = phone,
    corporate_email = slug || '@gkad.com' -- Fallback lógico si no existe
WHERE company_name IS NULL;

-- 3. INDEXACIÓN PARA ESCALABILIDAD SaaS
CREATE INDEX IF NOT EXISTS idx_org_tax_id ON organizations(tax_id);
CREATE INDEX IF NOT EXISTS idx_org_corporate_email ON organizations(corporate_email);
CREATE INDEX IF NOT EXISTS idx_org_id ON organizations(id);

-- 4. TRIGGER DE AUDITORÍA AUTOMÁTICA
CREATE OR REPLACE FUNCTION update_org_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_org_timestamp ON organizations;
CREATE TRIGGER trigger_update_org_timestamp
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_org_timestamp();

-- 5. POLÍTICAS DE SEGURIDAD RLS (Recordatorio: Se asume que existen, pero se refuerzan)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver su propia organización
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (id IN (
    SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
));

-- Los administradores solo pueden actualizar su propia organización
DROP POLICY IF EXISTS "Admins can update their own organization" ON organizations;
CREATE POLICY "Admins can update their own organization"
ON organizations FOR UPDATE
USING (id IN (
    SELECT organization_id FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
));
