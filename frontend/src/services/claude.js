// ============================================================
// FIELD INTELLIGENCE — Claude AI Service
// Si hay VITE_ANTHROPIC_API_KEY en .env → llama a la API real
// Si no hay key → usa respuestas mock con streaming simulado
// ============================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

function getApiKey() {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  return key && key !== 'your_anthropic_api_key_here' ? key : null;
}

// Simula streaming caracter por caracter con delay realista
async function streamMock(text, onChunk) {
  const words = text.split(' ');
  for (const word of words) {
    await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
    onChunk(word + ' ');
  }
  return text;
}

// ---- Mock responses por jugador ----
const MOCK_PLAYER_RESPONSES = {
  'Thomas Müller': `Müller exhibió una conciencia espacial excepcional durante el partido, ubicándose consistentemente por encima del promedio de su posición en Spatial Awareness Score (87/100 vs 71 de promedio). Su diagonal en el minuto 67 — 18 metros en 2.3 segundos — fue el movimiento de mayor valor táctico del partido, generando el espacio que derivó en el tercer gol. Su Scan Rate de 4.2 escaneos por minuto explica su capacidad para encontrar esos espacios antes de que existan: ve el campo 35% más rápido que el promedio de su posición. La caída del 12% en Fatigue Signature en segunda mitad es una señal clara: en partidos de alta presión, necesita gestión de minutos a partir del 70'.`,
  'Joshua Kimmich': `Kimmich operó como el eje de distribución del Bayern con un Court Vision Index de 89/100, el más alto del partido entre mediocampistas. Su 3D Pressure Index revela que ejerció presión vertical y horizontal simultánea en 78 eventos, colapsando el espacio rival a un ritmo 23% superior al promedio. Sin embargo, el Fatigue Signature del -18% en segunda mitad es una alerta concreta: su cobertura espacial se redujo de forma medible a partir del minuto 65, y dos contraataques rivales se iniciaron en zonas que normalmente controla. Recomendación: rotar su posición en bloques de 15 minutos durante pressing sostenido para mantener su rendimiento en los 90.`,
  'Harry Kane': `Kane demostró un Positioning EPA de +2.4 puntos esperados, el más alto del equipo, gracias a su capacidad de ubicarse en zonas de alta probabilidad de gol antes de recibir el balón. Su Body Readiness Index de 91/100 refleja una postura esquelética casi perfecta en el momento de recepción — el 94% de sus toques los realizó en posición óptima para rematar o asistir de primera. El Coverage Shadow de 312m² indica que su presencia sin balón neutraliza una zona defensiva equivalente a casi un cuarto del área final. Con 9 sprints de alto valor, superó en un 73% el promedio de delanteros centro de la liga esta temporada.`,
};

const MOCK_ANALYST_RESPONSES = {
  default: (question, matchData) =>
    `Analizando los datos del partido ${matchData.homeTeam} ${matchData.score.home}-${matchData.score.away} ${matchData.awayTeam}: basándome en los KPIs disponibles, el jugador con mayor impacto colectivo fue quien registró el Spatial Awareness Score más elevado combinado con Chemistry Score alto, generando líneas de pase que el equipo rival no pudo anticipar. La diferencia en Pressure Collapse Rate entre ambos equipos (promedio ${matchData.teamStats?.home?.pressureEvents || 38} vs ${matchData.teamStats?.away?.pressureEvents || 29} eventos de presión) explica en gran parte el resultado. Los datos de Fatigue Signature muestran que el rendimiento físico del equipo ganador se mantuvo más estable en los últimos 25 minutos, lo que resultó determinante.`,
};

function getMockPlayerResponse(playerData) {
  return (
    MOCK_PLAYER_RESPONSES[playerData.name] ||
    `${playerData.name} completó un partido sólido con un Spatial Awareness Score de ${playerData.spatialAwareness}/100, posicionándose ${playerData.spatialAwareness > 75 ? 'por encima' : 'en línea con'} el promedio de su posición (71). Su Scan Rate de ${playerData.scanRate} escaneos/min refleja ${playerData.scanRate > 3.5 ? 'una lectura táctica superior al promedio' : 'una lectura táctica estándar para su posición'}. ${playerData.keyMoment ? `El momento más destacado fue en el minuto ${playerData.keyMoment.minute}: "${playerData.keyMoment.description}", que tuvo un impacto ${playerData.keyMoment.impact} en el resultado final.` : ''} La variación de Fatigue Signature del ${playerData.fatigueSig}% en segunda mitad ${Math.abs(playerData.fatigueSig) > 15 ? 'es una señal de alerta que justifica una revisión de carga en el próximo microciclo' : 'está dentro de los parámetros normales para su posición'}.`
  );
}

// ---- Streaming real via API ----
async function streamMessages(body, onChunk) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]' || !jsonStr) continue;
      try {
        const event = JSON.parse(jsonStr);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const chunk = event.delta.text;
          fullText += chunk;
          onChunk(chunk);
        }
      } catch { /* skip malformed chunks */ }
    }
  }

  return fullText;
}

// ---- Player Analysis ----
export async function analyzePlayer(playerData, matchData, onChunk) {
  if (!getApiKey()) {
    return streamMock(getMockPlayerResponse(playerData), onChunk);
  }

  const keyMoment = playerData.keyMoment
    ? `Momento más destacado: minuto ${playerData.keyMoment.minute}, "${playerData.keyMoment.description}" (impacto: ${playerData.keyMoment.impact})`
    : '';

  const prompt = `Eres un analista táctico de élite de la Bundesliga con acceso a datos de tracking esquelético 3D.

Partido: ${matchData.homeTeam} ${matchData.score.home}-${matchData.score.away} ${matchData.awayTeam} (${matchData.competition})
Jugador: ${playerData.name} — ${playerData.position} — ${playerData.team}
Minutos: ${playerData.minutesPlayed} | Distancia: ${playerData.distanceCovered}km | Vel. máx: ${playerData.topSpeed}km/h

DATOS 3D:
- Spatial Awareness Score: ${playerData.spatialAwareness}/100 (promedio liga: 71)
- Court Vision Index: ${playerData.courtVisionIndex}/100 (promedio: 68)
- Sprint Value Score: ${playerData.sprintValueScore} sprints de alto valor
- Scan Rate: ${playerData.scanRate} escaneos/min (promedio: 3.1)
- Body Readiness Index: ${playerData.bodyReadinessIndex}/100
- Positioning EPA: ${playerData.positioningEPA > 0 ? '+' : ''}${playerData.positioningEPA}
- Pressure Collapse Rate: ${playerData.pressureCollapseRate}/100
- Fatigue Signature: ${playerData.fatigueSig}% en segunda mitad
- Chemistry Score: ${playerData.chemistryScore}/100 con ${playerData.chemistryPartner || 'compañero clave'}
- Coverage Shadow: ${playerData.coverageShadow}m²
- 3D Pressure Index: ${playerData.pressureIndex3D}/100
${keyMoment}

Análisis táctico de 4-5 oraciones, estilo analista de élite. Específico con números. Menciona el momento clave si existe. Incluye una recomendación táctica concreta al final. Responde en español.`;

  return streamMessages(
    { model: MODEL, max_tokens: 400, temperature: 0.7, messages: [{ role: 'user', content: prompt }] },
    onChunk
  );
}

// ---- Analyst Natural Language Query ----
export async function queryAnalyst(question, matchData, onChunk) {
  if (!getApiKey()) {
    const mockText = MOCK_ANALYST_RESPONSES.default(question, matchData);
    return streamMock(mockText, onChunk);
  }

  const playerSummaries = matchData.players.map(p => ({
    name: p.name, team: p.team, pos: p.position,
    spatialAwareness: p.spatialAwareness, sprintValue: p.sprintValueScore,
    fatigue: p.fatigueSig, scanRate: p.scanRate, pressureCollapse: p.pressureCollapseRate,
    posEPA: p.positioningEPA, distanceCovered: p.distanceCovered,
    goals: p.goals, assists: p.assists, minutesPlayed: p.minutesPlayed,
    bodyReadiness: p.bodyReadinessIndex, chemistry: p.chemistryScore,
    coverageShadow: p.coverageShadow, pressureIndex3D: p.pressureIndex3D, topSpeed: p.topSpeed,
  }));

  const prompt = `Eres un analista de datos de fútbol de élite. Partido: ${matchData.homeTeam} ${matchData.score.home}-${matchData.score.away} ${matchData.awayTeam}.

DATOS:
${JSON.stringify(playerSummaries, null, 2)}

ESTADÍSTICAS:
- ${matchData.homeTeam}: Posesión ${matchData.teamStats.home.possession}%, Tiros ${matchData.teamStats.home.shots} (${matchData.teamStats.home.shotsOnTarget} al arco)
- ${matchData.awayTeam}: Posesión ${matchData.teamStats.away.possession}%, Tiros ${matchData.teamStats.away.shots} (${matchData.teamStats.away.shotsOnTarget} al arco)

PREGUNTA: "${question}"

3-5 oraciones directas con datos exactos. Responde en el idioma de la pregunta.`;

  return streamMessages(
    { model: MODEL, max_tokens: 500, temperature: 0.7, messages: [{ role: 'user', content: prompt }] },
    onChunk
  );
}
