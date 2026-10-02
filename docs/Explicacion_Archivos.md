# Guía Detallada de Archivos, Clases y Funciones de AutoInfra

Este documento detalla la arquitectura completa del proyecto **AutoInfra**, describiendo archivo por archivo su responsabilidad, sus clases principales y los métodos/funciones que contiene.

---

## 📑 Tabla de Contenidos
1. [Arquitectura General y Flujo de Compilación](#1-arquitectura-general-y-flujo-de-compilación)
2. [Módulo de Errores (`backend/src/errors/`)](#2-módulo-de-errores-backendsrcerrors)
3. [Módulo Léxico (`backend/src/lexer/`)](#3-módulo-léxico-backendsrclexer)
4. [Módulo Sintáctico (`backend/src/parser/`)](#4-módulo-sintáctico-backendsrcparser)
5. [Módulo del AST (`backend/src/ast/`)](#5-módulo-del-ast-backendsrcast)
6. [Módulo de Entornos y Símbolos (`backend/src/environment/`)](#6-módulo-de-entornos-y-símbolos-backendsrcenvironment)
7. [Módulo de Simulación de Infraestructura (`backend/src/infrastructure/`)](#7-módulo-de-simulación-de-infraestructura-backendsrcinfrastructure)
8. [Módulo del Intérprete y Reportes (`backend/src/interpreter/`, `backend/src/reports/`)](#8-módulo-del-intérprete-y-reportes-backendsrcinterpreter-backendsrcreports)
9. [API REST y Servidor Backend (`backend/src/`)](#9-api-rest-y-servidor-backend-backendsrc)
10. [Módulo Frontend Web (`frontend/src/`)](#10-módulo-frontend-web-frontendsrc)
11. [Archivos de Prueba y Configuración](#11-archivos-de-prueba-y-configuración)

---

## 1. Arquitectura General y Flujo de Compilación

AutoInfra sigue un flujo de análisis formal estructurado bajo el **Patrón de Diseño Interpreter**:

```
Código Fuente (.infra)
         │
         ▼
    [ Lexer.js ]  ──(Tokens)──►  Genera Tabla de Tokens y reporta Errores Léxicos
         │
         ▼
   [ Parser.js ]  ──(AST)──►  Aplica Descenso Recursivo, sincronización y ASTNode[]
         │
         ▼
 [ Interpreter.js ]
   ├── AstGraphvizReport.js ──► Genera código DOT del árbol
   ├── Environment.js       ──► Gestiona ámbitos léxicos (global, local, funciones)
   ├── InfraState.js        ──► Simula recursos en memoria y bitácora [OK]
   └── Nodos del AST        ──► Ejecución: evaluate() y execute()
         │
         ▼
Respuesta JSON hacia el Frontend React (Consola, Tablas, Gráfico SVG, Infraestructura)
```

---

## 2. Módulo de Errores (`backend/src/errors/`)

### 📄 `ErrorType.js`
Define un objeto inmutable (`Object.freeze`) con las categorías oficiales de error del lenguaje:
- `LEXICO`: Caracteres desconocidos, cadenas o comentarios sin cierre.
- `SINTACTICO`: Errores en la estructura gramatical (e.g. faltó un punto y coma o una llave).
- `SEMANTICO`: Tipos incompatibles, identificadores no declarados, violaciones de alcance.
- `INFRAESTRUCTURA`: Fallos de precondiciones de recursos (e.g. intentar desplegar con dependencias detenidas `INFRA-004`).
- `EJECUCION`: Errores en tiempo de ejecución (división por cero, desbordamiento de límites de ciclo).

### 📄 `CompilerError.js`
Clase que estandariza la representación de un error para reportes y respuestas de la API.
- **Constructor:** `constructor(type, code, description, line, column)`.
- **Métodos:**
  - `toString()`: Devuelve el error formateado con su tipo, código, mensaje y coordenadas de línea/columna.

---

## 3. Módulo Léxico (`backend/src/lexer/`)

### 📄 `TokenType.js`
Catálogo con todos los tipos de tokens reconocibles:
- **Tipos:** `INT`, `FLOAT`, `STRING_TYPE`, `BOOL`, `SERVER`, `SERVICE`, `DATABASE`.
- **Control:** `IF`, `ELSE`, `WHILE`, `FOR`, `BREAK`, `CONTINUE`, `RETURN`.
- **Declaraciones:** `FUNCTION`, `TASK`, `MAIN`, `RUN`.
- **Literales:** `IDENTIFIER`, `INT_LITERAL`, `FLOAT_LITERAL`, `STRING_LITERAL`, `TRUE`, `FALSE`.
- **Operadores:** `PLUS`, `MINUS`, `STAR`, `SLASH`, `PERCENT`, `EQUAL_EQUAL`, `BANG_EQUAL`, `LESS_EQUAL`, `GREATER_EQUAL`, `LESS`, `GREATER`, `AND`, `OR`, `BANG`, `EQUAL`.
- **Delimitadores:** `LPAREN`, `RPAREN`, `LBRACE`, `RBRACE`, `LBRACKET`, `RBRACKET`, `SEMICOLON`, `COMMA`, `DOT`, `EOF`.

### 📄 `Token.js`
Representa una unidad léxica extraída del código fuente.
- **Propiedades:** `type`, `lexeme`, `literal`, `line`, `column`.
- **Métodos:** `toString()`.

### 📄 `Lexer.js`
Analizador léxico manual carácter por carácter.
- **Propiedades:** `source`, `tokens`, `errors`, cursores de posición (`start`, `current`, `line`, `column`).
- **Métodos Principales:**
  - `scanTokens()`: Itera todo el texto y retorna el array de tokens y la lista de errores léxicos.
  - `scanToken()`: Lee el siguiente carácter y emite el token correspondiente según operadores o delimitadores.
  - `scanBlockComment()`: Lee comentarios multilínea `/* ... */`. Si el archivo termina sin cerrarse, reporta un error léxico con línea y columna inicial.
  - `scanString()`: Procesa cadenas de texto entre comillas dobles `"..."`. Convierte caracteres de escape como `\"`, `\\`, `\n` y `\t`. Reporta error si la cadena no se cierra antes de fin de línea o fin de archivo.
  - `scanNumber()`: Distingue si un número es un entero (`INT_LITERAL`) o decimal (`FLOAT_LITERAL`).
  - `scanIdentifier()`: Reconoce identificadores y consulta el mapa de palabras reservadas.
  - `advance()`, `match(expected)`, `peek()`, `peekNext()`, `isDigit(c)`, `isAlpha(c)`: Utilidades de bajo nivel para desplazamiento y predicción en el búfer de entrada.

---

## 4. Módulo Sintáctico (`backend/src/parser/`)

### 📄 `Parser.js`
Implementación manual de un analizador sintáctico descendente recursivo (Recursive Descent Parser).
- **Propiedades:** `tokens`, `current`, `errors`.
- **Métodos de Declaración y Sentencias:**
  - `parse()`: Punto de entrada. Itera sobre las declaraciones globales hasta encontrar `EOF`.
  - `globalDeclaration()`: Deriva a declaraciones de recursos, funciones, tareas, bloque `main` o variables globales.
  - `resourceDeclaration()`: Procesa la sintaxis `server nombre { cpu = 4; ... }`.
  - `functionDeclaration()`: Procesa funciones con parámetros tipados, tipo de retorno y cuerpo.
  - `taskDeclaration()`: Procesa tareas sin parámetros para automatización.
  - `mainDeclaration()`: Procesa el bloque único `main { ... }`.
  - `statement()`: Reconoce sentencias `if`, `while`, `for`, `break`, `continue`, `return`, `run`, bloques y sentencias de expresión.
  - `ifStatement()`: Maneja estructuras condicionales con ramas `else` y `else-if` encadenadas.
  - `whileStatement()` y `forStatement()`: Maneja ciclos iterativos con ámbitos locales.
  - `variableDeclaration()`: Procesa declaraciones con inicialización opcional (e.g. `int replicas = 3;`).
- **Niveles de Precedencia de Expresiones (de menor a mayor precedencia):**
  - `expression()` -> `logicalOr()` (`||`)
  - `logicalAnd()` (`&&`)
  - `equality()` (`==`, `!=`)
  - `comparison()` (`<`, `<=`, `>`, `>=`)
  - `term()` (`+`, `-`)
  - `factor()` (`*`, `/`, `%`)
  - `unary()` (`!`, `-`)
  - `postfix()` (llamadas a función, accesos a propiedad `.prop` e índices `[idx]`)
  - `primary()` (literales, identificadores, expresiones entre paréntesis `(...)`, arreglos `[...]`)
- **Manejo y Recuperación de Errores:**
  - `error(token, message)`: Registra el error sintáctico con código `SIN-001`.
  - `synchronize()`: Salta tokens hasta encontrar delimitadores como `;` o `}` o palabras clave de sentencia para poder recuperarse y seguir analizando el resto del archivo.

---

## 5. Módulo del AST (`backend/src/ast/`)

### 📄 `ASTNode.js`
Contiene la base del Patrón Interpreter:
- `ASTNode`: Clase padre con línea, columna y `getNodeLabel()`.
- `Expression`: Clase abstracta para nodos que producen un valor mediante `evaluate(environment)`.
- `Instruction`: Clase abstracta para nodos que ejecutan acciones mediante `execute(environment)`.

### 📄 `expressions/ExpressionNodes.js`
Nodos del AST que implementan `evaluate(environment)`:
- `LiteralExpr`: Almacena y devuelve valores literales (`int`, `float`, `string`, `bool`).
- `IdentifierExpr`: Busca y resuelve el valor de una variable en el entorno léxico actual o ancestros.
- `BinaryExpr`: Evalúa operaciones aritméticas, relacionales y lógicas. **Implementa cortocircuito estricto** en `&&` y `||` (si la condición izquierda define el resultado, no evalúa la derecha).
- `UnaryExpr`: Negación aritmética (`-`) y lógica (`!`).
- `PropertyAccessExpr`: Evalúa el acceso a propiedades de recursos (`backend.status`, `api.port`, etc.).
- `IndexExpr`: Evalúa el acceso a elementos de arreglos (`pkgs[i]`), validando límites numéricos.
- `ArrayExpr`: Evalúa arreglos literales `[elem1, elem2, ...]`.
- `CallExpr`: Ejecuta llamadas a funciones:
  - **Acciones nativas:** `start`, `stop`, `restart`, `install`, `uninstall`, `deploy`, `scale`, `connect`, `disconnect`, `print`, `length`, `status`.
  - **Funciones de usuario:** Delega a la función definida por el usuario creando su propio ámbito.

### 📄 `instructions/InstructionNodes.js`
Nodos del AST que implementan `execute(environment)`:
- `BlockInstruction`: Ejecuta una lista secuencial de sentencias dentro de llaves `{ ... }`.
- `ExpressionInstruction`: Ejecuta una expresión independiente (e.g. `start(web);` o `print(...);`).
- `VarDeclInstruction`: Declara una nueva variable, verifica duplicados en el mismo ámbito y valida compatibilidad de tipos estricta.
- `AssignmentInstruction`: Modifica variables existentes, propiedades de recursos (impidiendo modificar propiedades de solo lectura como `.status`) o índices de arreglos.
- `IfInstruction`: Ejecuta condicionales `if/else`.
- `WhileInstruction`: Ejecuta bucles `while`, manejando señales de `break` y `continue`.
- `ForInstruction`: Crea un entorno para la variable del bucle, valida condición, ejecuta cuerpo y realiza la actualización.
- `BreakInstruction` y `ContinueInstruction`: Devuelven señales `ExecutionResult.break()` y `continue()`.
- `ReturnInstruction`: Evalúa y emite `ExecutionResult.return(valor)`.
- `FunctionDeclInstruction`: Registra la función en el entorno. Su método `call()` crea un nuevo entorno para parámetros, ejecuta el cuerpo y controla la profundidad máxima de recursividad (límite: 1000).
- `TaskDeclInstruction`: Procedimiento de automatización sin parámetros. Su método `run()` crea un entorno y ejecuta sus instrucciones.
- `RunInstruction`: Invoca una tarea previamente registrada mediante `run taskName;`.
- `ResourceDeclInstruction`: Instancia un recurso (`ServerResource`, `ServiceResource`, `DatabaseResource`), valida restricciones iniciales (puertos, memoria > 0) y lo registra tanto en la tabla de símbolos como en el estado de infraestructura global.
- **Control de Ciclos Infinitos:** Función `checkInstructionLimit()` que cuenta cada instrucción ejecutada y lanza error controlado si supera 100,000 instrucciones.

---

## 6. Módulo de Entornos y Símbolos (`backend/src/environment/`)

### 📄 `Type.js`
- `DataType`: Enumeración de tipos (`int`, `float`, `string`, `bool`, `server`, `service`, `database`, `resource`, `void`).
- `Type`: Clase con `baseType` y bandera `isArray`.
  - `isAssignable(fromType)`: Aplica las reglas de compatibilidad de asignación del enunciado (e.g., `float` acepta `int` y `float`, los arreglos deben ser homogéneos, los recursos aceptan su tipo correspondiente).
  - `getDefaultValue()`: Retorna los valores por defecto oficiales (`0`, `0.0`, `""`, `false`, `null`).

### 📄 `Symbol.js`
Representa una entrada en la tabla de símbolos.
- **Propiedades:** `name`, `category` (variable, recurso, función, tarea, parámetro), `type`, `scope`, `value`, `line`, `column`.
- **Métodos:**
  - `getDisplayValue()`: Genera una representación legible del valor para el reporte (muestra el estado si es un recurso, JSON si es array, etc.).
  - `toJSON()`: Serializa la información para la API y la vista web.

### 📄 `Environment.js`
Maneja la tabla de símbolos con ámbitos léxicos anidados.
- **Propiedades:** `parent` (puntero al ámbito exterior), `name` (nombre del ámbito: 'global', función, 'if', etc.), `symbols` (Map local), `infraState` (referencia compartida), `symbolHistory` (historial de símbolos creados para el reporte).
- **Métodos:**
  - `define(name, symbol)`: Inserta un símbolo en el ámbito actual.
  - `existsCurrent(name)`: Comprueba si existe en el ámbito actual para evitar duplicados.
  - `lookup(name)`: Busca el símbolo en el ámbito actual; si no existe, busca recursivamente en `parent`.
  - `assign(name, value)`: Actualiza el valor de una variable en el ámbito exacto donde fue declarada.
  - `getAllHistorySymbols()`: Retorna todos los símbolos creados durante toda la corrida para alimentar la tabla de símbolos de los reportes.

### 📄 `ExecSignal.js`
Manejo de señales de control de flujo limpias:
- `ExecSignal`: Valores `normal`, `break`, `continue`, `return`.
- `ExecutionResult`: Encapsula la señal y el valor retornado, evitando el costo y la mala práctica de arrojar excepciones JavaScript para controlar el flujo de bucles.

---

## 7. Módulo de Simulación de Infraestructura (`backend/src/infrastructure/`)

### 📄 `ServerResource.js`
- Modela un servidor con `cpu`, `memory`, `disk`, `os`, `status` (inicia en `stopped`) y `packages` (array de strings).
- `isReadOnlyProperty(prop)`: Identifica `status` y `packages` como propiedades protegidas de solo lectura.
- `getProperty(prop)`, `setProperty(prop, val)`, `toJSON()`.

### 📄 `ServiceResource.js`
- Modela un servicio con `port`, `replicas`, `status` (inicia en `undeployed`), `host` (servidor donde está desplegado) y `dependsOn` (referencias a otros recursos requeridos).
- `isReadOnlyProperty(prop)`: Protege `status` y `host`.
- `toJSON()`.

### 📄 `DatabaseResource.js`
- Modela una base de datos con `engine` (`postgresql`, `mysql`, `sqlite`), `version`, `port` y `status` (inicia en `stopped`).
- `isReadOnlyProperty(prop)`: Protege `status`.
- `toJSON()`.

### 📄 `InfraState.js`
Motor central de simulación determinista en memoria.
- **Propiedades:** Mapas `servers`, `services`, `databases`, lista de `connections`, lista `bitacora` (mensajes `[OK]`) y `consoleOutput` (salidas por `print`).
- **Métodos de Acciones Nativas con Validación Atómica:**
  - `start(resource)`: Cambia estado a `running`. Si ya estaba activo, no duplica efectos y añade una advertencia.
  - `stop(resource)`: Cambia estado a `stopped`.
  - `restart(resource)`: Reinicia recursos activos.
  - `install(server, package)`: Instala un software solo si el servidor está `running`.
  - `uninstall(server, package)`: Elimina un software instalado.
  - `deploy(server, service, line, col)`: Despliega un servicio en un servidor. **Regla estricta:** Valida que el servidor esté activo y que **todas** las dependencias declaradas en `dependsOn` existan y estén en estado `running`. Si una dependencia está detenida, lanza el error oficial `INFRA-004`.
  - `scale(service, replicas)`: Cambia el número de réplicas (mínimo 1).
  - `connect(res1, res2)`: Crea una conexión lógica bidireccional sin duplicados.
  - `disconnect(res1, res2)`: Desconecta recursos lógicos.
  - `status(resource)`: Devuelve el estado actual como string.
  - `printToConsole(msg)`: Registra mensajes generados por la función nativa `print()`.
  - `toJSON()`: Serializa el estado completo para el dashboard del frontend.

---

## 8. Módulo del Intérprete y Reportes (`backend/src/interpreter/`, `backend/src/reports/`)

### 📄 `Interpreter.js`
Controlador principal del pipeline:
- Método `execute(sourceCode)`:
  1. Reinicia el contador de seguridad.
  2. Ejecuta `Lexer.scanTokens()`.
  3. Ejecuta `Parser.parse()`.
  4. Genera el código DOT del AST con `AstGraphvizReport`.
  5. Si existen errores léxicos o sintácticos, aborta la ejecución y retorna los reportes de error inmediatos.
  6. Si no hay errores sintácticos, inicializa el `Environment` global y el `InfraState`.
  7. Registra recursos, variables, funciones y tareas globales.
  8. Ejecuta el bloque obligatorio `main`.
  9. Captura cualquier error semántico, de infraestructura o de ejecución con su línea y columna exactas.
  10. Retorna un objeto JSON unificado con `{ success, console, bitacora, errors, tokens, symbols, infrastructure, astDot }`.

### 📄 `AstGraphvizReport.js`
Generador de grafos en formato DOT para Graphviz.
- `generateDot(astNodes)`: Crea el encabezado del grafo `digraph AST { ... }` con estilo profesional oscuro.
- `traverse(node)`: Recorre recursivamente los nodos del AST (expresiones e instrucciones), crea identificadores únicos y aristas dirigidas (`->`) con etiquetas descriptivas (`cond`, `then`, `else`, `init`, etc.).

---

## 9. API REST y Servidor Backend (`backend/src/`)

### 📄 `controllers/compiler.controller.js`
Handlers que procesan las peticiones HTTP del frontend:
- `healthCheck`: Verifica disponibilidad en `GET /api/health`.
- `executeCode`: Endpoint principal `POST /api/execute` que analiza, ejecuta y devuelve todos los resultados.
- `analyzeCode`: `POST /api/analyze` para validación sin ejecución.
- `getTokens`, `getAst`, `getSymbols`, `getErrors`: Endpoints individuales para reportes específicos.

### 📄 `routes/compiler.routes.js`
Enruta los métodos HTTP hacia los controladores correspondientes.

### 📄 `app.js`
Configura Express, activa CORS para permitir peticiones desde el frontend (`http://localhost:5173`) y habilita el parser JSON.

### 📄 `index.js`
Punto de entrada del backend. Inicia el servidor en el puerto `8080`.

---

## 10. Módulo Frontend Web (`frontend/src/`)

### 📄 `services/api.js`
Módulo cliente HTTP con métodos asíncronos (`fetch`) para comunicarse con la API de Node.js:
- `checkHealth()`, `executeCode(source)`, `analyzeCode(source)`.

### 📄 `examples/presets.js`
Contiene plantillas con los ejemplos oficiales del enunciado listos para cargar:
- `basico`: Configuración y despliegue básico de un servidor y servicio.
- `intermedio`: Arreglos, bucle `while` e instalación iterativa de paquetes.
- `avanzado`: Base de datos PostgreSQL, servicio dependiente, función recursiva `retryStart` y ciclo `for`.
- `errores`: Casos de error obligatorios para verificar el reporte de errores.

### 📄 `components/Toolbar.jsx`
Barra de herramientas superior:
- Selector de presets oficiales.
- Botones: **Nuevo** (limpia código), **Abrir** (carga archivos `.infra` del disco mediante `FileReader`), **Guardar** (descarga archivo `.infra` vía Blob), **Limpiar** (resetea reportes) y **Ejecutar** (botón verde de acción).
- Badge dinámico de estado del backend (Conectado / Desconectado).

### 📄 `components/CodeEditor.jsx`
Integración con **Monaco Editor**:
- Registra el lenguaje `autoinfra` en Monaco con tokenización personalizada (palabras clave, tipos, funciones nativas, comentarios y números).
- Aplica el tema oscuro personalizado `autoinfra-dark`.

### 📄 `components/InfrastructureView.jsx`
Dashboard interactivo que presenta:
- **Servidores:** CPU, RAM, Disco, SO, lista de paquetes instalados y badges con pulso (`running`, `stopped`).
- **Servicios:** Puerto, réplicas, host asignado, dependencias y estado (`undeployed`, `running`, `degraded`).
- **Bases de datos:** Motor, versión, puerto y estado.
- **Conexiones:** Enlaces lógicos registrados entre recursos.

### 📄 `components/ConsolePanel.jsx`
Terminal interactiva que renderiza con colores la bitácora `[OK]`, advertencias `[WARN]`, salidas de `print(...)` y el estado final. Incluye botón para copiar al portapapeles.

### 📄 `components/AstViewer.jsx`
Visualizador gráfico del AST:
- Utiliza `@viz-js/viz` (WebAssembly) para transformar el código DOT en gráficos vectoriales SVG directamente en el navegador sin requerir instalar binarios externos de Graphviz en el sistema.
- Permite hacer Zoom In, Zoom Out, restablecer escala, descargar la imagen SVG y alternar la vista para inspeccionar el código fuente DOT.

### 📄 `components/TablesView.jsx`
Componente reutilizable de tablas con buscador de texto en tiempo real para:
- **Tokens:** `#`, Lexema, Tipo de Token, Línea y Columna.
- **Símbolos:** `#`, Identificador, Categoría, Tipo, Ámbito, Valor/Estado, Línea y Columna.
- **Errores:** `#`, Tipo, Código, Descripción, Línea y Columna.

### 📄 `App.jsx`
Componente raíz de la interfaz web:
- Gestiona el estado reactivo (`code`, `result`, `activeTab`, `backendStatus`).
- Implementa el atajo de teclado global **`Ctrl + Enter`** para ejecutar código al instante.
- Organiza el layout responsivo en 2 paneles: editor a la izquierda y visor multipestaña a la derecha.

### 📄 `index.css`
Sistema de estilos CSS moderno con variables HSL, Glassmorphism (`backdrop-filter: blur`), tipografía moderna (`Outfit` y `JetBrains Mono`) y barras de desplazamiento personalizadas.

---

## 11. Archivos de Prueba y Configuración

- **`examples/`**:
  - `basico.infra`: Caso básico del enunciado (Pág. 20).
  - `intermedio.infra`: Caso intermedio del enunciado (Pág. 20).
  - `avanzado.infra`: Caso avanzado con recursividad y dependencias (Pág. 21).
  - `errores.infra`: Casos de error para probar el reporte (Pág. 22).
- **`docs/`**:
  - `Gramatica.md`: Gramática formal en notación EBNF.
  - `ManualTecnico.md`: Manual técnico para el mantenimiento del compilador.
  - `ManualUsuario.md`: Guía de usuario para la ejecución y uso de la interfaz.
- **`.gitignore`**: Ignora recursivamente `node_modules/`, `dist/`, logs y archivos de sistema.
- **`README.md`**: Resumen general del repositorio e instrucciones rápidas de inicio.
