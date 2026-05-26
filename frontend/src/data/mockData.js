// ============================================================
// FIELD INTELLIGENCE — MOCK DATA
// 5 Bundesliga matches with full player KPI data
// ============================================================

// ---- Helper: seeded pseudo-random for reproducibility ----
function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randRange(rng, min, max) {
  return parseFloat((rng() * (max - min) + min).toFixed(2));
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ---- Player factory ----
function makePlayer(name, position, team, jerseyNumber, seed, overrides = {}) {
  const rng = seededRand(seed);
  const base = {
    name,
    position,
    team,
    jerseyNumber,
    spatialAwareness:    randInt(rng, 55, 95),
    courtVisionIndex:    randInt(rng, 50, 92),
    sprintValueScore:    randInt(rng, 2, 12),
    slipstreamPressure:  randInt(rng, 40, 88),
    positioningEPA:      randRange(rng, -1.5, 2.8),
    pressureCollapseRate: randInt(rng, 45, 90),
    launchAngle3D:       randInt(rng, 15, 55),
    coverageShadow:      randInt(rng, 120, 380),
    pressureIndex3D:     randInt(rng, 42, 88),
    chemistryScore:      randInt(rng, 60, 95),
    chemistryPartner:    '',
    fatigueSig:          randRange(rng, -25, -5),
    scanRate:            randRange(rng, 2.1, 5.8),
    bodyReadinessIndex:  randInt(rng, 58, 94),
    goals:               0,
    assists:             0,
    minutesPlayed:       randInt(rng, 60, 90),
    distanceCovered:     randRange(rng, 8.5, 13.2),
    topSpeed:            randRange(rng, 28.5, 36.8),
    keyMoment: {
      minute:      randInt(rng, 10, 88),
      description: 'Pressing coordinado que recuperó posesión en zona media',
      impact:      rng() > 0.5 ? 'high' : 'medium',
    },
  };
  return { ...base, ...overrides };
}

// ============================================================
// MATCH 1: Bayern München vs Borussia Dortmund (2-1)
// ============================================================
const match1Players = [
  // Bayern
  makePlayer('Thomas Müller',      'CAM', 'Bayern München', 25,  1001, {
    spatialAwareness: 87, scanRate: 4.2, fatigueSig: -12,
    courtVisionIndex: 84, sprintValueScore: 8, positioningEPA: 2.1,
    chemistryScore: 91, chemistryPartner: 'Joshua Kimmich',
    goals: 1, assists: 1, minutesPlayed: 90, distanceCovered: 11.8, topSpeed: 31.2,
    keyMoment: { minute: 67, description: 'Diagonal de 18m en 2.3s liberando zona central, generó el 2do gol', impact: 'high' },
  }),
  makePlayer('Joshua Kimmich',     'CDM', 'Bayern München', 6,   1002, {
    spatialAwareness: 82, scanRate: 4.8, pressureCollapseRate: 78,
    chemistryScore: 89, chemistryPartner: 'Thomas Müller',
    assists: 1, minutesPlayed: 90, distanceCovered: 12.4,
    keyMoment: { minute: 34, description: 'Intercepción de alto riesgo que cortó contraataque rival', impact: 'high' },
  }),
  makePlayer('Harry Kane',         'ST',  'Bayern München', 9,   1003, {
    sprintValueScore: 10, positioningEPA: 2.6, launchAngle3D: 38,
    goals: 2, minutesPlayed: 90, distanceCovered: 10.2, topSpeed: 34.1,
    keyMoment: { minute: 52, description: 'Disparo de bajo ángulo 3D al palo largo desde 22m', impact: 'high' },
  }),
  makePlayer('Leroy Sané',         'RW',  'Bayern München', 10,  1004, {
    sprintValueScore: 11, slipstreamPressure: 82, topSpeed: 36.1,
    assists: 1, minutesPlayed: 78, distanceCovered: 11.0,
    keyMoment: { minute: 21, description: 'Sprint de 60m a máxima velocidad desbordando al lateral', impact: 'high' },
  }),
  makePlayer('Leon Goretzka',      'CM',  'Bayern München', 8,   1005, {
    pressureCollapseRate: 74, coverageShadow: 280,
    minutesPlayed: 85, distanceCovered: 12.1,
    keyMoment: { minute: 55, description: 'Presión alta que forzó error del portero rival', impact: 'medium' },
  }),
  makePlayer('Dayot Upamecano',    'CB',  'Bayern München', 2,   1006, {
    coverageShadow: 340, pressureIndex3D: 81, bodyReadinessIndex: 88,
    minutesPlayed: 90, distanceCovered: 10.8,
    keyMoment: { minute: 78, description: 'Bloqueo aéreo 3D en zona de peligro, cabeza a 2.1m', impact: 'high' },
  }),
  makePlayer('Alphonso Davies',    'LB',  'Bayern München', 19,  1007, {
    sprintValueScore: 9, slipstreamPressure: 75, topSpeed: 35.8,
    minutesPlayed: 90, distanceCovered: 12.9,
    keyMoment: { minute: 14, description: 'Superposición con overlapping que liberó a Sané', impact: 'medium' },
  }),
  makePlayer('Serge Gnabry',       'LW',  'Bayern München', 7,   1008, {
    courtVisionIndex: 72, positioningEPA: 1.4,
    minutesPlayed: 72, distanceCovered: 9.7,
    keyMoment: { minute: 43, description: 'Combinación de 3 toques en espacio reducido con Müller', impact: 'medium' },
  }),
  makePlayer('Konrad Laimer',      'CM',  'Bayern München', 27,  1009, {
    pressureCollapseRate: 81, scanRate: 3.9,
    minutesPlayed: 88, distanceCovered: 12.3,
    keyMoment: { minute: 60, description: 'Recuperación de balón en zona alta con pressing sostenido', impact: 'medium' },
  }),
  makePlayer('Manuel Neuer',       'GK',  'Bayern München', 1,   1010, {
    coverageShadow: 380, bodyReadinessIndex: 92, pressureIndex3D: 55,
    minutesPlayed: 90, distanceCovered: 5.8,
    keyMoment: { minute: 82, description: 'Salida a 18m como líbero cortando pelota larga rival', impact: 'high' },
  }),
  makePlayer('Matthijs de Ligt',   'CB',  'Bayern München', 4,   1011, {
    coverageShadow: 315, pressureIndex3D: 76, bodyReadinessIndex: 85,
    minutesPlayed: 90, distanceCovered: 10.5,
    keyMoment: { minute: 37, description: 'Anticipo de cabeza en zona de penalti desactivando contraataque', impact: 'high' },
  }),
  // Dortmund
  makePlayer('Niclas Füllkrug',    'ST',  'Borussia Dortmund', 14, 1012, {
    launchAngle3D: 42, positioningEPA: 1.8, sprintValueScore: 7,
    goals: 1, minutesPlayed: 90, distanceCovered: 9.4, topSpeed: 33.2,
    keyMoment: { minute: 71, description: 'Remate de cabeza a 1.85m de altura con torsión de torso', impact: 'high' },
  }),
  makePlayer('Emre Can',           'CDM', 'Borussia Dortmund', 23, 1013, {
    pressureCollapseRate: 68, coverageShadow: 260,
    minutesPlayed: 90, distanceCovered: 11.2,
    keyMoment: { minute: 29, description: 'Corte defensivo evitando transición de Bayern en centro del campo', impact: 'medium' },
  }),
  makePlayer('Marco Reus',         'AM',  'Borussia Dortmund', 11, 1014, {
    courtVisionIndex: 79, chemistryScore: 83, chemistryPartner: 'Julian Brandt',
    minutesPlayed: 68, distanceCovered: 9.1,
    keyMoment: { minute: 58, description: 'Habilitación en espacio reducido con giro de 180° en 0.8s', impact: 'medium' },
  }),
  makePlayer('Julian Brandt',      'CM',  'Borussia Dortmund', 19, 1015, {
    courtVisionIndex: 81, spatialAwareness: 74,
    assists: 1, minutesPlayed: 90, distanceCovered: 11.5,
    keyMoment: { minute: 71, description: 'Asistencia con visión periférica para el gol de Füllkrug', impact: 'high' },
  }),
  makePlayer('Karim Adeyemi',      'LW',  'Borussia Dortmund', 27, 1016, {
    sprintValueScore: 10, topSpeed: 35.9, slipstreamPressure: 71,
    minutesPlayed: 82, distanceCovered: 11.1,
    keyMoment: { minute: 18, description: 'Carrera de 55m en transición superando a dos defensas', impact: 'high' },
  }),
  makePlayer('Mats Hummels',       'CB',  'Borussia Dortmund', 15, 1017, {
    coverageShadow: 295, bodyReadinessIndex: 80, pressureIndex3D: 69,
    minutesPlayed: 90, distanceCovered: 9.8,
    keyMoment: { minute: 45, description: 'Pase filtrado de 35m superando línea de presión alta bávara', impact: 'medium' },
  }),
  makePlayer('Nico Schlotterbeck', 'CB',  'Borussia Dortmund', 4,  1018, {
    coverageShadow: 270, pressureIndex3D: 65,
    minutesPlayed: 90, distanceCovered: 10.2,
    keyMoment: { minute: 62, description: 'Barrida en último momento que evitó gol cantado', impact: 'high' },
  }),
  makePlayer('Marcel Sabitzer',    'CM',  'Borussia Dortmund', 20, 1019, {
    pressureCollapseRate: 63, scanRate: 3.5,
    minutesPlayed: 78, distanceCovered: 10.7,
    keyMoment: { minute: 41, description: 'Transición rápida con 3 presiones encadenadas en 12s', impact: 'medium' },
  }),
  makePlayer('Ian Maatsen',        'LB',  'Borussia Dortmund', 22, 1020, {
    slipstreamPressure: 61, sprintValueScore: 6,
    minutesPlayed: 90, distanceCovered: 11.4,
    keyMoment: { minute: 25, description: 'Superposición ofensiva con proyección de 40m creando sobrenúmero', impact: 'medium' },
  }),
  makePlayer('Gregor Kobel',       'GK',  'Borussia Dortmund', 1,  1021, {
    coverageShadow: 350, bodyReadinessIndex: 86, pressureIndex3D: 52,
    minutesPlayed: 90, distanceCovered: 5.2,
    keyMoment: { minute: 73, description: 'Parada con el pie en posición de 1v1 reduciendo ángulo a 8°', impact: 'high' },
  }),
  makePlayer('Felix Nmecha',       'CM',  'Borussia Dortmund', 8,  1022, {
    spatialAwareness: 68, courtVisionIndex: 66,
    minutesPlayed: 82, distanceCovered: 10.9,
    keyMoment: { minute: 35, description: 'Llegada tardía al segundo palo con remate al travesaño', impact: 'medium' },
  }),
];

// ============================================================
// MATCH 2: Bayer Leverkusen vs RB Leipzig (1-1)
// ============================================================
const match2Players = [
  // Leverkusen
  makePlayer('Granit Xhaka',       'CDM', 'Bayer Leverkusen', 34, 2001, {
    pressureCollapseRate: 79, coverageShadow: 290, scanRate: 4.1,
    assists: 1, minutesPlayed: 90, distanceCovered: 11.8,
    keyMoment: { minute: 38, description: 'Control del ritmo con 7 presiones consecutivas en 90s', impact: 'high' },
  }),
  makePlayer('Florian Wirtz',      'AM',  'Bayer Leverkusen', 10, 2002, {
    courtVisionIndex: 88, spatialAwareness: 83, positioningEPA: 2.2,
    goals: 1, minutesPlayed: 90, distanceCovered: 10.5, topSpeed: 32.8,
    keyMoment: { minute: 55, description: 'Dribble en espacio de 2m² superando a 2 rivales en 1.4s', impact: 'high' },
  }),
  makePlayer('Victor Boniface',    'ST',  'Bayer Leverkusen', 19, 2003, {
    launchAngle3D: 44, sprintValueScore: 9, positioningEPA: 1.9,
    minutesPlayed: 85, distanceCovered: 10.1, topSpeed: 34.5,
    keyMoment: { minute: 22, description: 'Movimiento en profundidad de 25m liberando a Wirtz', impact: 'medium' },
  }),
  makePlayer('Alejandro Grimaldo', 'LB',  'Bayer Leverkusen', 12, 2004, {
    slipstreamPressure: 80, sprintValueScore: 8, topSpeed: 35.2,
    minutesPlayed: 90, distanceCovered: 12.2,
    keyMoment: { minute: 48, description: 'Cabalgada de 65m en overlapping con disparo al poste', impact: 'high' },
  }),
  makePlayer('Jonas Hofmann',      'RW',  'Bayer Leverkusen', 11, 2005, {
    courtVisionIndex: 75, sprintValueScore: 7,
    minutesPlayed: 77, distanceCovered: 10.3,
    keyMoment: { minute: 30, description: 'Combination play en banda derecha creando situación 2v1', impact: 'medium' },
  }),
  makePlayer('Piero Hincapié',     'CB',  'Bayer Leverkusen', 3,  2006, {
    coverageShadow: 310, bodyReadinessIndex: 82,
    minutesPlayed: 90, distanceCovered: 10.6,
    keyMoment: { minute: 66, description: 'Cobertura 3D cerrando ángulo de disparo en zona de penalti', impact: 'high' },
  }),
  makePlayer('Edmond Tapsoba',     'CB',  'Bayer Leverkusen', 5,  2007, {
    coverageShadow: 330, pressureIndex3D: 72,
    minutesPlayed: 90, distanceCovered: 10.9,
    keyMoment: { minute: 74, description: 'Bloqueo aereo con elevación de 0.8m en zona crítica', impact: 'high' },
  }),
  makePlayer('Robert Andrich',     'CM',  'Bayer Leverkusen', 8,  2008, {
    pressureCollapseRate: 76, scanRate: 3.8,
    minutesPlayed: 90, distanceCovered: 12.0,
    keyMoment: { minute: 44, description: 'Recuperación de posesión con pressing trampa coordinada', impact: 'medium' },
  }),
  makePlayer('Lukáš Hrádecký',     'GK',  'Bayer Leverkusen', 1,  2009, {
    coverageShadow: 360, bodyReadinessIndex: 89,
    minutesPlayed: 90, distanceCovered: 5.5,
    keyMoment: { minute: 82, description: 'Salida en 9m en condiciones de 1v1 reduciendo espacio a 0', impact: 'high' },
  }),
  makePlayer('Odilon Kossounou',   'CB',  'Bayer Leverkusen', 4,  2010, {
    coverageShadow: 298, pressureIndex3D: 68,
    minutesPlayed: 90, distanceCovered: 10.7,
    keyMoment: { minute: 58, description: 'Anticipación con aceleración de 0 a 28km/h en 2.1s', impact: 'medium' },
  }),
  makePlayer('Amine Adli',         'LW',  'Bayer Leverkusen', 37, 2011, {
    sprintValueScore: 6, slipstreamPressure: 65,
    minutesPlayed: 68, distanceCovered: 9.2,
    keyMoment: { minute: 17, description: 'Presión alta en salida de portero forzando error rival', impact: 'medium' },
  }),
  // Leipzig
  makePlayer('Xavi Simons',        'AM',  'RB Leipzig', 20, 2012, {
    courtVisionIndex: 85, spatialAwareness: 79, positioningEPA: 1.7,
    goals: 1, minutesPlayed: 90, distanceCovered: 11.0, topSpeed: 33.4,
    keyMoment: { minute: 61, description: 'Giro de 360° en espacio mínimo generando ocasión de gol', impact: 'high' },
  }),
  makePlayer('Benjamin Šeško',     'ST',  'RB Leipzig', 30, 2013, {
    launchAngle3D: 41, sprintValueScore: 8, topSpeed: 34.9,
    minutesPlayed: 88, distanceCovered: 9.8,
    keyMoment: { minute: 27, description: 'Disparo al ángulo con elevación de 32° desde 17m', impact: 'medium' },
  }),
  makePlayer('Dani Olmo',          'CM',  'RB Leipzig', 25, 2014, {
    courtVisionIndex: 82, pressureCollapseRate: 71,
    minutesPlayed: 83, distanceCovered: 11.3,
    keyMoment: { minute: 50, description: 'Progresión con 4 toques en 6m² bajo presión intensa', impact: 'medium' },
  }),
  makePlayer('Christoph Baumgartner', 'CM', 'RB Leipzig', 18, 2015, {
    scanRate: 3.7, pressureCollapseRate: 67,
    minutesPlayed: 79, distanceCovered: 10.8,
    keyMoment: { minute: 36, description: 'Recuperación en zona alta con cobertura de sombra 3D', impact: 'medium' },
  }),
  makePlayer('Lois Openda',        'ST',  'RB Leipzig', 13, 2016, {
    sprintValueScore: 11, slipstreamPressure: 74, topSpeed: 35.5,
    minutesPlayed: 90, distanceCovered: 11.4,
    keyMoment: { minute: 41, description: 'Sprint de profundidad de 45m activando línea defensiva rival', impact: 'high' },
  }),
  makePlayer('Willi Orban',        'CB',  'RB Leipzig', 4,  2017, {
    coverageShadow: 285, bodyReadinessIndex: 79,
    minutesPlayed: 90, distanceCovered: 10.1,
    keyMoment: { minute: 69, description: 'Marcaje zonal con cobertura de 280m² en zona propia', impact: 'medium' },
  }),
  makePlayer('Lukas Klostermann',  'RB',  'RB Leipzig', 5,  2018, {
    slipstreamPressure: 62, coverageShadow: 255,
    minutesPlayed: 90, distanceCovered: 11.0,
    keyMoment: { minute: 23, description: 'Anticipación en banda evitando desborde con sprint de 30m', impact: 'medium' },
  }),
  makePlayer('Kevin Kampl',        'CDM', 'RB Leipzig', 44, 2019, {
    pressureCollapseRate: 73, scanRate: 4.0,
    minutesPlayed: 90, distanceCovered: 12.1,
    keyMoment: { minute: 53, description: 'Intercepción con lectura anticipada de pase diagonal', impact: 'high' },
  }),
  makePlayer('Xaver Schlager',     'CM',  'RB Leipzig', 24, 2020, {
    pressureCollapseRate: 70, coverageShadow: 248,
    minutesPlayed: 86, distanceCovered: 11.7,
    keyMoment: { minute: 32, description: 'Box-to-box con 11km recorridos, manteniendo intensidad máxima', impact: 'medium' },
  }),
  makePlayer('Peter Gulacsi',      'GK',  'RB Leipzig', 1,  2021, {
    coverageShadow: 345, bodyReadinessIndex: 87,
    minutesPlayed: 90, distanceCovered: 5.3,
    keyMoment: { minute: 77, description: 'Doble parada en 1.2s con reorganización lateral rápida', impact: 'high' },
  }),
  makePlayer('David Raum',         'LB',  'RB Leipzig', 19, 2022, {
    slipstreamPressure: 69, sprintValueScore: 7,
    minutesPlayed: 90, distanceCovered: 12.0,
    keyMoment: { minute: 46, description: 'Proyección a banda con combinación y center al segundo palo', impact: 'medium' },
  }),
];

// ============================================================
// MATCH 3: Borussia Dortmund vs Bayern München (0-3)
// ============================================================
const match3Players = [
  // Dortmund
  makePlayer('Niclas Füllkrug',    'ST',  'Borussia Dortmund', 14, 3001, {
    positioningEPA: 0.3, sprintValueScore: 5, fatigueSig: -21,
    minutesPlayed: 78, distanceCovered: 9.0, topSpeed: 32.8,
    keyMoment: { minute: 48, description: 'Remate bloqueado tras movimiento de 20m a espacio libre', impact: 'medium' },
  }),
  makePlayer('Emre Can',           'CDM', 'Borussia Dortmund', 23, 3002, {
    pressureCollapseRate: 58, fatigueSig: -19,
    minutesPlayed: 90, distanceCovered: 11.5,
    keyMoment: { minute: 31, description: 'Corte tardío que generó ocasión de 1-0 para Bayern', impact: 'medium' },
  }),
  makePlayer('Marco Reus',         'AM',  'Borussia Dortmund', 11, 3003, {
    courtVisionIndex: 70, fatigueSig: -18,
    minutesPlayed: 61, distanceCovered: 8.2,
    keyMoment: { minute: 55, description: 'Pérdida de balón bajo presión alta que derivó en el 2-0', impact: 'high' },
  }),
  makePlayer('Julian Brandt',      'CM',  'Borussia Dortmund', 19, 3004, {
    spatialAwareness: 65, fatigueSig: -20,
    minutesPlayed: 90, distanceCovered: 10.8,
    keyMoment: { minute: 63, description: 'Intento de quiebre de presión en salida desde atrás', impact: 'medium' },
  }),
  makePlayer('Karim Adeyemi',      'LW',  'Borussia Dortmund', 27, 3005, {
    sprintValueScore: 8, topSpeed: 35.7, fatigueSig: -14,
    minutesPlayed: 90, distanceCovered: 10.9,
    keyMoment: { minute: 19, description: 'Única ocasión clara de gol tras desborde individual en banda', impact: 'high' },
  }),
  makePlayer('Mats Hummels',       'CB',  'Borussia Dortmund', 15, 3006, {
    coverageShadow: 275, fatigueSig: -17,
    minutesPlayed: 90, distanceCovered: 9.9,
    keyMoment: { minute: 37, description: 'Salida mal calculada que dejó espacio para el 2-0', impact: 'high' },
  }),
  makePlayer('Nico Schlotterbeck', 'CB',  'Borussia Dortmund', 4,  3007, {
    coverageShadow: 260, fatigueSig: -16,
    minutesPlayed: 90, distanceCovered: 10.2,
    keyMoment: { minute: 72, description: 'Marcaje perdido en segundo palo que generó el 3-0', impact: 'high' },
  }),
  makePlayer('Marcel Sabitzer',    'CM',  'Borussia Dortmund', 20, 3008, {
    pressureCollapseRate: 55, fatigueSig: -22,
    minutesPlayed: 75, distanceCovered: 10.1,
    keyMoment: { minute: 28, description: 'Presión coordinada que logró detener 3 ataques seguidos', impact: 'medium' },
  }),
  makePlayer('Ian Maatsen',        'LB',  'Borussia Dortmund', 22, 3009, {
    slipstreamPressure: 55, fatigueSig: -18,
    minutesPlayed: 90, distanceCovered: 10.9,
    keyMoment: { minute: 14, description: 'Overlap que creó la mejor chance del partido en el 1er tiempo', impact: 'high' },
  }),
  makePlayer('Gregor Kobel',       'GK',  'Borussia Dortmund', 1,  3010, {
    coverageShadow: 340, bodyReadinessIndex: 84, fatigueSig: -8,
    minutesPlayed: 90, distanceCovered: 5.1,
    keyMoment: { minute: 67, description: 'Serie de 3 paradas en 90 segundos evitando goleada mayor', impact: 'high' },
  }),
  makePlayer('Felix Nmecha',       'CM',  'Borussia Dortmund', 8,  3011, {
    spatialAwareness: 62, fatigueSig: -20,
    minutesPlayed: 80, distanceCovered: 10.5,
    keyMoment: { minute: 40, description: 'Intento de circulación rápida bajo presión de Bayern', impact: 'medium' },
  }),
  // Bayern
  makePlayer('Thomas Müller',      'CAM', 'Bayern München', 25,  3012, {
    spatialAwareness: 85, scanRate: 4.5, positioningEPA: 2.3,
    assists: 1, minutesPlayed: 88, distanceCovered: 11.2, topSpeed: 30.9,
    keyMoment: { minute: 61, description: 'Combinación de tercer hombre activando pressing en bloque alto', impact: 'high' },
  }),
  makePlayer('Joshua Kimmich',     'CDM', 'Bayern München', 6,   3013, {
    pressureCollapseRate: 82, scanRate: 5.0,
    assists: 1, minutesPlayed: 90, distanceCovered: 12.8,
    keyMoment: { minute: 33, description: '5 recuperaciones en 10min dominando zona central', impact: 'high' },
  }),
  makePlayer('Harry Kane',         'ST',  'Bayern München', 9,   3014, {
    sprintValueScore: 9, positioningEPA: 2.4, launchAngle3D: 36,
    goals: 2, minutesPlayed: 90, distanceCovered: 10.4, topSpeed: 33.7,
    keyMoment: { minute: 58, description: 'Hat-trick fallado: disparo al poste con ángulo de 38°', impact: 'high' },
  }),
  makePlayer('Leroy Sané',         'RW',  'Bayern München', 10,  3015, {
    sprintValueScore: 11, topSpeed: 36.3,
    goals: 1, minutesPlayed: 82, distanceCovered: 11.3,
    keyMoment: { minute: 24, description: 'Desborde individual completado a 34.1km/h marcando el 1-0', impact: 'high' },
  }),
  makePlayer('Leon Goretzka',      'CM',  'Bayern München', 8,   3016, {
    pressureCollapseRate: 78, coverageShadow: 275,
    minutesPlayed: 90, distanceCovered: 12.5,
    keyMoment: { minute: 45, description: 'Box-to-box dominando zona media con 8 recuperaciones', impact: 'medium' },
  }),
  makePlayer('Dayot Upamecano',    'CB',  'Bayern München', 2,   3017, {
    coverageShadow: 348, pressureIndex3D: 84,
    minutesPlayed: 90, distanceCovered: 10.7,
    keyMoment: { minute: 52, description: 'Pressing arriba con 1v1 ganado a Füllkrug a 30m de su portería', impact: 'medium' },
  }),
  makePlayer('Alphonso Davies',    'LB',  'Bayern München', 19,  3018, {
    sprintValueScore: 10, topSpeed: 35.6,
    assists: 1, minutesPlayed: 90, distanceCovered: 13.0,
    keyMoment: { minute: 70, description: 'Asistencia tras sprint de 70m marcando el tercer gol', impact: 'high' },
  }),
  makePlayer('Serge Gnabry',       'LW',  'Bayern München', 7,   3019, {
    courtVisionIndex: 73, positioningEPA: 1.5,
    minutesPlayed: 78, distanceCovered: 9.8,
    keyMoment: { minute: 42, description: 'Movimiento sin balón creando el espacio para el 2-0', impact: 'medium' },
  }),
  makePlayer('Konrad Laimer',      'CM',  'Bayern München', 27,  3020, {
    pressureCollapseRate: 80, scanRate: 3.7,
    minutesPlayed: 90, distanceCovered: 12.1,
    keyMoment: { minute: 57, description: 'Transición vertical en 4s desde recuperación a asistencia', impact: 'medium' },
  }),
  makePlayer('Manuel Neuer',       'GK',  'Bayern München', 1,   3021, {
    coverageShadow: 375, bodyReadinessIndex: 94,
    minutesPlayed: 90, distanceCovered: 5.9,
    keyMoment: { minute: 19, description: 'Parada de pies en 1v1 con Adeyemi manteniendo el 0-0', impact: 'high' },
  }),
  makePlayer('Matthijs de Ligt',   'CB',  'Bayern München', 4,   3022, {
    coverageShadow: 312, pressureIndex3D: 78,
    minutesPlayed: 90, distanceCovered: 10.4,
    keyMoment: { minute: 47, description: 'Anticipación táctica con lectura temprana de movimiento rival', impact: 'medium' },
  }),
];

// ============================================================
// MATCH 4: RB Leipzig vs Bayer Leverkusen (2-0)
// ============================================================
const match4Players = [
  // Leipzig
  makePlayer('Xavi Simons',        'AM',  'RB Leipzig', 20, 4001, {
    courtVisionIndex: 87, positioningEPA: 2.0,
    goals: 1, minutesPlayed: 90, distanceCovered: 11.1, topSpeed: 33.9,
    keyMoment: { minute: 34, description: 'Gol de volea con coordinación esquelética perfecta en 3D', impact: 'high' },
  }),
  makePlayer('Benjamin Šeško',     'ST',  'RB Leipzig', 30, 4002, {
    launchAngle3D: 46, sprintValueScore: 9,
    goals: 1, minutesPlayed: 90, distanceCovered: 10.0, topSpeed: 34.7,
    keyMoment: { minute: 67, description: 'Cabezazo a 1.92m de altura cerrando el marcador', impact: 'high' },
  }),
  makePlayer('Dani Olmo',          'CM',  'RB Leipzig', 25, 4003, {
    courtVisionIndex: 83, scanRate: 4.2,
    assists: 1, minutesPlayed: 88, distanceCovered: 11.4,
    keyMoment: { minute: 34, description: 'Asistencia precisa tras escaneo de 270° del campo', impact: 'high' },
  }),
  makePlayer('Christoph Baumgartner', 'CM', 'RB Leipzig', 18, 4004, {
    pressureCollapseRate: 69, scanRate: 3.6,
    minutesPlayed: 82, distanceCovered: 10.9,
    keyMoment: { minute: 51, description: 'Pressing en zona alta recuperando posesión en campo contrario', impact: 'medium' },
  }),
  makePlayer('Lois Openda',        'ST',  'RB Leipzig', 13, 4005, {
    sprintValueScore: 12, slipstreamPressure: 76, topSpeed: 35.8,
    minutesPlayed: 90, distanceCovered: 11.7,
    keyMoment: { minute: 22, description: 'Arrancada de 50m activando línea defensiva de Leverkusen', impact: 'high' },
  }),
  makePlayer('Willi Orban',        'CB',  'RB Leipzig', 4,  4006, {
    coverageShadow: 300, bodyReadinessIndex: 83,
    minutesPlayed: 90, distanceCovered: 10.3,
    keyMoment: { minute: 78, description: 'Cabezazo defensivo a 1.80m despejando en el segundo palo', impact: 'high' },
  }),
  makePlayer('Lukas Klostermann',  'RB',  'RB Leipzig', 5,  4007, {
    slipstreamPressure: 65, coverageShadow: 260,
    minutesPlayed: 90, distanceCovered: 11.2,
    keyMoment: { minute: 41, description: 'Anticipación en banda anulando a Grimaldo en superposición', impact: 'medium' },
  }),
  makePlayer('Kevin Kampl',        'CDM', 'RB Leipzig', 44, 4008, {
    pressureCollapseRate: 75, scanRate: 4.3,
    minutesPlayed: 90, distanceCovered: 12.3,
    keyMoment: { minute: 29, description: 'Control del ritmo con 94% pases acertados en segunda mitad', impact: 'medium' },
  }),
  makePlayer('Xaver Schlager',     'CM',  'RB Leipzig', 24, 4009, {
    pressureCollapseRate: 72, coverageShadow: 252,
    minutesPlayed: 90, distanceCovered: 11.9,
    keyMoment: { minute: 56, description: 'Transición rápida conectando líneas medias en 3 toques', impact: 'medium' },
  }),
  makePlayer('Peter Gulacsi',      'GK',  'RB Leipzig', 1,  4010, {
    coverageShadow: 355, bodyReadinessIndex: 90,
    minutesPlayed: 90, distanceCovered: 5.4,
    keyMoment: { minute: 71, description: 'Parada crucial al disparo de Wirtz a 1m por encima del suelo', impact: 'high' },
  }),
  makePlayer('David Raum',         'LB',  'RB Leipzig', 19, 4011, {
    slipstreamPressure: 71, sprintValueScore: 8,
    assists: 1, minutesPlayed: 90, distanceCovered: 12.1,
    keyMoment: { minute: 67, description: 'Centro al segundo palo para el gol de Šeško', impact: 'high' },
  }),
  // Leverkusen
  makePlayer('Granit Xhaka',       'CDM', 'Bayer Leverkusen', 34, 4012, {
    pressureCollapseRate: 68, fatigueSig: -16,
    minutesPlayed: 90, distanceCovered: 11.5,
    keyMoment: { minute: 44, description: 'Intento de organización bajo presión alta del Leipzig', impact: 'medium' },
  }),
  makePlayer('Florian Wirtz',      'AM',  'Bayer Leverkusen', 10, 4013, {
    courtVisionIndex: 84, fatigueSig: -13,
    minutesPlayed: 90, distanceCovered: 10.7, topSpeed: 32.5,
    keyMoment: { minute: 71, description: 'Disparo desviado con tiro libre con efecto a 22m', impact: 'medium' },
  }),
  makePlayer('Victor Boniface',    'ST',  'Bayer Leverkusen', 19, 4014, {
    sprintValueScore: 7, fatigueSig: -18,
    minutesPlayed: 82, distanceCovered: 9.7,
    keyMoment: { minute: 36, description: 'Movimiento de arrastre generando espacio para Hofmann', impact: 'medium' },
  }),
  makePlayer('Alejandro Grimaldo', 'LB',  'Bayer Leverkusen', 12, 4015, {
    slipstreamPressure: 72, sprintValueScore: 7, fatigueSig: -15,
    minutesPlayed: 90, distanceCovered: 11.8,
    keyMoment: { minute: 41, description: 'Superposición cortada por Klostermann perdiendo ventaja posicional', impact: 'medium' },
  }),
  makePlayer('Jonas Hofmann',      'RW',  'Bayer Leverkusen', 11, 4016, {
    sprintValueScore: 6, fatigueSig: -17,
    minutesPlayed: 74, distanceCovered: 10.0,
    keyMoment: { minute: 26, description: 'Presión individual forzando pase atrás al portero rival', impact: 'medium' },
  }),
  makePlayer('Piero Hincapié',     'CB',  'Bayer Leverkusen', 3,  4017, {
    coverageShadow: 298, fatigueSig: -19,
    minutesPlayed: 90, distanceCovered: 10.4,
    keyMoment: { minute: 67, description: 'Marca perdida en segundo palo que generó el 2-0', impact: 'high' },
  }),
  makePlayer('Edmond Tapsoba',     'CB',  'Bayer Leverkusen', 5,  4018, {
    coverageShadow: 318, fatigueSig: -14,
    minutesPlayed: 90, distanceCovered: 10.8,
    keyMoment: { minute: 52, description: 'Barrida en ultimo segundo evitando el 2-0 momentaneamente', impact: 'high' },
  }),
  makePlayer('Robert Andrich',     'CM',  'Bayer Leverkusen', 8,  4019, {
    pressureCollapseRate: 69, fatigueSig: -20,
    minutesPlayed: 86, distanceCovered: 11.7,
    keyMoment: { minute: 39, description: 'Pérdida en zona media que derivó en transición de Leipzig', impact: 'high' },
  }),
  makePlayer('Lukáš Hrádecký',     'GK',  'Bayer Leverkusen', 1,  4020, {
    coverageShadow: 348, bodyReadinessIndex: 85, fatigueSig: -9,
    minutesPlayed: 90, distanceCovered: 5.6,
    keyMoment: { minute: 34, description: 'Parada reflejos para el disparo de Simons antes del gol', impact: 'high' },
  }),
  makePlayer('Odilon Kossounou',   'CB',  'Bayer Leverkusen', 4,  4021, {
    coverageShadow: 285, fatigueSig: -16,
    minutesPlayed: 90, distanceCovered: 10.5,
    keyMoment: { minute: 62, description: 'Duel aéreo perdido con Šeško antes del 2-0', impact: 'high' },
  }),
];

// ============================================================
// MATCH 5: Bayern München vs Bayer Leverkusen (4-0)
// ============================================================
const match5Players = [
  // Bayern
  makePlayer('Thomas Müller',      'CAM', 'Bayern München', 25,  5001, {
    spatialAwareness: 89, scanRate: 4.6, positioningEPA: 2.5,
    goals: 1, assists: 2, minutesPlayed: 90, distanceCovered: 12.0, topSpeed: 31.5,
    keyMoment: { minute: 22, description: 'Tercer hombre liberado en zona interior generando el 1-0', impact: 'high' },
  }),
  makePlayer('Joshua Kimmich',     'CDM', 'Bayern München', 6,   5002, {
    pressureCollapseRate: 85, scanRate: 5.2, coverageShadow: 308,
    assists: 1, minutesPlayed: 90, distanceCovered: 12.9,
    keyMoment: { minute: 31, description: 'Pressing coordinado recuperando en zona alta derivando en gol', impact: 'high' },
  }),
  makePlayer('Harry Kane',         'ST',  'Bayern München', 9,   5003, {
    sprintValueScore: 11, positioningEPA: 2.8, launchAngle3D: 40,
    goals: 2, minutesPlayed: 90, distanceCovered: 10.8, topSpeed: 33.9,
    keyMoment: { minute: 58, description: 'Dobleta con 2 disparos al ángulo desde posición EPA óptima', impact: 'high' },
  }),
  makePlayer('Leroy Sané',         'RW',  'Bayern München', 10,  5004, {
    sprintValueScore: 12, slipstreamPressure: 85, topSpeed: 36.5,
    goals: 1, assists: 1, minutesPlayed: 86, distanceCovered: 11.7,
    keyMoment: { minute: 44, description: 'Desborde a 36.5km/h creando espacio para el 3-0 de Kane', impact: 'high' },
  }),
  makePlayer('Leon Goretzka',      'CM',  'Bayern München', 8,   5005, {
    pressureCollapseRate: 80, coverageShadow: 285,
    minutesPlayed: 90, distanceCovered: 12.7,
    keyMoment: { minute: 37, description: 'Dominancia física en duelos aéreos con 5/6 ganados', impact: 'medium' },
  }),
  makePlayer('Dayot Upamecano',    'CB',  'Bayern München', 2,   5006, {
    coverageShadow: 355, pressureIndex3D: 86,
    minutesPlayed: 90, distanceCovered: 10.9,
    keyMoment: { minute: 62, description: 'Cobertura 3D anulando amenaza aérea de Boniface', impact: 'medium' },
  }),
  makePlayer('Alphonso Davies',    'LB',  'Bayern München', 19,  5007, {
    sprintValueScore: 10, topSpeed: 35.9,
    minutesPlayed: 90, distanceCovered: 13.2,
    keyMoment: { minute: 49, description: 'Sprint de 75m end-to-end creando sobrenúmero en ataque', impact: 'high' },
  }),
  makePlayer('Serge Gnabry',       'LW',  'Bayern München', 7,   5008, {
    courtVisionIndex: 76, positioningEPA: 1.8,
    minutesPlayed: 80, distanceCovered: 10.2,
    keyMoment: { minute: 73, description: 'Movimiento sin balón liberando zona central para Müller', impact: 'medium' },
  }),
  makePlayer('Konrad Laimer',      'CM',  'Bayern München', 27,  5009, {
    pressureCollapseRate: 83, scanRate: 4.0,
    minutesPlayed: 90, distanceCovered: 12.4,
    keyMoment: { minute: 54, description: 'Recuperación de alta intensidad en zona de pressing', impact: 'medium' },
  }),
  makePlayer('Manuel Neuer',       'GK',  'Bayern München', 1,   5010, {
    coverageShadow: 372, bodyReadinessIndex: 93,
    minutesPlayed: 90, distanceCovered: 5.7,
    keyMoment: { minute: 81, description: 'Salida a 16m coordinada con línea defensiva para anudar el 4-0', impact: 'medium' },
  }),
  makePlayer('Matthijs de Ligt',   'CB',  'Bayern München', 4,   5011, {
    coverageShadow: 320, pressureIndex3D: 79,
    minutesPlayed: 90, distanceCovered: 10.6,
    keyMoment: { minute: 27, description: 'Anticipo de cabeza eliminando amenaza de Boniface en área', impact: 'high' },
  }),
  // Leverkusen
  makePlayer('Granit Xhaka',       'CDM', 'Bayer Leverkusen', 34, 5012, {
    pressureCollapseRate: 58, fatigueSig: -23,
    minutesPlayed: 75, distanceCovered: 10.8,
    keyMoment: { minute: 22, description: 'Marcaje perdido de Müller que derivó en el 1-0', impact: 'high' },
  }),
  makePlayer('Florian Wirtz',      'AM',  'Bayer Leverkusen', 10, 5013, {
    courtVisionIndex: 80, fatigueSig: -15,
    minutesPlayed: 90, distanceCovered: 10.4,
    keyMoment: { minute: 38, description: 'Mejor actuación de Leverkusen con 3 chances generadas', impact: 'medium' },
  }),
  makePlayer('Victor Boniface',    'ST',  'Bayer Leverkusen', 19, 5014, {
    sprintValueScore: 5, fatigueSig: -20,
    minutesPlayed: 74, distanceCovered: 9.1,
    keyMoment: { minute: 19, description: 'Disparo al poste con el marcador aún en 0-0', impact: 'high' },
  }),
  makePlayer('Alejandro Grimaldo', 'LB',  'Bayer Leverkusen', 12, 5015, {
    slipstreamPressure: 66, fatigueSig: -17,
    minutesPlayed: 90, distanceCovered: 11.3,
    keyMoment: { minute: 44, description: 'Superposición anulada por Sané en velocidad máxima', impact: 'medium' },
  }),
  makePlayer('Jonas Hofmann',      'RW',  'Bayer Leverkusen', 11, 5016, {
    sprintValueScore: 5, fatigueSig: -19,
    minutesPlayed: 68, distanceCovered: 9.5,
    keyMoment: { minute: 35, description: 'Presión individual evitando la construcción desde atrás de Bayern', impact: 'medium' },
  }),
  makePlayer('Piero Hincapié',     'CB',  'Bayer Leverkusen', 3,  5017, {
    coverageShadow: 280, fatigueSig: -21,
    minutesPlayed: 90, distanceCovered: 10.0,
    keyMoment: { minute: 62, description: 'Cobertura de último hombre evitando un 5-0', impact: 'high' },
  }),
  makePlayer('Edmond Tapsoba',     'CB',  'Bayer Leverkusen', 5,  5018, {
    coverageShadow: 305, fatigueSig: -18,
    minutesPlayed: 90, distanceCovered: 10.6,
    keyMoment: { minute: 58, description: 'Anticipó 1 de los 2 disparos de Kane, el 2do fue gol', impact: 'medium' },
  }),
  makePlayer('Robert Andrich',     'CM',  'Bayer Leverkusen', 8,  5019, {
    pressureCollapseRate: 62, fatigueSig: -22,
    minutesPlayed: 82, distanceCovered: 11.0,
    keyMoment: { minute: 31, description: 'Pérdida de balón en zona media que inició el 2-0', impact: 'high' },
  }),
  makePlayer('Lukáš Hrádecký',     'GK',  'Bayer Leverkusen', 1,  5020, {
    coverageShadow: 342, bodyReadinessIndex: 83, fatigueSig: -11,
    minutesPlayed: 90, distanceCovered: 5.4,
    keyMoment: { minute: 74, description: 'Parada especacular al tiro libre de Kimmich', impact: 'high' },
  }),
  makePlayer('Odilon Kossounou',   'CB',  'Bayer Leverkusen', 4,  5021, {
    coverageShadow: 274, fatigueSig: -19,
    minutesPlayed: 90, distanceCovered: 10.3,
    keyMoment: { minute: 49, description: 'Davies superó en velocidad imposibilitando el corte defensivo', impact: 'high' },
  }),
];

// ============================================================
// MATCHES EXPORT
// ============================================================

export const matches = [
  {
    id: 'BL_2024_001',
    homeTeam: 'Bayern München',
    awayTeam: 'Borussia Dortmund',
    score: { home: 2, away: 1 },
    date: '2024-04-06',
    competition: 'Bundesliga',
    stadium: 'Allianz Arena',
    players: match1Players,
    teamStats: {
      home: { possession: 62, shots: 18, shotsOnTarget: 8, passes: 612, pressureEvents: 47 },
      away: { possession: 38, shots: 9,  shotsOnTarget: 4, passes: 371, pressureEvents: 31 },
    },
    timeline: [
      { minute: 14,  type: 'tactical',  team: 'Bayern München',     description: 'Davies-Sané superposición en banda izquierda' },
      { minute: 18,  type: 'chance',    team: 'Borussia Dortmund',   description: 'Adeyemi contraataque, parada de Neuer' },
      { minute: 28,  type: 'pressing',  team: 'Bayern München',     description: 'Pressing alto sostenido por 4 minutos' },
      { minute: 34,  type: 'goal',      team: 'Bayern München',     description: 'Kane 1-0 — remate desde posición EPA +2.6' },
      { minute: 43,  type: 'chance',    team: 'Bayern München',     description: 'Müller+Gnabry combinación mano a mano fallada' },
      { minute: 52,  type: 'chance',    team: 'Bayern München',     description: 'Kane disparo al palo, ángulo 3D 38°' },
      { minute: 58,  type: 'tactical',  team: 'Borussia Dortmund',   description: 'Reus-Brandt combinación bajo presión' },
      { minute: 67,  type: 'goal',      team: 'Bayern München',     description: 'Müller 2-0 — diagonal de 18m en 2.3s' },
      { minute: 71,  type: 'goal',      team: 'Borussia Dortmund',   description: 'Füllkrug 2-1 — cabeza 1.85m de altura' },
      { minute: 78,  type: 'tactical',  team: 'Bayern München',     description: 'Upamecano bloqueo aéreo clave' },
      { minute: 82,  type: 'chance',    team: 'Borussia Dortmund',   description: 'Kobel parada en 1v1 por Neuer en jugada de Füllkrug' },
      { minute: 90,  type: 'pressing',  team: 'Bayern München',     description: 'Bloque defensivo final' },
    ],
  },
  {
    id: 'BL_2024_002',
    homeTeam: 'Bayer Leverkusen',
    awayTeam: 'RB Leipzig',
    score: { home: 1, away: 1 },
    date: '2024-04-13',
    competition: 'Bundesliga',
    stadium: 'BayArena',
    players: match2Players,
    teamStats: {
      home: { possession: 54, shots: 14, shotsOnTarget: 6, passes: 534, pressureEvents: 43 },
      away: { possession: 46, shots: 12, shotsOnTarget: 5, passes: 452, pressureEvents: 38 },
    },
    timeline: [
      { minute: 17,  type: 'pressing',  team: 'Bayer Leverkusen', description: 'Adli presión alta forzando error del portero' },
      { minute: 22,  type: 'tactical',  team: 'Bayer Leverkusen', description: 'Boniface movimiento en profundidad liberando a Wirtz' },
      { minute: 27,  type: 'chance',    team: 'RB Leipzig',       description: 'Šeško disparo con ángulo 32° al palo' },
      { minute: 36,  type: 'chance',    team: 'RB Leipzig',       description: 'Openda arrancada de 50m sin ocasión de gol' },
      { minute: 38,  type: 'tactical',  team: 'Bayer Leverkusen', description: 'Xhaka control de ritmo 7 presiones en 90s' },
      { minute: 48,  type: 'chance',    team: 'Bayer Leverkusen', description: 'Grimaldo disparo al poste desde 65m' },
      { minute: 55,  type: 'goal',      team: 'Bayer Leverkusen', description: 'Wirtz 1-0 — dribble 2 rivales, tiro preciso' },
      { minute: 61,  type: 'goal',      team: 'RB Leipzig',       description: 'Simons 1-1 — giro 360° gol de nivel Bundesliga' },
      { minute: 66,  type: 'tactical',  team: 'Bayer Leverkusen', description: 'Hincapié cobertura 3D cerrando ángulo' },
      { minute: 74,  type: 'chance',    team: 'Bayer Leverkusen', description: 'Tapsoba bloqueo aéreo evitando 1-2' },
      { minute: 77,  type: 'chance',    team: 'RB Leipzig',       description: 'Gulacsi doble parada en 1.2 segundos' },
      { minute: 82,  type: 'pressing',  team: 'Bayer Leverkusen', description: 'Último asalto sin resultado' },
    ],
  },
  {
    id: 'BL_2024_003',
    homeTeam: 'Borussia Dortmund',
    awayTeam: 'Bayern München',
    score: { home: 0, away: 3 },
    date: '2024-05-04',
    competition: 'Bundesliga',
    stadium: 'Signal Iduna Park',
    players: match3Players,
    teamStats: {
      home: { possession: 35, shots: 8,  shotsOnTarget: 3, passes: 342, pressureEvents: 25 },
      away: { possession: 65, shots: 21, shotsOnTarget: 11, passes: 634, pressureEvents: 52 },
    },
    timeline: [
      { minute: 14,  type: 'tactical',  team: 'Borussia Dortmund', description: 'Maatsen overlap mejor ocasión del 1er tiempo' },
      { minute: 19,  type: 'chance',    team: 'Borussia Dortmund', description: 'Adeyemi 1v1 parada de Neuer con los pies' },
      { minute: 24,  type: 'goal',      team: 'Bayern München',    description: 'Sané 0-1 — desborde a 34.1km/h' },
      { minute: 33,  type: 'pressing',  team: 'Bayern München',    description: 'Kimmich 5 recuperaciones en 10 minutos' },
      { minute: 37,  type: 'tactical',  team: 'Borussia Dortmund', description: 'Hummels pase filtrado de 35m sin éxito' },
      { minute: 47,  type: 'tactical',  team: 'Bayern München',    description: 'De Ligt anticipación eliminando amenaza' },
      { minute: 58,  type: 'goal',      team: 'Bayern München',    description: 'Kane 0-2 — disparo EPA posición +2.4' },
      { minute: 63,  type: 'tactical',  team: 'Borussia Dortmund', description: 'Brandt intento de ruptura sin éxito' },
      { minute: 67,  type: 'chance',    team: 'Borussia Dortmund', description: 'Kobel serie 3 paradas en 90s' },
      { minute: 70,  type: 'goal',      team: 'Bayern München',    description: 'Gol 0-3 — asistencia Davies tras 70m sprint' },
      { minute: 72,  type: 'chance',    team: 'Borussia Dortmund', description: 'Schlotterbeck marcaje perdido antes del 3-0' },
      { minute: 82,  type: 'pressing',  team: 'Borussia Dortmund', description: 'Pressing desesperado sin resultado' },
    ],
  },
  {
    id: 'BL_2024_004',
    homeTeam: 'RB Leipzig',
    awayTeam: 'Bayer Leverkusen',
    score: { home: 2, away: 0 },
    date: '2024-05-11',
    competition: 'Bundesliga',
    stadium: 'Red Bull Arena',
    players: match4Players,
    teamStats: {
      home: { possession: 48, shots: 15, shotsOnTarget: 7, passes: 471, pressureEvents: 41 },
      away: { possession: 52, shots: 11, shotsOnTarget: 4, passes: 508, pressureEvents: 36 },
    },
    timeline: [
      { minute: 19,  type: 'chance',    team: 'Bayer Leverkusen', description: 'Boniface disparo al poste con 0-0' },
      { minute: 22,  type: 'tactical',  team: 'RB Leipzig',       description: 'Openda arrancada de 50m activando línea' },
      { minute: 29,  type: 'pressing',  team: 'RB Leipzig',       description: 'Kampl control del ritmo 94% pases' },
      { minute: 34,  type: 'goal',      team: 'RB Leipzig',       description: 'Simons 1-0 — volea con coordinación 3D perfecta' },
      { minute: 41,  type: 'tactical',  team: 'Bayer Leverkusen', description: 'Grimaldo superposición cortada por Klostermann' },
      { minute: 44,  type: 'pressing',  team: 'RB Leipzig',       description: 'Baumgartner pressing zona alta recuperación' },
      { minute: 51,  type: 'tactical',  team: 'RB Leipzig',       description: 'Schlager transición vertical en 3 toques' },
      { minute: 56,  type: 'chance',    team: 'Bayer Leverkusen', description: 'Andrich pérdida derivando en transición Leipzig' },
      { minute: 67,  type: 'goal',      team: 'RB Leipzig',       description: 'Šeško 2-0 — cabeza 1.92m de altura' },
      { minute: 71,  type: 'chance',    team: 'Bayer Leverkusen', description: 'Wirtz disparo libre parada Gulacsi' },
      { minute: 78,  type: 'tactical',  team: 'RB Leipzig',       description: 'Orban cabezazo defensivo en zona de peligro' },
      { minute: 84,  type: 'pressing',  team: 'Bayer Leverkusen', description: 'Asalto final sin resultado' },
    ],
  },
  {
    id: 'BL_2024_005',
    homeTeam: 'Bayern München',
    awayTeam: 'Bayer Leverkusen',
    score: { home: 4, away: 0 },
    date: '2024-05-18',
    competition: 'Bundesliga',
    stadium: 'Allianz Arena',
    players: match5Players,
    teamStats: {
      home: { possession: 67, shots: 24, shotsOnTarget: 13, passes: 672, pressureEvents: 56 },
      away: { possession: 33, shots: 7,  shotsOnTarget: 2, passes: 328, pressureEvents: 24 },
    },
    timeline: [
      { minute: 19,  type: 'chance',    team: 'Bayer Leverkusen', description: 'Boniface disparo al poste — mejor opción visitante' },
      { minute: 22,  type: 'goal',      team: 'Bayern München',   description: 'Müller 1-0 — tercer hombre en zona interior' },
      { minute: 27,  type: 'tactical',  team: 'Bayern München',   description: 'De Ligt anticipo de cabeza Boniface área' },
      { minute: 31,  type: 'goal',      team: 'Bayern München',   description: 'Kimmich 2-0 — pressing recuperación zona alta' },
      { minute: 37,  type: 'pressing',  team: 'Bayern München',   description: 'Goretzka dominancia física 5/6 duelos aéreos' },
      { minute: 44,  type: 'goal',      team: 'Bayern München',   description: 'Kane 3-0 — tras desborde Sané a 36.5km/h' },
      { minute: 49,  type: 'chance',    team: 'Bayern München',   description: 'Davies sprint 75m creando sobrenúmero' },
      { minute: 54,  type: 'pressing',  team: 'Bayern München',   description: 'Laimer recuperación alta intensidad zona pressing' },
      { minute: 58,  type: 'goal',      team: 'Bayern München',   description: 'Kane 4-0 — EPA óptima posición ángulo 40°' },
      { minute: 62,  type: 'tactical',  team: 'Bayern München',   description: 'Upamecano cobertura 3D anulando Boniface' },
      { minute: 73,  type: 'tactical',  team: 'Bayer Leverkusen', description: 'Wirtz mejor actuación con 3 chances creadas' },
      { minute: 81,  type: 'pressing',  team: 'Bayern München',   description: 'Neuer sweeper-keeper 16m coordinado' },
    ],
  },
];

// Helper exports
export const getAllPlayersForMatch = (matchId) => {
  const match = matches.find(m => m.id === matchId);
  return match ? match.players : [];
};

export const getMatchById = (matchId) => matches.find(m => m.id === matchId);

export const getTeamAverages = (players, team) => {
  const teamPlayers = players.filter(p => p.team === team);
  if (!teamPlayers.length) return {};
  const avg = (key) => parseFloat((teamPlayers.reduce((s, p) => s + (p[key] || 0), 0) / teamPlayers.length).toFixed(1));
  return {
    spatialAwareness:     avg('spatialAwareness'),
    courtVisionIndex:     avg('courtVisionIndex'),
    sprintValueScore:     avg('sprintValueScore'),
    slipstreamPressure:   avg('slipstreamPressure'),
    pressureCollapseRate: avg('pressureCollapseRate'),
    pressureIndex3D:      avg('pressureIndex3D'),
    chemistryScore:       avg('chemistryScore'),
    fatigueSig:           avg('fatigueSig'),
    scanRate:             avg('scanRate'),
    bodyReadinessIndex:   avg('bodyReadinessIndex'),
    distanceCovered:      avg('distanceCovered'),
    topSpeed:             Math.max(...teamPlayers.map(p => p.topSpeed || 0)),
  };
};

export const KPI_META = {
  spatialAwareness:     { label: 'Spatial Awareness',      unit: '/100',  benchmark: 71,  description: 'Voronoi 3D — espacio libre creado sin balón' },
  courtVisionIndex:     { label: 'Court Vision Index',     unit: '/100',  benchmark: 68,  description: '% tiempo en zona de recepción óptima' },
  sprintValueScore:     { label: 'Sprint Value Score',     unit: 'sprints', benchmark: 5.2, description: 'Valor táctico de aceleraciones de alto impacto' },
  slipstreamPressure:   { label: 'Slipstream Pressure',   unit: '/100',  benchmark: 62,  description: 'Arrastre de marcadores liberando compañeros' },
  positioningEPA:       { label: 'Positioning EPA',        unit: 'pts',   benchmark: 0.8, description: 'Expected Points Added según posición 3D pre-jugada' },
  pressureCollapseRate: { label: 'Pressure Collapse Rate', unit: '/100',  benchmark: 65,  description: 'Velocidad de colapso del espacio rival' },
  launchAngle3D:        { label: 'Launch Angle 3D',        unit: '°',     benchmark: 32,  description: 'Ángulo real del remate en 3D Statcast' },
  coverageShadow:       { label: 'Coverage Shadow',        unit: 'm²',    benchmark: 248, description: 'Zona de influencia defensiva proyectada en cono 3D' },
  pressureIndex3D:      { label: 'Pressure Index 3D',      unit: '/100',  benchmark: 64,  description: 'Vector de presión tridimensional X+Y+Z normalizado' },
  chemistryScore:       { label: 'Chemistry Score',        unit: '/100',  benchmark: 72,  description: 'Correlación de movimientos entre pares de jugadores' },
  fatigueSig:           { label: 'Fatigue Signature',      unit: '%',     benchmark: -14, description: 'Degradación de métricas en segunda mitad' },
  scanRate:             { label: 'Scan Rate',               unit: 'esc/m', benchmark: 3.1, description: 'Rotaciones de cabeza >15° por minuto' },
  bodyReadinessIndex:   { label: 'Body Readiness Index',   unit: '/100',  benchmark: 74,  description: 'Score de postura esquelética pre-recepción' },
};
