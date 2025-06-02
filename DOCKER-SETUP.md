# 🚗 Proyecto Waze Dockerizado - Guía Rápida

Tu proyecto ahora está completamente dockerizado con dos módulos principales:

## 🎯 Comandos Esenciales

### Construir el proyecto
```bash
./manage.sh build
```

### Ejecutar solo recolección de datos (Módulo Cache)
```bash
./manage.sh cache
```

### Ejecutar solo procesamiento (Módulo Pig)
```bash
./manage.sh pig-full
```

### Ejecutar todo el flujo completo
```bash
./manage.sh build
./manage.sh cache
./manage.sh pig-full
```

## 📋 Estructura Final

```
waze-project/
├── docker-compose.yml          # ✅ Orquestación completa
├── manage.sh                   # ✅ Script de gestión
├── README-DOCKER.md           # ✅ Documentación completa
├── cache/                      # ✅ Módulo scraper + Redis
│   ├── Dockerfile             # ✅ Existente
│   └── ...
├── pig/                       # ✅ Módulo procesamiento
│   ├── Dockerfile             # ✅ Nuevo - Apache Pig + Hadoop
│   ├── config/                # ✅ Configuraciones Hadoop/Pig
│   ├── scripts/               # ✅ Scripts automatizados
│   └── ...
└── db/                        # ✅ Base de datos compartida
```

## 🚀 Ventajas del Sistema Dockerizado

1. **Aislamiento**: Cada módulo en su propio contenedor
2. **Portabilidad**: Funciona en cualquier sistema con Docker
3. **Escalabilidad**: Fácil agregar nuevos módulos
4. **Gestión simplificada**: Un solo comando para cada operación
5. **Dependencias controladas**: Java 8, Hadoop, Pig preconfigurados

## 📊 Resultados

- **Cache**: `cache/data/` - Archivos JSON de distribuciones
- **Pig**: `pig/output/` - Análisis geográficos y estadísticas

¡Tu proyecto ahora puede ejecutarse completamente con Docker! 🎉
