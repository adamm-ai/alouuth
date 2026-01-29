/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEST SYSTÈME RAG - AMINI ACADEMY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce script teste:
 * 1. La connexion API
 * 2. La structure des données
 * 3. Un prototype de système RAG
 * 4. La gestion de mémoire
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bold}═══ ${msg} ═══${colors.reset}\n`),
  data: (label, data) => console.log(`${colors.yellow}${label}:${colors.reset}`, JSON.stringify(data, null, 2)),
  table: (data) => console.table(data),
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: CONNEXION BASE DE DONNÉES
// ═══════════════════════════════════════════════════════════════════════════

async function testDatabaseConnection() {
  log.section('TEST 1: CONNEXION BASE DE DONNÉES');

  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    log.success('Connexion PostgreSQL établie');
    log.info(`Heure serveur: ${result.rows[0].current_time}`);
    log.info(`Version: ${result.rows[0].pg_version.split(',')[0]}`);
    return true;
  } catch (error) {
    log.error(`Échec connexion: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: ANALYSE STRUCTURE DES DONNÉES
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeDataStructure() {
  log.section('TEST 2: ANALYSE STRUCTURE DES DONNÉES');

  try {
    // Récupérer toutes les tables
    const tablesResult = await pool.query(`
      SELECT table_name,
             (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    log.success(`${tablesResult.rows.length} tables trouvées`);

    const schema = {};

    for (const table of tablesResult.rows) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);

      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);

      schema[table.table_name] = {
        rowCount: parseInt(countResult.rows[0].count),
        columns: columnsResult.rows.map(c => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
          default: c.column_default
        }))
      };

      log.info(`Table: ${table.table_name} (${schema[table.table_name].rowCount} rows, ${columnsResult.rows.length} columns)`);
    }

    return schema;
  } catch (error) {
    log.error(`Échec analyse: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: EXTRACTION DES DONNÉES POUR RAG
// ═══════════════════════════════════════════════════════════════════════════

async function extractDataForRAG() {
  log.section('TEST 3: EXTRACTION DES DONNÉES POUR RAG');

  const ragData = {
    documents: [],
    chunks: [],
    metadata: {}
  };

  try {
    // 1. Extraire les cours
    const coursesResult = await pool.query(`
      SELECT id, title, description, level, total_duration, thumbnail_url
      FROM courses
      ORDER BY level, title
    `);

    log.success(`${coursesResult.rows.length} cours extraits`);

    for (const course of coursesResult.rows) {
      ragData.documents.push({
        id: `course_${course.id}`,
        type: 'course',
        title: course.title,
        content: `${course.title}. ${course.description || ''}. Niveau: ${course.level}. Durée: ${course.total_duration || 'N/A'}`,
        metadata: {
          level: course.level,
          duration: course.total_duration,
          thumbnail: course.thumbnail_url
        }
      });
    }

    // 2. Extraire les leçons
    const lessonsResult = await pool.query(`
      SELECT l.id, l.title, l.description, l.type, l.duration_min, l.content,
             c.title as course_title, c.level as course_level
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      ORDER BY c.level, l.order_index
    `);

    log.success(`${lessonsResult.rows.length} leçons extraites`);

    for (const lesson of lessonsResult.rows) {
      const content = `Leçon: ${lesson.title}. Cours: ${lesson.course_title}. ${lesson.description || ''}. Type: ${lesson.type}. Durée: ${lesson.duration_min} min. ${lesson.content || ''}`;

      ragData.documents.push({
        id: `lesson_${lesson.id}`,
        type: 'lesson',
        title: lesson.title,
        content: content,
        metadata: {
          courseTitle: lesson.course_title,
          courseLevel: lesson.course_level,
          lessonType: lesson.type,
          duration: lesson.duration_min
        }
      });

      // Chunking simple (512 chars avec overlap de 50)
      const chunks = chunkText(content, 512, 50);
      chunks.forEach((chunk, idx) => {
        ragData.chunks.push({
          id: `lesson_${lesson.id}_chunk_${idx}`,
          documentId: `lesson_${lesson.id}`,
          content: chunk,
          position: idx,
          tokenCount: estimateTokens(chunk)
        });
      });
    }

    // 3. Extraire les utilisateurs (stats agrégées)
    const usersResult = await pool.query(`
      SELECT
        ministry,
        COUNT(*) as user_count,
        COUNT(CASE WHEN role = 'LEARNER' THEN 1 END) as learners,
        COUNT(CASE WHEN role = 'SUPERUSER' THEN 1 END) as superusers,
        COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
      FROM users
      WHERE is_approved = true
      GROUP BY ministry
    `);

    log.success(`${usersResult.rows.length} ministères avec utilisateurs`);

    ragData.metadata = {
      totalDocuments: ragData.documents.length,
      totalChunks: ragData.chunks.length,
      ministryStats: usersResult.rows,
      extractedAt: new Date().toISOString()
    };

    return ragData;
  } catch (error) {
    log.error(`Échec extraction: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: SIMULATION RECHERCHE VECTORIELLE
// ═══════════════════════════════════════════════════════════════════════════

async function testVectorSearch(ragData, query) {
  log.section('TEST 4: SIMULATION RECHERCHE VECTORIELLE');

  log.info(`Query: "${query}"`);

  // Simulation de recherche par mots-clés (sans vrai embedding)
  const queryTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);

  const scores = ragData.chunks.map(chunk => {
    const content = chunk.content.toLowerCase();
    let score = 0;

    queryTerms.forEach(term => {
      if (content.includes(term)) {
        score += content.split(term).length - 1;
      }
    });

    // Boost pour titre exact
    const doc = ragData.documents.find(d => d.id === chunk.documentId);
    if (doc && doc.title.toLowerCase().includes(query.toLowerCase())) {
      score += 10;
    }

    return { ...chunk, score, document: doc };
  });

  // Tri par score et top 5
  const topResults = scores
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  log.success(`${topResults.length} résultats pertinents trouvés`);

  topResults.forEach((result, idx) => {
    console.log(`\n${colors.yellow}[${idx + 1}] Score: ${result.score}${colors.reset}`);
    console.log(`${colors.dim}Document: ${result.document?.title || 'N/A'}${colors.reset}`);
    console.log(`${colors.dim}Extrait: ${result.content.substring(0, 150)}...${colors.reset}`);
  });

  return topResults;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: SIMULATION GÉNÉRATION RÉPONSE
// ═══════════════════════════════════════════════════════════════════════════

async function simulateRAGResponse(query, context) {
  log.section('TEST 5: SIMULATION GÉNÉRATION RÉPONSE (RAG)');

  const contextText = context
    .map(c => c.content)
    .join('\n\n---\n\n');

  const prompt = `
SYSTÈME: Tu es un assistant pour Amini Academy / Bajan-X, une plateforme de formation
pour les fonctionnaires de la Barbade.

CONTEXTE DOCUMENTAIRE:
${contextText}

INSTRUCTIONS:
- Réponds en te basant UNIQUEMENT sur le contexte fourni
- Si l'information n'est pas disponible, dis-le
- Sois concis et professionnel

QUESTION: ${query}

RÉPONSE:`;

  log.info('Prompt construit avec contexte');
  console.log(`\n${colors.magenta}─── PROMPT RAG ───${colors.reset}`);
  console.log(colors.dim + prompt.substring(0, 500) + '...' + colors.reset);

  // Simulation de réponse (sans vrai LLM)
  const simulatedResponse = `Basé sur les informations disponibles dans Amini Academy:

${context.map(c => `• ${c.document?.title || 'Document'}: ${c.content.substring(0, 100)}...`).join('\n')}

Cette réponse est générée à partir de ${context.length} documents pertinents trouvés dans la base de connaissances.`;

  console.log(`\n${colors.green}─── RÉPONSE SIMULÉE ───${colors.reset}`);
  console.log(simulatedResponse);

  return {
    response: simulatedResponse,
    sources: context.map(c => ({
      id: c.documentId,
      title: c.document?.title,
      relevanceScore: c.score
    })),
    tokensUsed: {
      prompt: estimateTokens(prompt),
      completion: estimateTokens(simulatedResponse),
      total: estimateTokens(prompt) + estimateTokens(simulatedResponse)
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 6: GESTION DE MÉMOIRE
// ═══════════════════════════════════════════════════════════════════════════

function testMemoryManagement() {
  log.section('TEST 6: GESTION DE MÉMOIRE CONVERSATIONNELLE');

  const memorySystem = {
    workingMemory: {
      maxTokens: 4096,
      messages: [],
      currentTokens: 0
    },
    sessionMemory: {
      maxTokens: 16000,
      summary: null,
      keyPoints: []
    }
  };

  // Simuler une conversation
  const conversation = [
    { role: 'user', content: 'Quels sont les cours disponibles?' },
    { role: 'assistant', content: 'Amini Academy propose plusieurs cours pour les fonctionnaires, organisés en 3 niveaux: Débutant, Intermédiaire et Avancé. Chaque niveau contient des modules spécifiques sur le leadership, la gestion et l\'innovation.' },
    { role: 'user', content: 'Comment puis-je m\'inscrire au niveau intermédiaire?' },
    { role: 'assistant', content: 'Pour accéder au niveau Intermédiaire, vous devez d\'abord compléter tous les cours du niveau Débutant. Une fois terminés, le niveau Intermédiaire sera automatiquement débloqué.' },
    { role: 'user', content: 'Combien de temps prend le niveau débutant?' },
  ];

  log.info('Simulation de conversation...');

  conversation.forEach((msg, idx) => {
    const tokens = estimateTokens(msg.content);
    memorySystem.workingMemory.messages.push({ ...msg, tokens });
    memorySystem.workingMemory.currentTokens += tokens;

    console.log(`${colors.dim}[${idx + 1}] ${msg.role}: ${msg.content.substring(0, 50)}... (${tokens} tokens)${colors.reset}`);
  });

  log.success(`Working Memory: ${memorySystem.workingMemory.currentTokens} / ${memorySystem.workingMemory.maxTokens} tokens`);

  // Test compression si dépassement
  if (memorySystem.workingMemory.currentTokens > memorySystem.workingMemory.maxTokens * 0.8) {
    log.info('Compression de mémoire déclenchée...');
    memorySystem.sessionMemory.summary = 'L\'utilisateur s\'intéresse aux cours disponibles et souhaite s\'inscrire au niveau intermédiaire.';
    memorySystem.sessionMemory.keyPoints = [
      'Intéressé par niveau Intermédiaire',
      'Besoin de compléter Débutant d\'abord',
      'Question sur la durée'
    ];
    log.success('Résumé généré pour mémoire de session');
  }

  return memorySystem;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════

function chunkText(text, chunkSize = 512, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;
    if (start < 0) start = 0;
    if (end === text.length) break;
  }

  return chunks;
}

function estimateTokens(text) {
  // Estimation simple: ~4 chars par token
  return Math.ceil(text.length / 4);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXÉCUTION DES TESTS
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log(`
${colors.cyan}${colors.bold}
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║             🧪 TEST SYSTÈME RAG - AMINI ACADEMY 🧪                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const startTime = Date.now();
  const results = {
    database: false,
    schema: null,
    ragData: null,
    search: null,
    response: null,
    memory: null
  };

  try {
    // Test 1: Connexion DB
    results.database = await testDatabaseConnection();
    if (!results.database) {
      throw new Error('Impossible de continuer sans connexion DB');
    }

    // Test 2: Analyse structure
    results.schema = await analyzeDataStructure();

    // Test 3: Extraction RAG
    results.ragData = await extractDataForRAG();

    if (results.ragData) {
      // Test 4: Recherche vectorielle
      const query = 'comment compléter un cours';
      results.search = await testVectorSearch(results.ragData, query);

      // Test 5: Génération réponse
      if (results.search && results.search.length > 0) {
        results.response = await simulateRAGResponse(query, results.search);
      }
    }

    // Test 6: Mémoire
    results.memory = testMemoryManagement();

  } catch (error) {
    log.error(`Erreur fatale: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RAPPORT FINAL
  // ═══════════════════════════════════════════════════════════════════════════

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  log.section('RAPPORT FINAL');

  console.log(`
${colors.cyan}┌─────────────────────────────────────────────────────────────────┐
│                     RÉSULTATS DES TESTS                         │
├─────────────────────────────────────────────────────────────────┤${colors.reset}
│ ${results.database ? colors.green + '✓' : colors.red + '✗'} Connexion Base de Données                                   ${colors.cyan}│${colors.reset}
│ ${results.schema ? colors.green + '✓' : colors.red + '✗'} Analyse Structure (${results.schema ? Object.keys(results.schema).length + ' tables' : 'échec'})                              ${colors.cyan}│${colors.reset}
│ ${results.ragData ? colors.green + '✓' : colors.red + '✗'} Extraction RAG (${results.ragData ? results.ragData.documents.length + ' docs, ' + results.ragData.chunks.length + ' chunks' : 'échec'})                    ${colors.cyan}│${colors.reset}
│ ${results.search ? colors.green + '✓' : colors.red + '✗'} Recherche Vectorielle (${results.search ? results.search.length + ' résultats' : 'échec'})                       ${colors.cyan}│${colors.reset}
│ ${results.response ? colors.green + '✓' : colors.red + '✗'} Génération Réponse RAG                                       ${colors.cyan}│${colors.reset}
│ ${results.memory ? colors.green + '✓' : colors.red + '✗'} Gestion Mémoire                                               ${colors.cyan}│${colors.reset}
${colors.cyan}├─────────────────────────────────────────────────────────────────┤
│ Durée totale: ${duration}s                                           │
└─────────────────────────────────────────────────────────────────┘${colors.reset}
`);

  // Schéma de données final
  if (results.ragData) {
    console.log(`
${colors.yellow}${colors.bold}SCHÉMA D'ORGANISATION DES DONNÉES:${colors.reset}

${colors.dim}┌──────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE RAG                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PostgreSQL                  In-Memory                    Output         │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐  │
│  │ courses     │───extract──│ documents   │───search───│ context     │  │
│  │ lessons     │            │ (${String(results.ragData.documents.length).padStart(3)})       │            │             │  │
│  │ users       │            ├─────────────┤            ├─────────────┤  │
│  │ progress    │            │ chunks      │───rank─────│ top-k       │  │
│  └─────────────┘            │ (${String(results.ragData.chunks.length).padStart(3)})       │            │ results     │  │
│                             └─────────────┘            └─────────────┘  │
│                                    │                          │         │
│                                    └──────────┬───────────────┘         │
│                                               ▼                          │
│                                    ┌─────────────────────┐              │
│                                    │    LLM GENERATION   │              │
│                                    │  (Claude/GPT-4)     │              │
│                                    └─────────────────────┘              │
│                                               │                          │
│                                               ▼                          │
│                                    ┌─────────────────────┐              │
│                                    │   RESPONSE + SOURCES │              │
│                                    └─────────────────────┘              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘${colors.reset}
`);
  }

  await pool.end();
  log.success('Tests terminés - Connexion fermée');
}

// Exécuter
runAllTests().catch(console.error);
