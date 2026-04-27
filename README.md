# GKAD STOCK — Sistema POS & Inventario Multi-Tenant (V5.0 Enterprise)

Sistema de Punto de Venta (POS), Gestión de Inventarios y Administración SaaS Multi-Tenant, diseñado con arquitectura desacoplada **MVC** para máxima escalabilidad, seguridad y resiliencia operativa.

---

## 📐 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  Zustand Stores ─── Components ─── Supabase Realtime    │
│         │                │                               │
│    useAuthStore     POSTerminal                          │
│    useShopStore     Inventory                            │
│                     SalesHistory                         │
│                     Dashboard                            │
└────────────────────────┬────────────────────────────────┘
                         │  HTTP / REST API
┌────────────────────────┴────────────────────────────────┐
│                    BACKEND (Node.js)                     │
│  app.js ─── Routes ─── Controllers ─── Middleware       │
│                              │                           │
│                         Supabase SDK                     │
│                    (PostgreSQL + Auth + RLS)             │
└─────────────────────────────────────────────────────────┘
```

---

## 🛡️ Stack Tecnológico

| Capa              | Tecnología                   | Propósito                                               |
| :---------------- | :--------------------------- | :------------------------------------------------------ |
| **Frontend**      | React 19, TypeScript, Vite 8 | Interfaz reactiva de alto rendimiento                   |
| **Estado**        | Zustand 5                    | Gestión de estado global (Sesión, Carrito, Catálogo)    |
| **Estilos**       | TailwindCSS 4, Framer Motion | Diseño premium "Luxury Dark" con Glassmorphism          |
| **Backend**       | Node.js, Express 4           | API RESTful con arquitectura MVC                        |
| **Seguridad**     | Helmet, JWT, RLS, OTP        | Verificación en 2 pasos, tokens y aislamiento de datos  |
| **Base de Datos** | Supabase (PostgreSQL)        | Persistencia, Auth, Storage y Realtime (WebSockets)     |
| **Gráficos**      | Recharts 3                   | Visualización de KPIs y métricas financieras            |
| **Reportes**      | xlsx.js                      | Importación/Exportación masiva de inventarios vía Excel |

---

## 📁 Estructura del Proyecto

```
PRUEBA INVENTARIO/
├── backend/
│   ├── app.js                          # Núcleo Express + Centinelas Anti-Caídas
│   ├── server.js                       # Listener HTTP (Puerto 4000)
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js             # Cliente Supabase (Anon + Service Role)
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js        # Validación JWT + Auto-Curación de perfiles
│   │   │   ├── isSuperAdmin.js          # Guardia de privilegios SaaS
│   │   │   └── superHardenedMiddleware.js  # Rate Limiting Anti-DDoS
│   │   ├── controllers/
│   │   │   ├── authController.js        # Login, Registro OTP, Activación de Org
│   │   │   ├── salesController.js       # Facturación Atómica con Rollback
│   │   │   ├── inventoryController.js   # CRUD de Productos + Kardex Automatizado
│   │   │   ├── superAdminController.js  # Provisión de Inquilinos, Métricas SaaS
│   │   │   ├── usersController.js       # Gestión de Personal por Organización
│   │   │   ├── customersController.js   # CRM de Clientes
│   │   │   ├── suppliersController.js   # Gestión de Proveedores
│   │   │   ├── expenseController.js     # Registro de Egresos Operacionales
│   │   │   └── dashboardController.js   # Agregación de KPIs
│   │   └── routes/
│   │       ├── auth.js                  # /api/auth/*
│   │       ├── sales.js                 # /api/sales/*
│   │       ├── inventory.js             # /api/inventory/*
│   │       ├── superAdmin.js            # /api/saas/*
│   │       ├── users.js                 # /api/users/*
│   │       ├── customers.js             # /api/customers/*
│   │       ├── suppliers.js             # /api/suppliers/*
│   │       ├── expenses.js              # /api/expenses/*
│   │       └── dashboard.js             # /api/dashboard/*
│   └── .env                             # Secretos (SUPABASE_URL, SERVICE_ROLE_KEY)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # Orquestador de hidratación y rutas protegidas
│   │   ├── main.tsx                     # Punto de entrada React
│   │   ├── store/
│   │   │   ├── useAuthStore.ts          # Sesión, Verificación OTP, isInitialized
│   │   │   └── useShopStore.ts          # Carrito Global, Catálogo, Historial
│   │   ├── lib/
│   │   │   ├── api.ts                   # Cliente HTTP con interceptor de token
│   │   │   └── supabase.ts              # Cliente Supabase para Realtime
│   │   └── components/
│   │       ├── AuthForm.tsx             # Autenticación OTP (Registro) / Password (Login)
│   │       ├── POSTerminal.tsx          # Terminal de Ventas (Escáner, Báscula)
│   │       ├── Inventory.tsx            # Gestión de Stock + Kardex
│   │       ├── SalesHistory.tsx         # Historial con Realtime + Rentabilidad
│   │       ├── Dashboard.tsx            # Panel de KPIs Financieros
│   │       ├── DashboardLayout.tsx      # Layout "Apple Design" (Sidebar + Header)
│   │       ├── AdminWelcome.tsx         # Pantalla de Bienvenida Minimalista SaaS
│   │       ├── Settings.tsx             # Configuración de Empresa (Perfil Corporativo)
│   │       ├── Users.tsx                # Gestión de Colaboradores
│   │       ├── Customers.tsx            # Base de Datos de Clientes
│   │       ├── Suppliers.tsx            # Gestión de Proveedores
│   │       ├── Expenses.tsx             # Control de Egresos
│   │       ├── CategoryManager.tsx      # Taxonomía de Productos
│   │       ├── BulkImport.tsx           # Carga Masiva vía Excel
│   │       ├── PrintableTicket.tsx      # Generador de Recibos Térmicos (80mm)
│   │       ├── ReturnSaleModal.tsx      # Módulo de Devoluciones
│   │       ├── ProfileSettingsModal.tsx # Ajustes Personales de Cuenta
│   │       ├── SuperAdminDashboard.tsx  # Consola SaaS (Métricas Dinámicas, MRR)
│   │       ├── PlatformOrganizations.tsx# Matriz de Inquilinos y Suscripciones
│   │       ├── SaaSCreateOrgModal.tsx   # Provisión de Nuevas Empresas
│   │       ├── SaaSOrgRow.tsx           # Ficha de Organización (Perfil Corporativo Expandible)
│   │       ├── GlobalPlatformSettings.tsx # Configuración Global del SaaS
│   │       ├── GlobalUserAudit.tsx      # Auditoría Forense de Actividad
│   │       ├── ui-components.tsx        # Librería de Componentes Premium (Glassmorphism)
│   │       └── common/
│   │           └── PlanGuard.tsx         # Guardia de Límites por Plan
│   └── vite.config.ts
│
└── AUDITORIA_TECNICA_DEFINITIVA.md      # Documentación técnica para sustentación
```

---

## ✨ Funcionalidades Implementadas

### 🏪 Módulo POS (Punto de Venta)

- Terminal interactiva con búsqueda por nombre, SKU y código de barras.
- **Escáner de Barras** integrado (listener global de teclado).
- Soporte para productos **pesados** (integración con báscula, cantidades decimales en kg).
- Cálculo automático de subtotal, impuestos (IVA configurable) y devuelta.
- Métodos de pago: Efectivo, Tarjeta, Transferencia, Nequi.
- Carrito global persistente (no se pierde al navegar entre módulos).
- Atajos de teclado: `Enter` para avanzar entre pasos.

### 📦 Módulo de Inventario

- CRUD completo de productos con categorías.
- **Kardex automatizado**: Cada movimiento de stock (entrada, salida, venta) se registra inmutablemente.
- Alertas visuales de **stock crítico** (bajo mínimo configurable).
- Importación masiva desde archivos Excel/CSV (`BulkImport`).
- Exportación del inventario completo a Excel.
- Actualización en **tiempo real** vía Supabase Realtime (WebSockets).

### 📊 Dashboard y Reportes

- KPIs financieros en tiempo real: Ventas del día, Margen bruto, Ticket promedio.
- Gráficos interactivos con Recharts (Ventas por período, Top productos).
- Calculadora de Rentabilidad Dinámica en el historial de ventas.

### 🧾 Facturación y Tickets

- Generador de recibos térmicos optimizado para impresoras de 80mm.
- Lógica Fruver: Diferenciación automática de unidad (unid. vs kg.).
- Impresión directa desde el navegador.
- Re-impresión desde el historial de ventas.

### 👥 Gestión de Personal y Perfil Corporativo

- Roles jerárquicos: `super_admin`, `admin`, `vendedor/cashier`.
- **Perfil Corporativo Detallado**: Registro del Representante Legal y NIT para cumplimiento legal.
- Creación de colaboradores con rollback atómico (Auth ↔ Perfil).
- Trazabilidad de creación (`created_by`).
- Restricción de acciones por nivel de privilegio.

### 🏢 Plataforma SaaS Multi-Tenant (Super Admin)

- **Provisión Atómica de Inquilinos**: Creación de organización + admin en una sola operación con rollback.
- **Dashboard Dinámico SaaS**: Panel de control con métricas de salud (MRR, Usuarios Activos, Org. Activas) y filtros de tiempo.
- **Matriz de Inquilinos**: Vista detallada de cada organización, su perfil corporativo y estatus financiero.
- Gestión de planes: Esencial, Avanzado, Emprendedor, Premium.
- Límites de usuarios por plan (enforcement automático).
- Suspensión/Activación de organizaciones.
- Purga total de inquilinos (cascada: datos → perfiles → Auth).
- Inyección directa de usuarios en cualquier organización.

### 🔐 Seguridad y Resiliencia (V5.0)

- **Registro Verificado por OTP**: El registro de nuevos inquilinos requiere verificación mediante un código de 6 dígitos enviado por correo para evitar cuentas fantasma. La organización permanece inactiva hasta su activación manual por el usuario validado.
- **Aislamiento Multi-Tenant**: Filtrado mandatorio por `organization_id` en cada consulta.
- **Row Level Security (RLS)**: Políticas de PostgreSQL que impiden acceso cross-tenant a nivel de BD.
- **Auto-Curación de Perfiles**: Si un usuario autenticado no tiene perfil, el middleware lo crea al vuelo.
- **Rollback Manual de Transacciones**: Las ventas implementan limpieza automática si fallan parcialmente.
- **Centinelas Anti-Colapso**: `uncaughtException` y `unhandledRejection` en `app.js`.
- **Protección JWT**: Validación criptográfica de tokens en cada petición.
- **Motor de Temas "Luxury Dark"**: Diseño premium basado en el diseño Apple (Glassmorphism), adaptativo y dinámico respetando el color principal (`--brand-primary`) de cada organización.

### ⚡ Sincronización en Tiempo Real

- Canales de Supabase Realtime filtrados por `organization_id`.
- Actualización instantánea de stock entre terminales sin polling.
- Suscripciones activas en: Inventario, Historial de Ventas y POS.

---

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Node.js 18+
- Proyecto en [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage)

### 1. Backend

```bash
cd backend
npm install
```

Crea el archivo `.env`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_ANON_KEY=tu_anon_key
PORT=4000
```

Inicia el servidor:

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
```

Crea el archivo `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_API_URL=http://localhost:4000/api
```

Inicia la aplicación:

```bash
npm run dev
```

---

## 🗄️ Base de Datos (Supabase/PostgreSQL)

### Tablas Principales

| Tabla                 | Función                              |
| :-------------------- | :----------------------------------- |
| `organizations`       | Registro de empresas/inquilinos      |
| `profiles`            | Usuarios vinculados a organizaciones |
| `products`            | Catálogo de productos con stock      |
| `categories`          | Taxonomía de productos               |
| `sales`               | Encabezados de facturación           |
| `sale_items`          | Detalle de cada venta                |
| `inventory_movements` | Kardex inmutable (entradas/salidas)  |
| `expenses`            | Registro de egresos operacionales    |
| `customers`           | Base de datos de clientes            |
| `suppliers`           | Base de datos de proveedores         |
| `system_logs`         | Registro de actividad del sistema    |

### Políticas de Seguridad (RLS)

Todas las tablas de negocio tienen Row Level Security activado, filtrando por `organization_id` para garantizar el aislamiento total entre inquilinos.

---

## 📖 API REST — Endpoints Principales

| Método | Ruta                                         | Descripción                         |
| :----- | :------------------------------------------- | :---------------------------------- |
| `POST` | `/api/auth/login`                            | Autenticación de usuario            |
| `POST` | `/api/auth/register`                         | Registro atómico (Org + Perfil)     |
| `POST` | `/api/auth/activate`                         | Activación de Org post-OTP          |
| `GET`  | `/api/inventory/products`                    | Listar productos (filtrado por org) |
| `POST` | `/api/inventory/products`                    | Crear producto + Kardex inicial     |
| `POST` | `/api/sales/process`                         | Procesar venta atómica              |
| `GET`  | `/api/sales/history`                         | Historial de ventas                 |
| `GET`  | `/api/dashboard/stats`                       | KPIs del dashboard                  |
| `GET`  | `/api/saas/organizations`                    | Listar inquilinos (Super Admin)     |
| `POST` | `/api/saas/organizations`                    | Provisión de nuevo inquilino        |
| `POST` | `/api/saas/organizations/:orgId/inject-user` | Inyectar usuario                    |
| `GET`  | `/api/health`                                | Estado del servidor                 |

---

## 🧪 Patrones de Diseño Implementados

- **MVC (Model-View-Controller)**: Separación estricta entre rutas, controladores y vistas.
- **Saga Compensatoria**: Rollback manual en transacciones distribuidas (Ventas, Registro).
- **Zero-Trust Security**: Cada petición es validada independientemente; nunca se confía en el cliente.
- **Auto-Healing Middleware**: Detección y reparación automática de perfiles huérfanos.
- **State Hydration Guard**: Barrera `isInitialized` para prevenir Race Conditions en el frontend.
- **Observer Pattern**: Suscripciones Realtime para sincronización entre terminales.

---

_Desarrollado por Kevin Sánchez — Ingeniería de Software, 2026._
_GKAD STOCK V5.0 Enterprise — Sistema POS Multi-Tenant de Alta Disponibilidad._
