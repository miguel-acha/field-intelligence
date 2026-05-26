# Field Intelligence — Contexto Completo del Proyecto
> Este archivo es para Claude Code. Léelo completo antes de tocar cualquier archivo.

---

## ¿Qué es este proyecto?

**Field Intelligence** es una plataforma de análisis de fútbol que usa IA para convertir datos de tracking 3D de jugadores en inteligencia táctica real — el tipo de insight que antes solo existía en la cabeza de los mejores analistas del mundo, ahora disponible para cualquier club.

La diferencia con todo lo que existe hoy: **la IA no muestra los datos. Los piensa.**

---

## Contexto del hackathon

- **Evento:** AWS World Sports Innovation Cup 2026
- **Challenge:** Challenge 2 — Unlock the Power of 3D Football Data (Bundesliga/DFL)
- **Equipo:** OpenCamba
- **Deadline:** 27 de mayo de 2026, fin del día
- **Submission link:** https://amazoncorporate.app.box.com/f/627d78cd1ef944538f38bda333b320e5

### Entregables requeridos (en OpenCamba.zip):
1. `github_link.txt` — URL del repo de GitHub
2. `presentation_video.mp4` — Demo de máx 3 min, resolución <720p
3. `executive_summary.pdf` — Máx 5 slides en PDF
4. `prfaq.pdf` — Opcional, detalla qué hicimos y por qué

### Reglas importantes:
- ❌ NO subir datos del hackathon al repo
- ✅ Mock data está permitida si tiene sentido
- ✅ Si el repo es privado, invitar a MoellerO como colaborador

---

## El problema que resuelve

Los clubes de Bundesliga ahora tienen datos esqueléticos 3D de cada jugador (141 millones de puntos por partido, 5 partidos = 705M puntos totales). Pero actualmente solo se usan para detección automática de eventos básicos (pases, tiros, tackles).

**El potencial sin explotar:**
- Cuantificar agilidad, conciencia táctica, inteligencia espacial
- Medir cosas invisibles al ojo humano
- Generar insights que un analista tardaría horas en producir

---

## La solución: Field Intelligence

Una plataforma con 3 vistas para 3 tipos de usuario:

### Vista 1: Coach Dashboard
- KPIs del partido en cards visuales
- Timeline del partido con momentos clave
- Recomendaciones generadas por IA
- Para: entrenadores que necesitan decisiones rápidas

### Vista 2: Player Profile
- Métricas individuales de cada jugador
- Narrativa personalizada generada por IA
- Mapa de movimiento y heatmap
- Para: preparadores físicos y analistas de rendimiento

### Vista 3: Analyst Mode
- Exploración libre con filtros
- Query en lenguaje natural (preguntarle a la IA en español/inglés)
- Visualización completa del partido
- Para: analistas tácticos que quieren profundizar

---

## KPIs innovadores — el corazón del proyecto

Estos KPIs son imposibles con tracking 2D tradicional. Solo existen gracias a los datos esqueléticos 3D.

### Inspirados en Basketball (NBA):
| KPI | Qué mide | Fórmula base |
|---|---|---|
| **Spatial Awareness Score** | Espacio libre que crea un jugador sin balón | Área de Voronoi 3D promedio durante posesión rival |
| **Court Vision Index** | % del tiempo en zona de recepción óptima | Frames en zona óptima / total frames en posesión propia |

### Inspirados en F1:
| KPI | Qué mide | Fórmula base |
|---|---|---|
| **Sprint Value Score** | Valor táctico de una aceleración según contexto | Aceleración × (compañeros liberados + presión generada) |
| **Slipstream Pressure** | Cuánto arrastra a marcadores, liberando compañeros | Desplazamiento de defensores causado por el movimiento |

### Inspirados en NFL:
| KPI | Qué mide | Fórmula base |
|---|---|---|
| **Positioning EPA** | Expected Points Added según posición 3D pre-jugada | Probabilidad de gol × posición relativa al arco |
| **Pressure Collapse Rate** | Velocidad con que el pressing colapsa el espacio rival | Reducción de espacio rival por segundo de pressing |

### Inspirados en Baseball (Statcast):
| KPI | Qué mide | Fórmula base |
|---|---|---|
| **Launch Angle 3D** | Ángulo y altura real del remate en 3D | Ángulo de elevación del pie en el momento del impacto |
| **Coverage Shadow** | Zonas de influencia defensiva en 3D | Proyección de cobertura en cono 3D desde posición del jugador |

### KPIs propios (innovación pura):
| KPI | Qué mide | Fórmula base |
|---|---|---|
| **3D Pressure Index** | Presión combinada en X, Y y Z (altura incluida) | Vector de presión tridimensional normalizado |
| **Chemistry Score** | Coordinación espacial entre dos jugadores | Correlación de movimientos entre par de jugadores a lo largo del partido |
| **Fatigue Signature** | Cambio en patrones de movimiento por fatiga | Degradación de métricas de velocidad/postura en segunda mitad |
| **Scan Rate** | Frecuencia de rotación de cabeza (conciencia táctica) | Movimientos de cabeza > 15° por minuto |
| **Body Readiness Index** | Postura corporal óptima antes de recibir el balón | Score de postura esquelética pre-recepción |

---

## Stack técnico

### Frontend (lo que el jurado VE):
- **React** — componentes de UI
- **Recharts o Chart.js** — visualizaciones de datos
- **CSS moderno** — diseño visual impactante, oscuro, profesional
- Sin Three.js por complejidad — las visualizaciones 2D bien hechas son suficientes

### Backend / Datos:
- **Python** — generación de mock data y cálculo de KPIs
- **JSON estático** — los datos mockeados se sirven como archivos JSON
- **No necesita servidor** — todo corre en el frontend con datos pre-calculados

### IA (narrativas):
- **Anthropic API** — llamadas directas a Claude para generar narrativas
- Se llama desde el frontend cuando el usuario pide un análisis
- El prompt incluye los datos del jugador/partido y Claude genera texto en lenguaje natural

### Por qué NO usamos AWS Bedrock / Sandbox:
- No tenemos acceso al sandbox todavía
- La API de Anthropic es más rápida de implementar para un demo
- El resultado final es idéntico para el jurado

---

## Mock Data — estructura de los datos reales

Los datos reales del hackathon tienen esta estructura (cada frame, a 25fps):

```json
{
  "match_id": "BL_2024_001",
  "frame_id": 12500,
  "timestamp": "00:08:20.000",
  "period": 1,
  "players": [
    {
      "player_id": "P01",
      "player_name": "Thomas Müller",
      "team": "home",
      "jersey_number": 25,
      "position": "CAM",
      "skeleton": {
        "head": {"x": 52.3, "y": 38.1, "z": 1.82},
        "neck": {"x": 52.3, "y": 38.1, "z": 1.65},
        "left_shoulder": {"x": 52.1, "y": 38.3, "z": 1.55},
        "right_shoulder": {"x": 52.5, "y": 37.9, "z": 1.55},
        "left_elbow": {"x": 51.9, "y": 38.5, "z": 1.35},
        "right_elbow": {"x": 52.7, "y": 37.7, "z": 1.35},
        "left_wrist": {"x": 51.7, "y": 38.7, "z": 1.15},
        "right_wrist": {"x": 52.9, "y": 37.5, "z": 1.15},
        "left_hip": {"x": 52.2, "y": 38.2, "z": 1.05},
        "right_hip": {"x": 52.4, "y": 38.0, "z": 1.05},
        "left_knee": {"x": 52.1, "y": 38.3, "z": 0.55},
        "right_knee": {"x": 52.5, "y": 37.9, "z": 0.55},
        "left_ankle": {"x": 52.0, "y": 38.4, "z": 0.10},
        "right_ankle": {"x": 52.6, "y": 37.8, "z": 0.10}
      },
      "velocity": {"x": 2.1, "y": 0.8, "z": 0.0},
      "acceleration": 0.3,
      "head_rotation": {"yaw": 15, "pitch": -5}
    }
  ],
  "ball": {
    "x": 55.2, "y": 34.1, "z": 0.3,
    "possession": "home"
  },
  "game_state": {
    "score_home": 1,
    "score_away": 0,
    "phase": "attack"
  }
}
```

**El campo mide:** 105m × 68m. Coordenadas Z = altura (0 = suelo, 2 = cabeza aprox).

---

## Diseño visual — guía de estilo

### Concepto: "War Room Táctico"
Dark theme. Profesional. Como lo que usa un analista real de élite.

### Paleta de colores:
```css
--bg-primary: #0a0e1a;        /* Fondo principal — azul muy oscuro */
--bg-secondary: #111827;      /* Cards y paneles */
--bg-tertiary: #1f2937;       /* Hover states */
--accent-green: #00ff87;      /* Verde neón — métricas positivas */
--accent-blue: #3b82f6;       /* Azul — información */
--accent-amber: #f59e0b;      /* Amber — alertas, fatiga */
--accent-red: #ef4444;        /* Rojo — métricas críticas */
--text-primary: #f9fafb;      /* Texto principal */
--text-secondary: #9ca3af;    /* Texto secundario */
--text-muted: #4b5563;        /* Texto muy sutil */
--border: #1f2937;            /* Bordes de cards */
```

### Tipografía:
- Display/Headers: `'Space Grotesk'` o `'DM Sans'` — importar de Google Fonts
- Números/Métricas: `'JetBrains Mono'` — para que los números se vean técnicos
- Body: `'Inter'` o `system-ui`

### Principios de diseño:
1. **Cada número tiene contexto** — nunca mostrar un número solo, siempre con su tendencia
2. **El color encode significado** — verde = bueno, rojo = malo, amber = atención
3. **Densidad de información alta** — los analistas quieren ver mucho a la vez
4. **Animaciones sutiles** — números que "cuentan" al cargar, no animaciones decorativas

---

## Narrativas de IA — cómo funcionan

Cuando el usuario hace clic en "Analizar" o "Ver insight", el frontend llama a la API de Anthropic con este tipo de prompt:

```
Eres un analista táctico de élite de la Bundesliga. Tienes acceso a datos de tracking 3D de jugadores.

Datos del jugador Thomas Müller en el partido Bayern vs Dortmund:
- Spatial Awareness Score: 87/100 (promedio del partido: 71)
- Sprint Value Score: 8 sprints de alto valor (promedio: 5.2)
- Scan Rate: 4.2 escaneos/min (promedio posición: 3.1)
- Fatigue Signature: -12% en segunda mitad
- Momento más destacado: minuto 67, diagonal de 18m en 2.3 segundos

Genera un análisis táctico breve (3-4 oraciones) como lo haría un analista de élite. 
Sé específico con los números. Menciona el impacto real en el juego.
Responde en español.
```

Claude devuelve algo como:
> *"Müller exhibió una conciencia espacial excepcional durante el partido, ubicándose consistentemente 23% por encima del promedio de su posición en Spatial Awareness Score. Su diagonal en el minuto 67 — 18 metros en 2.3 segundos — fue el movimiento de mayor valor táctico del partido, generando el espacio que derivó en el gol 90 segundos después. Su Scan Rate de 4.2 escaneos por minuto explica su capacidad para encontrar esos espacios antes de que existan. La caída del 12% en segunda mitad sugiere que necesita gestión de minutos en partidos de alta intensidad."*

---

## Outputs del sistema — lo que muestra la app

1. **KPI numérico con contexto** — "Spatial Awareness Score: 87/100 ↑ +16 vs promedio"
2. **Narrativa táctica** — párrafo generado por Claude explicando el rendimiento
3. **Recomendación de entrenamiento** — "Ejercicios de pressing mantenido en condición de fatiga"
4. **Alerta de patrón** — "Kimmich muestra reducción del 23% en cobertura espacial — posible fatiga"
5. **Momento destacado del partido** — el movimiento más importante, con datos exactos

---

## Flujo de la app

```
Usuario abre la app
    → Selecciona un partido (5 disponibles)
    → Ve el Coach Dashboard con KPIs del equipo
    → Hace clic en un jugador
    → Ve el Player Profile con sus métricas individuales
    → Hace clic en "Analizar con IA"
    → Claude genera una narrativa táctica en tiempo real
    → El usuario puede preguntar en lenguaje natural: "¿Por qué bajó el rendimiento en el segundo tiempo?"
```

---

## Estructura de archivos esperada

```
field-intelligence/
├── README.md                    ← Instrucciones claras para reproducir
├── CONTEXT.md                   ← Este archivo
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── data/
│   │   │   └── mockData.js      ← Todos los datos mockeados
│   │   ├── components/
│   │   │   ├── CoachDashboard/
│   │   │   ├── PlayerProfile/
│   │   │   ├── AnalystMode/
│   │   │   └── shared/
│   │   └── services/
│   │       └── claude.js        ← Llamadas a la API de Anthropic
│   └── index.html
├── data_generation/
│   ├── generate_mock_data.py    ← Script que genera el mock data
│   └── kpi_calculations.py     ← Fórmulas de los KPIs
└── docs/
    ├── architecture.md
    └── kpis_catalog.md
```

---

## El momento WOW para los jueces

La presentación tiene que tener este momento:

1. Mostrar el partido cargado con jugadores y métricas
2. Hacer clic en un jugador específico
3. Ver sus KPIs en tiempo real
4. Hacer clic en "Analizar con IA"
5. Ver cómo Claude genera la narrativa táctica en vivo (streaming)
6. El jurado lee: *"En el minuto 67, Müller ejecutó una diagonal de 18 metros en 2.3 segundos que generó el Spatial Awareness Score más alto del partido..."*

**Ese es el momento que gana.**

---

## Instrucciones para Claude Code

1. **Empezá por el mock data** — sin datos no hay nada que mostrar
2. **Luego el frontend** — React app con las 3 vistas
3. **Después la integración con Claude API** — las narrativas
4. **Al final el README** — instrucciones para reproducir

### Prioridades absolutas:
- ✅ Que funcione en `npm run dev` sin configuración extra
- ✅ Que sea visualmente impresionante — dark theme, datos densos, profesional
- ✅ Que las narrativas de Claude funcionen con streaming visible
- ✅ Que se pueda hacer una demo fluida de 3 minutos

### Lo que NO importa para este demo:
- ❌ Autenticación de usuarios
- ❌ Base de datos real
- ❌ Conexión a AWS (se menciona en la arquitectura pero no se implementa)
- ❌ Tests unitarios
- ❌ Responsive mobile

### API Key de Anthropic:
- El usuario va a proveer su propia API key en un archivo `.env`
- Usar `VITE_ANTHROPIC_API_KEY` como nombre de la variable
- Nunca hardcodear la key en el código

---

## Notas finales

- El equipo nunca usó AWS antes — la arquitectura menciona AWS pero el demo corre localmente
- La prioridad es **innovación visible** sobre profundidad técnica pura
- Cada decisión técnica debe poder explicarse en términos de impacto para el usuario
- Los jueces son de Bundesliga/DFL y adidas — les importa el impacto en el deporte real
- Mock data inspirada en jugadores reales de Bundesliga hace el demo más creíble
