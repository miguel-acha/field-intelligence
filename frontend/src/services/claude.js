// ============================================================
// FIELD INTELLIGENCE — Claude AI Service
// Direct browser calls to Anthropic API
// Requires VITE_ANTHROPIC_API_KEY in .env
// ============================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

function getApiKey() {
  return import.meta.env.VITE_ANTHROPIC_API_KEY;
}

async function streamMessages(body, onChunk) {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('NO_API_KEY');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
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
    buffer = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      if (!jsonStr) continue;

      try {
        const event = JSON.parse(jsonStr);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const chunk = event.delta.text;
          fullText += chunk;
          onChunk(chunk);
        }
      } catch {
        // skip malformed JSON chunks
      }
    }
  }

  return fullText;
}

// ---- Player Analysis ----
export async function analyzePlayer(playerData, matchData, onChunk) {
  const keyMoment = playerData.keyMoment
    ? `Momento más destacado: minuto ${playerData.keyMoment.minute}, "${playerData.keyMoment.description}" (impacto: ${playerData.keyMoment.impact})`
    : '';

  const fatigueNote = playerData.fatigueSig
    ? `Fatigue Signature: ${playerData.fatigueSig}% en segunda mitad`
    : '';

  const prompt = `Eres un analista táctico de élite de la Bundesliga. Tienes acceso a datos de tracking esquelético 3D de jugadores — el tipo de tecnología que antes era exclusiva de los mejores clubes del mundo.

Partido: ${matchData.homeTeam} ${matchData.score.home}-${matchData.score.away} ${matchData.awayTeam} (${matchData.competition})
Jugador: ${playerData.name} — ${playerData.position} — ${playerData.team}
Minutos jugados: ${playerData.minutesPlayed} | Distancia: ${playerData.distanceCovered}km | Velocidad máx: ${playerData.topSpeed}km/h

DATOS DE TRACKING 3D:
- Spatial Awareness Score: ${playerData.spatialAwareness}/100 (promedio liga: 71)
- Court Vision Index: ${playerData.courtVisionIndex}/100 (promedio posición: 68)
- Sprint Value Score: ${playerData.sprintValueScore} sprints de alto valor (promedio: 5.2)
- Slipstream Pressure: ${playerData.slipstreamPressure}/100 (arrastre de marcadores)
- Positioning EPA: ${playerData.positioningEPA > 0 ? '+' : ''}${playerData.positioningEPA} puntos esperados
- Pressure Collapse Rate: ${playerData.pressureCollapseRate}/100 (velocidad de colapso espacial)
- Scan Rate: ${playerData.scanRate} escaneos/min (promedio: 3.1)
- Body Readiness Index: ${playerData.bodyReadinessIndex}/100 (postura pre-recepción)
- Chemistry Score: ${playerData.chemistryScore}/100 con ${playerData.chemistryPartner || 'compañero clave'}
- Coverage Shadow: ${playerData.coverageShadow}m² (zona de influencia defensiva)
- 3D Pressure Index: ${playerData.pressureIndex3D}/100
${fatigueNote}
${keyMoment}

Genera un análisis táctico profundo de 4-5 oraciones como lo haría un analista de élite real. Sé extremadamente específico con los números. Menciona el momento clave del partido si existe. Incluye una recomendación táctica o de gestión de cargas concreta al final. Responde en español.`;

  return streamMessages(
    {
      model: MODEL,
      max_tokens: 400,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    },
    onChunk
  );
}

// ---- Analyst Natural Language Query ----
export async function queryAnalyst(question, matchData, onChunk) {
  // Build a compact data summary for context
  const playerSummaries = matchData.players.map(p => ({
    name: p.name,
    team: p.team,
    pos: p.position,
    spatialAwareness: p.spatialAwareness,
    sprintValue: p.sprintValueScore,
    fatigue: p.fatigueSig,
    scanRate: p.scanRate,
    pressureCollapse: p.pressureCollapseRate,
    posEPA: p.positioningEPA,
    distanceCovered: p.distanceCovered,
    goals: p.goals,
    assists: p.assists,
    minutesPlayed: p.minutesPlayed,
    bodyReadiness: p.bodyReadinessIndex,
    chemistry: p.chemistryScore,
    coverageShadow: p.coverageShadow,
    pressureIndex3D: p.pressureIndex3D,
    topSpeed: p.topSpeed,
  }));

  const prompt = `Eres un analista de datos de fútbol de élite. Tienes acceso a datos de tracking esquelético 3D del partido ${matchData.homeTeam} ${matchData.score.home}-${matchData.score.away} ${matchData.awayTeam}.

DATOS COMPLETOS DEL PARTIDO:
${JSON.stringify(playerSummaries, null, 2)}

ESTADÍSTICAS DE EQUIPO:
- ${matchData.homeTeam}: Posesión ${matchData.teamStats.home.possession}%, Tiros ${matchData.teamStats.home.shots} (${matchData.teamStats.home.shotsOnTarget} al arco), Pases ${matchData.teamStats.home.passes}, Eventos de presión: ${matchData.teamStats.home.pressureEvents}
- ${matchData.awayTeam}: Posesión ${matchData.teamStats.away.possession}%, Tiros ${matchData.teamStats.away.shots} (${matchData.teamStats.away.shotsOnTarget} al arco), Pases ${matchData.teamStats.away.passes}, Eventos de presión: ${matchData.teamStats.away.pressureEvents}

PREGUNTA DEL ANALISTA: "${question}"

Responde la pregunta con precisión usando los datos exactos disponibles. Sé específico con nombres y números. Si la pregunta es en español, responde en español. Si es en inglés, responde en inglés. Limítate a 3-5 oraciones directas y útiles.`;

  return streamMessages(
    {
      model: MODEL,
      max_tokens: 500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    },
    onChunk
  );
}
