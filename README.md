# OLC1_Proyecto2_202308487
# AutoInfra - Lenguaje para automatización y simulación de infraestructura

**Organización de Lenguajes y Compiladores 1**  
**Universidad de San Carlos de Guatemala**

---

## 🛠️ Tecnologías y Arquitectura

- **Backend:** Node.js (JavaScript ES6 Modules) + Express (API REST).
- **Compilador e Intérprete:**
  - Analizador Léxico manual con detección de líneas, columnas, escapes y comentarios.
  - Analizador Sintáctico manual por Descenso Recursivo con recuperación por sincronización (`;`, `}`).
  - Árbol de Sintaxis Abstracta (AST) propio.
  - Motor de ejecución basado en el **Patrón de diseño Interpreter** (`evaluate()` y `execute()`).
  - Tabla de símbolos con soporte de ámbitos (global, funciones, bloques) y shadowing.
  - Simulador de infraestructura determinista en memoria (Server, Service, Database).
- **Frontend:** React + Vite, Monaco Editor, Graphviz SVG (`@viz-js/viz`), Lucide React.

---

## 🚀 Instrucciones de Ejecución

### 1. Iniciar Servidor Backend (Puerto 8080)
```bash
cd backend
npm install
npm run start
```
Endpoints principales:
- `GET http://localhost:8080/api/health`
- `POST http://localhost:8080/api/execute`
- `POST http://localhost:8080/api/analyze`

### 2. Iniciar Interfaz Web Frontend (Puerto 5173)
```bash
cd frontend
npm install
npm run dev
```
Abra en su navegador web preferido:
👉 **`http://localhost:5173`**

---

## 📂 Estructura del Repositorio

- `backend/`: Código fuente del compilador/intérprete, AST, entorno, modelos y API REST.
- `frontend/`: Aplicación web moderna con Monaco Editor, consola y reportes interactivos.
- `examples/`: Casos de prueba oficiales (`basico.infra`, `intermedio.infra`, `avanzado.infra`, `errores.infra`).
- `docs/`:
  - `Explicacion_Archivos.md`: Explicación detallada archivo por archivo, clases y métodos.
  - `ManualTecnico.md`: Especificación de arquitectura y clases.
  - `ManualUsuario.md`: Guía de usuario paso a paso.
  - `Gramatica.md`: Gramática formal en notación EBNF.
