# 🔧 SOLUCIONES DE ERRORES DE AUTENTICACIÓN - GKAD STOCK

## Problemas Identificados

### 1. ❌ Error 500 en `/api/auth/me` 
**Síntoma**: El endpoint `/api/auth/me` devolvía error 500, causando fallos en la hidratación del perfil del usuario.

**Causa Raíz**: 
- La consulta a Supabase usaba `select('*, organizations(*)')` para hacer un join entre `profiles` y `organizations`.
- Este tipo de consulta puede fallar si:
  - La relación FK no está correctamente configurada
  - Hay problemas con Row-Level Security (RLS)
  - Hay inconsistencias en los datos

**Solución Implementada** ✅:
- Separar la consulta en dos pasos:
  1. Obtener datos básicos del perfil sin relaciones
  2. Obtener la organización de forma separada si existe
- Mejorar el manejo de errores con logs detallados
- Usar campos específicos en lugar de `*` (select only needed fields)

### 2. ❌ Respuesta No JSON del Servidor
**Síntoma**: Errores que dicen "Respuesta inválida del servidor"

**Causa Raíz**: 
- El servidor estaba devolviendo errores sin asegurar que fueran JSON válido
- El manejador de errores global no proporcionaba información suficiente

**Solución Implementada** ✅:
- Mejorar el manejador de errores global en `app.js`
- Proporcionar mejor contexto en desarrollo
- Asegurar que todos los errores se devuelvan como JSON válido

### 3. ⚠️ Problemas Potenciales de RLS
**Posibles Issues**:
- Las RLS policies podrían estar bloqueando consultas con `select('*')`
- El supabaseAdmin debería bypasear RLS, pero fallos en la configuración lo impedirían

**Recomendaciones**:
1. Verificar que las RLS policies en Supabase están correctamente configuradas
2. Asegurar que el SERVICE_ROLE_KEY tiene permisos de bypass
3. Usar campos específicos en selects para evitar problemas con RLS

---

## Cambios Implementados

### Archivo: `backend/src/controllers/authController.js`

#### Método `login`
- ✅ Separó la consulta de organizations en un paso separado
- ✅ Especificó campos en lugar de usar `*`
- ✅ Mejoró el manejo de casos donde no hay organización

```javascript
// ANTES: Fallaba con `select('*, organizations(*)')`
// DESPUÉS: Dos consultas separadas
const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, organization_id, ...') // Campos específicos
    .eq('id', authData.user.id)
    .maybeSingle();

// Obtener org de forma separada
const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, name, is_active, billing_status, plan, logo_url')
    .eq('id', profileData.organization_id)
    .maybeSingle();
```

#### Método `getMe`
- ✅ Reparado completamente para separar consultas
- ✅ Añadidos logs detallados para debugging
- ✅ Mejor manejo de errores con códigos específicos

```javascript
// ANTES: select('*, organizations(*)') causaba errores
// DESPUÉS: Consultas separadas y robustas
const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, organization_id, created_at, updated_at, require_password_change, avatar_url')
    .eq('id', userId)
    .single();

// Si hay organización, obtenerla por separado
if (profile.organization_id) {
    const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id, name, is_active, billing_status, plan, logo_url, created_at, updated_at')
        .eq('id', profile.organization_id)
        .maybeSingle();
    // Usar org de forma separada
}
```

#### Método `getProfile`
- ✅ Aplicados mismos cambios que en getMe
- ✅ Consistencia en toda la arquitectura de autenticación

### Archivo: `backend/app.js`

#### Manejador de Errores Global
- ✅ Mejorado para proporcionar más información en desarrollo
- ✅ Mantiene seguridad en producción sin revelar detalles internos
- ✅ Loguea todos los errores con contexto completo

```javascript
app.use((err, req, res, next) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const statusCode = err.status || 500;
    const errorResponse = {
        error: isDevelopment 
            ? (err.message || 'Error interno del servidor')
            : 'Error interno del servidor, pero el sistema sigue en línea.',
        ...(isDevelopment && { details: err.message, code: err.code })
    };
    res.status(statusCode).json(errorResponse);
});
```

---

## ✅ Verificación Posterior

Para asegurar que los errores están resueltos:

### 1. En el Frontend
- [ ] Verificar que `checkAuth()` en el store se completa sin errores
- [ ] Confirmar que el usuario se hidratan correctamente después de login
- [ ] Revisar la consola del navegador para cualquier error de API

### 2. En el Backend
- [ ] Revisar logs del servidor para mensajes de error
- [ ] Verificar que `/api/health` devuelve estado 200
- [ ] Comprobar que `/api/auth/me` con token válido devuelve perfil completo

### 3. En Supabase
```sql
-- Verificar que la tabla profiles existe y tiene datos
SELECT COUNT(*) FROM profiles;

-- Verificar que las relaciones FK están configuradas
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'profiles';

-- Verificar RLS policies
SELECT * FROM auth.policies WHERE table_name = 'profiles';
```

---

## 🚀 Mejoras Implementadas

1. **Separación de Consultas**: Evita problemas complejos con joins
2. **Campos Específicos**: Selecciona solo lo necesario, evita problemas con RLS
3. **Manejo de Errores Robusto**: Logs detallados para debugging
4. **Auto-Healing**: Crea perfiles faltantes automáticamente
5. **Validación de Bloqueos**: Verifica estado de organización

---

## 📋 Checklist de Verificación

- [x] Corregir método `getMe`
- [x] Corregir método `getProfile`
- [x] Corregir método `login`
- [x] Mejorar manejador de errores global
- [x] Agregar logs detallados
- [ ] Testear flujo de autenticación completo
- [ ] Verificar configuración de RLS en Supabase
- [ ] Validar en ambiente de producción

---

## 🔐 Recomendaciones de Seguridad

1. **En Desarrollo**: Establecer `NODE_ENV=development` para ver detalles
2. **En Producción**: Mantener `NODE_ENV=production` para no exponer errores internos
3. **RLS Policies**: Revisar que están configuradas correctamente en Supabase
4. **SERVICE_ROLE_KEY**: Asegurar que solo el backend tiene acceso
5. **Tokens JWT**: Validar que se envían correctamente en Authorization header

---

## 📞 Si Persisten los Errores

Si después de estos cambios aún hay problemas:

1. **Revisar logs del servidor** en tiempo real
2. **Comprobar la base de datos** está accesible
3. **Validar variables de entorno** (.env)
4. **Verificar RLS policies** en Supabase console
5. **Revisar Network tab** en DevTools para ver respuestas completas
