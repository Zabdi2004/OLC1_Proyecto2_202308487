# Manual de Usuario - AutoInfra Studio

**Proyecto 2 - Organización de Lenguajes y Compiladores 1**  
**Universidad de San Carlos de Guatemala**

---

## 1. Requisitos Previos

Para ejecutar la aplicación en un entorno local es necesario contar con:
- **Node.js** (versión 18 o superior).
- **npm** (versión 9 o superior).
- Navegador web moderno (Google Chrome, Microsoft Edge, Mozilla Firefox o Brave).

---

## 2. Instrucciones de Inicio y Ejecución Local

El proyecto está diseñado bajo una arquitectura de monorepo desacoplada con backend y frontend independientes.

### Paso 1: Iniciar el Servidor Backend
Abra una terminal en la raíz del proyecto y ejecute:

```bash
cd backend
npm install
npm run start
```

El servidor backend iniciará y escuchará en:
```text
http://localhost:8080
```

### Paso 2: Iniciar la Interfaz Web Frontend
Abra una segunda terminal en la raíz del proyecto y ejecute:

```bash
cd frontend
npm install
npm run dev
```

El frontend estará accesible en su navegador en:
```text
http://localhost:5173
```

---

## 3. Guía de Uso del Entorno de Trabajo

La interfaz de usuario está dividida en las siguientes áreas principales:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  AutoInfra [OLC1-P2]   [Ejemplos ▼] [Nuevo] [Abrir] [Guardar] [Ejecutar ▶] │
├──────────────────────────────────────┬──────────────────────────────────────┤
│                                      │  [Infra] [Consola] [AST] [Tokens]... │
│                                      ├──────────────────────────────────────┤
│  Editor de Código Monaco             │                                      │
│  - Sintaxis coloreada AutoInfra      │  Área de Visualización de Resultados:│
│  - Numeración de línea               │  - Tarjetas interactivas de recursos │
│  - Atajo: Ctrl + Enter               │  - Terminal y bitácora con colores   │
│                                      │  - Árbol de sintaxis abstracta SVG   │
│                                      │  - Tablas de reporte completas       │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 4. Flujo de Operaciones

### 4.1 Carga Rápida de Casos de Prueba (Selector de Ejemplos)
En la barra de herramientas superior encontrará un menú desplegable con los 4 casos oficiales de prueba:
1. **1. Básico:** Servidor web, servicio frontend y condicional de costos.
2. **2. Intermedio:** Servidor de cómputo, arreglos de paquetes e iteración `while`.
3. **3. Avanzado:** Base de datos PostgreSQL, servicio dependiente, ciclo `for` y función recursiva `retryStart`.
4. **4. Errores Obligatorios:** Casos típicos de errores de validación de dependencias detenidas y semántica.

### 4.2 Crear, Abrir y Guardar Archivos
- **Nuevo:** Limpia el editor para redactar un nuevo script desde cero con una plantilla base.
- **Abrir:** Permite seleccionar cualquier archivo con extensión `.infra` o `.txt` desde su disco duro y lo carga de inmediato en el editor.
- **Guardar:** Descarga el contenido actual del editor como un archivo `.infra`.
- **Limpiar:** Restablece las consolas y reportes sin perder el código fuente en el editor.

### 4.3 Ejecutar el Código
- Haga clic en el botón verde **Ejecutar** o presione el atajo de teclado **`Ctrl + Enter`** dentro del editor.
- El código se transmitirá vía HTTP JSON al endpoint `/api/execute`.
- El indicador superior mostrará si la ejecución concluyó con éxito o si se detectaron errores.

---

## 5. Reportes del Sistema

### 5.1 Estado de Infraestructura
Presenta tarjetas con el estado en tiempo real de los recursos:
- **Servidores:** CPU, Memoria, Disco, Sistema Operativo, paquetes instalados y badge con pulso de estado (`running` / `stopped`).
- **Servicios:** Puerto, Réplicas, Host asociado, dependencias y estado de disponibilidad.
- **Bases de Datos:** Motor, versión, puerto y estado.
- **Conexiones Lógicas:** Enlaces activos registrados mediante `connect()`.

### 5.2 Consola y Bitácora
Muestra la salida estándar y bitácora estructurada:
- Mensajes `[OK]` en verde para operaciones exitosas.
- Mensajes `[WARN]` en amarillo para acciones redundantes (e.g. iniciar un servidor ya activo).
- Mensajes `[ERROR]` en rojo cuando una precondición atómica no se cumple.
- Salidas impresas mediante la función nativa `print(...)`.
- Resumen del estado final de todos los recursos.
- Botón **Copiar** para transferir la salida al portapapeles.

### 5.3 AST Gráfico
- Renderizado interactivo en formato vectorial SVG a partir del árbol de sintaxis abstracta.
- Controles de **Zoom In (+)**, **Zoom Out (-)** y restablecer zoom al 100%.
- Botón **Ver Código DOT** para inspeccionar la definición textual Graphviz.
- Botón **Descargar SVG** para guardar la imagen del árbol en su computadora.

### 5.4 Tabla de Tokens
Lista exhaustiva de todos los lexemas reconocidos por el lexer con:
- `#` (Número correlativo).
- `Lexema` (Texto original extraído).
- `Tipo de Token` (Etiqueta de TokenType).
- `Línea` y `Columna`.
- Buscador en tiempo real para filtrar tokens específicos.

### 5.5 Tabla de Símbolos
Detalla todos los identificadores declarados durante el análisis:
- Identificador y Categoría (`recurso`, `variable`, `parámetro`, `función`, `task`).
- Tipo de dato (`server`, `database`, `int`, `string[]`, etc.).
- Ámbito (`global`, nombre de función, ciclo).
- Valor actual o estado del recurso.
- Línea y Columna de origen.

### 5.6 Reporte de Errores
Tabla que se activa automáticamente al encontrar incongruencias léxicas, sintácticas, semánticas o de infraestructura:
- **Léxicos:** Caracteres ilegales, comentarios sin cierre, cadenas multilínea inválidas.
- **Sintácticos:** Errores de gramática recuperados mediante sincronización.
- **Semánticos:** Variables no declaradas, tipos incompatibles, propiedades inexistentes o de solo lectura, desbordes de límites.
- **Infraestructura:** Precondiciones no satisfechas (e.g. `INFRA-004` intentar desplegar un servicio cuya base de datos dependiente está detenida).
