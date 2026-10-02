# Gramática Oficial de AutoInfra

**Proyecto 2 - Organización de Lenguajes y Compiladores 1**  
**Universidad de San Carlos de Guatemala**

---

## 1. Notación Léxica

```ebnf
LETTER       ::= [a-zA-Z_]
DIGIT        ::= [0-9]
IDENTIFIER   ::= LETTER (LETTER | DIGIT)*

INT_LITERAL    ::= DIGIT+
FLOAT_LITERAL  ::= DIGIT+ '.' DIGIT+
STRING_LITERAL ::= '"' ( [^"\\\n] | '\\' . )* '"'
BOOL_LITERAL   ::= 'true' | 'false'

COMMENT_SINGLE ::= '//' [^\n]*
COMMENT_MULTI  ::= '/*' .*? '*/'
```

---

## 2. Palabras Reservadas

- **Tipos primitivos y recursos:** `int`, `float`, `string`, `bool`, `server`, `service`, `database`
- **Control de flujo:** `if`, `else`, `while`, `for`, `break`, `continue`, `return`
- **Declaraciones y tareas:** `function`, `task`, `main`
- **Ejecución:** `run`
- **Literales booleanos:** `true`, `false`

---

## 3. Gramática Libre de Contexto (EBNF)

```ebnf
program ::= globalDeclaration* mainBlock? EOF

globalDeclaration ::= resourceDeclaration
                    | functionDeclaration
                    | taskDeclaration
                    | variableDeclaration

resourceDeclaration ::= ('server' | 'service' | 'database') IDENTIFIER '{' propertyAssignment* '}'

propertyAssignment ::= IDENTIFIER '=' expression ';'

functionDeclaration ::= 'function' IDENTIFIER '(' parameterList? ')' type? '{' statement* '}'

parameterList ::= parameter (',' parameter)*
parameter ::= type IDENTIFIER

taskDeclaration ::= 'task' IDENTIFIER '{' statement* '}'

mainBlock ::= 'main' '{' statement* '}'

statement ::= variableDeclaration
            | assignmentStatement
            | ifStatement
            | whileStatement
            | forStatement
            | breakStatement
            | continueStatement
            | returnStatement
            | runStatement
            | blockStatement
            | expressionStatement

variableDeclaration ::= type IDENTIFIER ('=' expression)? ';'

assignmentStatement ::= target '=' expression ';'
target ::= IDENTIFIER
         | postfix '.' IDENTIFIER
         | postfix '[' expression ']'

ifStatement ::= 'if' '(' expression ')' '{' statement* '}' ('else' ('{' statement* '}' | ifStatement))?

whileStatement ::= 'while' '(' expression ')' '{' statement* '}'

forStatement ::= 'for' '(' forInit? ';' expression? ';' forUpdate? ')' '{' statement* '}'
forInit ::= variableDeclaration | (target '=' expression)
forUpdate ::= (target '=' expression) | expression

breakStatement ::= 'break' ';'
continueStatement ::= 'continue' ';'
returnStatement ::= 'return' expression? ';'
runStatement ::= 'run' IDENTIFIER ';'
blockStatement ::= '{' statement* '}'
expressionStatement ::= expression ';'

type ::= baseType ('[' ']')?
baseType ::= 'int' | 'float' | 'string' | 'bool' | 'server' | 'service' | 'database'
```

---

## 4. Precedencia y Asociatividad de Expresiones

Las expresiones se evalúan según el siguiente orden de precedencia (de menor a mayor):

| Nivel | Operador | Descripción | Asociatividad |
|:---:|:---:|:---|:---:|
| 1 | `\|\|` | Disyunción lógica (OR) con cortocircuito | Izquierda a Derecha |
| 2 | `&&` | Conjunción lógica (AND) con cortocircuito | Izquierda a Derecha |
| 3 | `==`, `!=` | Igualdad y desigualdad | Izquierda a Derecha |
| 4 | `<`, `<=`, `>`, `>=` | Comparadores relacionales | Izquierda a Derecha |
| 5 | `+`, `-` | Suma / Concatenación y resta | Izquierda a Derecha |
| 6 | `*`, `/`, `%` | Multiplicación, división y residuo | Izquierda a Derecha |
| 7 | `!`, `-` | Negación lógica y unario aritmético | Derecha a Izquierda |
| 8 | `.`, `[ ]`, `( )` | Acceso a miembro, indexación, llamada | Izquierda a Derecha |

```ebnf
expression  ::= logicalOr
logicalOr   ::= logicalAnd ('||' logicalAnd)*
logicalAnd  ::= equality ('&&' equality)*
equality    ::= comparison (('==' | '!=') comparison)*
comparison  ::= term (('>' | '>=' | '<' | '<=') term)*
term        ::= factor (('+' | '-') factor)*
factor      ::= unary (('*' | '/' | '%') unary)*
unary       ::= ('!' | '-') unary | postfix
postfix     ::= primary (('.' IDENTIFIER) | ('[' expression ']') | ('(' argumentList? ')'))*
primary     ::= INT_LITERAL
              | FLOAT_LITERAL
              | STRING_LITERAL
              | BOOL_LITERAL
              | IDENTIFIER
              | '(' expression ')'
              | '[' (expression (',' expression)*)? ']'

argumentList ::= expression (',' expression)*
```
