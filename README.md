# 🛍️ Rappi Catalog Composer

Una aplicación web moderna para crear catálogos de productos visuales con integración automática para Rappi. Compone imágenes de productos con texto personalizado y genera archivos Excel listos para subir a la plataforma de Rappi.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-black)

## ✨ Características Principales

### 🎨 **Composición Visual Avanzada**
- **Canvas HTML5**: Renderizado de alta calidad para imágenes de productos
- **Aspect Ratio Automático**: Mantiene proporciones originales de las imágenes
- **Texto Inteligente**: Wrapping automático con ajuste dinámico de posición
- **Resaltado Visual**: Palabra más larga destacada con rectángulo personalizado

### 📊 **Integración Rappi Completa**
- **Excel Automático**: Genera archivos con formato específico de Rappi
- **Columnas Predefinidas**: Categoría, Nombre, SKU, Marca, EAN, Descripción, etc.
- **Valores por Defecto**: Configuración automática para "Es pesable", "Unidad de medida", etc.
- **Descarga Empaquetada**: ZIP con imágenes + Excel + CSV de resultados

### 🎛️ **Editor Individual Avanzado**
- **Controles Precisos**: Ajuste de posición Y, altura de imagen, tamaño de fuente
- **Ajuste Automático Inteligente**: 
  - 1 línea: 0px de ajuste
  - 2 líneas: 10px máximo
  - 3 líneas: 25px máximo
  - 4+ líneas: Control manual
- **Gestión de Imágenes**: Selección entre imágenes cargadas o subida individual
- **Vista Previa en Tiempo Real**: Actualización automática opcional

### 📁 **Gestión Flexible de Archivos**
- **Carga Masiva**: Múltiples imágenes simultáneas
- **Subida Individual**: Nuevas imágenes por producto específico
- **Mapeo Inteligente**: Asociación automática archivo-producto via CSV
- **Indicadores Visuales**: Estados de procesamiento y cambios pendientes

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- npm o yarn

### Pasos de Instalación

```bash
# Clonar el repositorio
git clone https://github.com/saforero65/rappi-catalog-composer-shadcn.git
cd rappi-catalog-composer-shadcn

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## 📖 Cómo Usar

### 1. **Preparar Archivos**
```csv
sku,action,title,price,filename
PROD001,create,Cuaderno Espiral A4,15000,cuaderno.jpg
PROD002,create,Bolígrafo Azul Pack 3,8500,boligrafos.jpg
```

### 2. **Cargar Recursos**
1. **Plantilla**: Imagen base para el diseño (PNG/JPG)
2. **CSV**: Archivo con datos de productos
3. **Fotos**: Múltiples imágenes de productos

### 3. **Procesamiento**
- Click en "Componer imágenes" para procesar todos
- O usa el editor individual (✏️) para ajustes específicos

### 4. **Exportación**
- **ZIP + CSV**: Descarga básica con imágenes y reporte
- **ZIP + Excel Rappi**: Incluye archivo Excel listo para Rappi

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
```
Frontend: React 18 + TypeScript
UI: shadcn/ui + Tailwind CSS
Build: Vite 5
Canvas: HTML5 Canvas API
Excel: SheetJS (xlsx)
ZIP: JSZip
CSV: Papa Parse
```

### Estructura del Proyecto
```
src/
├── App.tsx              # Componente principal
├── components/ui/       # Componentes shadcn/ui
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── lib/
│   └── utils.ts         # Utilidades y helpers
└── main.tsx            # Punto de entrada
```

### Flujo de Datos
1. **Carga**: CSV → Parsing → Estado React
2. **Mapeo**: Archivos → Map<filename, File>
3. **Composición**: Canvas API → Blob de imagen
4. **Exportación**: JSZip → Descarga

## ⚙️ Configuración Avanzada

### Valores por Defecto Rappi
```typescript
const defaults = {
  categoria: "Papelería y oficina > Útiles escolares > Otros Útiles escolares",
  pesable: "NO",
  preempaquetado: "NO",
  cantidad: 1,
  unidad: "Und (unidades)"
}
```

### Layout del Canvas
```typescript
const LAYOUT = {
  canvas: { w: 500, h: 500 },
  photoSlot: { x: 150, y: 100, w: 200, h: 280 },
  titleBox: { x: 27, y: 393, w: 447, lineH: 29 },
  brandPos: { x: 27, y: 40, size: 15 }
}
```

## 🎯 Casos de Uso

### **E-commerce**
- Catálogos de productos para tiendas online
- Imágenes promocionales con precios
- Material para redes sociales

### **Marketplaces**
- Integración directa con Rappi
- Otros marketplaces (personalizable)
- Gestión masiva de catálogos

### **Retail**
- Etiquetas de precios digitales
- Material promocional
- Inventarios visuales

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🐛 Reportar Issues

Si encuentras algún problema o tienes sugerencias:
1. Revisa los [issues existentes](https://github.com/saforero65/rappi-catalog-composer-shadcn/issues)
2. Crea un nuevo issue con descripción detallada
3. Incluye pasos para reproducir el problema

## 🚀 Roadmap

- [ ] Soporte para más formatos de imagen (WebP, AVIF)
- [ ] Plantillas prediseñadas
- [ ] API REST para automatización
- [ ] Integración con otros marketplaces
- [ ] Editor de plantillas visual
- [ ] Procesamiento en batch mejorado

---

**Desarrollado con ❤️ para la comunidad de e-commerce**
