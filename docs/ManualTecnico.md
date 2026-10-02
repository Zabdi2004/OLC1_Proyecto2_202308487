# Manual Técnico - AutoInfra

**Proyecto 2 - Organización de Lenguajes y Compiladores 1**  
**Universidad de San Carlos de Guatemala - Facultad de Ingeniería**

---

## 1. Descripción General del Sistema

**AutoInfra** es un compilador e intérprete para un Lenguaje de Dominio Específico (DSL) orientado a la automatización y simulación determinista de infraestructura tecnológica en memoria. El sistema se compone de una arquitectura Cliente-Servidor (MVC) donde el backend procesa el código fuente `.infra` mediante fases de compilación estándar (Léxico, Sintáctico, Semántico y Patrón Interpreter) y el frontend interactivo en React renderiza resultados, consolas y reportes en tiempo real.

---

## 2. Tecnologías y Herramientas Utilizadas

### Backend:
- **Lenguaje:** JavaScript (ES6+ Modules).
- **Entorno de Ejecución:** Node.js (v24+).
- **Framework Web:** Express v4.21.
- **Middleware:** `cors`, `express.json`.

### Frontend:
- **Librería UI:** React 19 + Vite 8.
- **Editor de Código:** Monaco Editor (`@monaco-editor/react`) con syntax highlighter custom para AutoInfra.
- **Renderizado de Grafos AST:** `@viz-js/viz` (compilación WebAssembly de Graphviz).
- **Iconografía y Estilos:** Lucide React, Vanilla CSS3 estructurado bajo variables y Glassmorphism.

---

## 3. Estructura General del Proyecto

```text
OLC1_Proyecto2_202308487/
├── backend/
│   ├── src/
│   │   ├── ast/
│   │   │   ├── ASTNode.js                  # Clases base ASTNode, Expression e Instruction
│   │   │   ├── expressions/
│   │   │   │   └── ExpressionNodes.js       # Nodos de expresión (Binary, Unary, Literal, Call, etc.)
│   │   │   └── instructions/
│   │   │       └── InstructionNodes.js      # Nodos de instrucción (VarDecl, If, While, For, etc.)
│   │   ├── controllers/
│   │   │   └── compiler.controller.js       # Handlers HTTP para /execute, /analyze, /ast, etc.
│   │   ├── environment/
│   │   │   ├── Environment.js               # Ámbitos léxicos, resolución de variables y shadowing
│   │   │   ├── ExecSignal.js                # Propagación de señales (break, continue, return)
│   │   │   ├── Symbol.js                    # Registro para la tabla de símbolos
│   │   │   └── Type.js                      # Sistema de tipos y compatibilidad
│   │   ├── errors/
│   │   │   ├── CompilerError.js             # Estructura de error estándar
│   │   │   └── ErrorType.js                 # Enumeración de tipos de error
│   │   ├── infrastructure/
│   │   │   ├── DatabaseResource.js          # Recurso Database y reglas de lectura
│   │   │   ├── InfraState.js                # Simulador atómico en memoria y bitácora
│   │   │   ├── ServerResource.js            # Recurso Server y paquetes
│   │   │   └── ServiceResource.js           # Recurso Service, dependencias y réplicas
│   │   ├── interpreter/
│   │   │   └── Interpreter.js               # Orquestador del análisis y ejecución
│   │   ├── lexer/
│   │   │   ├── Lexer.js                     # Analizador léxico manual
│   │   │   ├── Token.js                     # Estructura del token
│   │   │   └── TokenType.js                 # Catálogo de tipos de token
│   │   ├── parser/
│   │   │   └── Parser.js                    # Parser manual descendente recursivo
│   │   ├── reports/
│   │   │   └── AstGraphvizReport.js         # Generador de grafos DOT para Graphviz
│   │   ├── routes/
│   │   │   └── compiler.routes.js           # Enrutamiento REST de la API
│   │   ├── app.js                           # Configuración de Express
│   │   └── index.js                         # Servidor en puerto 8080
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AstViewer.jsx                # Renderizador visual interactivo de AST
│   │   │   ├── CodeEditor.jsx               # Editor Monaco con lenguaje personalizado
│   │   │   ├── ConsolePanel.jsx             # Terminal con bitácora y prints coloreados
│   │   │   ├── InfrastructureView.jsx       # Dashboard de Servidores, Servicios y BDs
│   │   │   ├── TablesView.jsx               # Tablas de Tokens, Símbolos y Errores
│   │   │   └── Toolbar.jsx                  # Barra superior de acciones y presets
│   │   ├── examples/
│   │   │   └── presets.js                   # Casos de prueba predeterminados
│   │   ├── services/
│   │   │   └── api.js                       # Cliente HTTP Fetch hacia el backend
│   │   ├── App.jsx                          # Layout general reactivo
│   │   └── index.css                        # Estilos CSS modernos (Dark Theme)
│   └── package.json
├── examples/                                # Archivos .infra de prueba
└── docs/                                    # Manuales y Gramática
```

---

## 4. Fases de Compilación y Clases Principales

### 4.1 Analizador Léxico (`Lexer.js`)
- **Técnica:** Escaneo carácter por carácter con seguimiento exacto de línea y columna.
- **Manejo de Errores Léxicos:** Caracteres no reconocidos (e.g. `@`, `$`) generan una instancia de `CompilerError` de tipo `Léxico`, permitiendo al scanner continuar para encontrar más errores en el código fuente.
- **Escape y Cadenas:** Procesa secuencias mínimas `\"`, `\\`, `\n`, `\t` y detecta cadenas sin cerrar antes del fin de línea o fin de archivo.
- **Comentarios:** Ignora comentarios de línea (`//`) y de bloque (`/* ... */`). Si un comentario multilínea no se cierra antes de EOF, genera un error léxico con línea y columna iniciales.

### 4.2 Analizador Sintáctico (`Parser.js`)
- **Técnica:** Descenso recursivo LL(1) predictivo con manejo de precedencia por niveles para expresiones.
- **Recuperación ante Errores:** Implementa el método `synchronize()` que salta tokens hasta encontrar delimitadores clave (`;`, `}`) o palabras reservadas de declaración (`server`, `service`, `function`, `task`, `if`, etc.) para recolectar múltiples errores sintácticos por corrida.
- **Construcción del AST:** No requiere fases intermedias; instancia directamente los nodos correspondientes de `ExpressionNodes` e `InstructionNodes`.

### 4.3 Árbol de Sintaxis Abstracta y Patrón Interpreter
- **Interfaz `Expression`:** Define `evaluate(environment)`. Cada nodo evalúa sus operandos recursivamente en el entorno léxico actual.
- **Interfaz `Instruction`:** Define `execute(environment)`. Ejecuta declaraciones, asignaciones y estructuras de control, retornando un `ExecutionResult` para control de flujo sin depender de excepciones JavaScript para `break` o `continue`.
- **Límite de Seguridad:** Cuenta global de instrucciones ejecutadas (`MAX_INSTRUCTIONS = 100000`) para mitigar ciclos infinitos accidentales.
- **Límite de Recursividad:** Límite máximo de 1000 llamadas anidadas para funciones recursivas.

### 4.4 Entorno y Tabla de Símbolos (`Environment.js`, `Symbol.js`)
- **Resolución de Ámbitos:** Mantiene una referencia a su entorno `parent`. Las búsquedas ascienden por la cadena de ámbitos.
- **Ocultamiento de Variables (Shadowing):** Una variable local en una función o bloque oculta una de ámbito superior sin sobrescribirla.
- **Historial Global:** Todos los símbolos creados durante el análisis se conservan en un historial accesible para generar el reporte de la Tabla de Símbolos exigido por el enunciado.

### 4.5 Simulador de Infraestructura (`InfraState.js`)
- **Atomicidad de Acciones:** Antes de alterar cualquier propiedad o estado, valida precondiciones. Si alguna falla, no se aplica ningún cambio parcial.
- **Acciones Nativas Implementadas:**
  - `start(resource)`, `stop(resource)`, `restart(resource)`
  - `install(server, package)`, `uninstall(server, package)`
  - `deploy(server, service)` (con chequeo estricto del estado de todas las dependencias en `dependsOn`)
  - `scale(service, replicas)`
  - `connect(resource, resource)`, `disconnect(resource, resource)`
  - `print(...)`, `length(array)`, `status(resource)`
