---
title: Base de conocimiento DeepEconometrics
slug: meta__readme
category: meta
tags: [meta, rag]
---

# Base de conocimiento DeepEconometrics

Esta carpeta es la fuente de verdad de la base de conocimiento RAG del agente.
Cada archivo `.md` se indexa chunk por chunk con embeddings y queda disponible
a traves de la herramienta `search_knowledge_base`.

## Convenciones

- Cada documento comienza con un bloque YAML entre `---`.
- Campos soportados: `title`, `slug`, `category`, `source`, `author`, `tags`, `year`.
- Organiza por subcarpeta (la carpeta define la categoria por defecto):
  - `nobel/` - ensayos breves de laureados con el Nobel de Economia.
  - `conceptos/` - diccionario de conceptos econometricos y macroeconomicos.
  - `pensamiento/` - historia del pensamiento economico, escuelas y autores.
  - `fuentes/` - descripciones reutilizables de fuentes oficiales.
  - `raw_knowledge/` - PDFs o libros fuente para convertirlos en markdown antes de ingestar.

## Pipeline sugerido para PDFs

Convierte primero los PDFs crudos en documentos markdown:

```bash
cd backend
node src/scripts/build-raw-knowledge.js
```

Despues, ingesta o reindexa la base:

```bash
cd backend
node src/scripts/ingest-knowledge.js
```

El script detecta `pgvector`; si no esta disponible, guarda los chunks y usa
busqueda lexica como respaldo.
