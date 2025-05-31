
## Segunda Entrega - Procesamiento Distribuido con Apache Pig

### Objetivo
Extender el sistema actual con procesamiento distribuido usando Apache Pig para convertir datos en bruto en información útil para autoridades de tránsito (Unidad de Control de Tránsito y municipios de la Región Metropolitana).

### Módulos a Desarrollar

#### 1. Filtering y Homogeneización ⚠️ **PENDIENTE**
- [ ] **Instalación de Apache Pig**
  - [ ] Configurar Apache Pig en el sistema
  - [ ] Verificar compatibilidad con Java
  - [ ] Probar instalación básica
  
- [ ] **Scripts de Limpieza con Pig**
  - [ ] Script para eliminar registros incompletos (sin comuna, tipo='NONE', street=NULL)
  - [ ] Script para eliminar duplicados por proximidad geográfica/temporal
  - [ ] Script para normalización de datos (tipos de eventos, nombres de comunas)
  - [ ] Script para estandarización bajo esquema unificado

#### 2. Processing - Análisis de Datos ⚠️ **PENDIENTE**
- [ ] **Análisis Geográfico**
  - [ ] Agrupar incidentes por comuna
  - [ ] Identificar patrones geográficos
  - [ ] Detectar zonas de alta concentración (hotspots)
  
- [ ] **Análisis de Frecuencia**
  - [ ] Contar ocurrencia de tipos de incidentes
  - [ ] Calcular estadísticas por categoría (accidente, atasco, corte, etc.)
  - [ ] Análisis de severidad promedio
  
- [ ] **Análisis Temporal**
  - [ ] Identificar tendencias por hora del día
  - [ ] Patrones por día de la semana
  - [ ] Evolución temporal de incidentes
  - [ ] Detectar picos y eventos anómalos

#### 3. Capa de Caché ⚠️ **PENDIENTE**
- [ ] **Implementación de Cache**
  - [ ] Cache en memoria para consultas frecuentes
  - [ ] Cache en disco para consultas complejas
  - [ ] Sistema TTL (tiempo de vida) configurable
  - [ ] Invalidación automática de cache
  
- [ ] **Optimización de Consultas**
  - [ ] Identificar consultas más frecuentes
  - [ ] Implementar estrategias de pre-cálculo
  - [ ] Optimizar tiempos de respuesta
