-- SCRIPT DE COMUNICACIONES SAAS (GKAD STOCK)
-- Ejecutar en el editor SQL de Supabase

-- 1. Tabla de Mensajes Globales (Broadcast)
CREATE TABLE IF NOT EXISTS public.saas_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id),
    recipient_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'plan_premium', etc.
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS para saas_messages
ALTER TABLE public.saas_messages ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (Solo Super Admin puede ver y crear)
CREATE POLICY "Super Admins can manage saas_messages" ON public.saas_messages
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- 4. Notificaciones de Registro en system_logs (Asegurar columnas)
-- Si ya existe la tabla system_logs, nos aseguramos de que acepte los nuevos eventos
-- NUEVO_REGISTRO y CUENTA_ACTIVADA ya se están enviando desde authController.js

COMMENT ON TABLE public.saas_messages IS 'Almacena el historial de comunicados enviados por el Super Admin a nivel global.';
