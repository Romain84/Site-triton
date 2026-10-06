import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminSession } from '@/lib/auth/session';
import { isSameOriginRequest } from '@/lib/security/origin';
import { apiError, apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { parseCalendarEventsFromText, parseCompetitionSheets } from '@/lib/calendar/import-parser';

const importLogger = logger.withContext('ImportCalendrierAutomatique');

// Known locations to split Title | Location | Categories
const LOCATIONS = [
  'Saint-Tropez', 'Pertuis', 'Gap', 'Avignon - Stuart Mill', 'Sorgues', 'Libourne',
  'Nice', 'Bourg-en-Bresse', 'Saint Raphaël', 'Vedène', 'Châteauroux', 'Nîmes',
  'Avignon', 'Châlon-sur-Saône', 'Orange', 'Toulon ?', 'Toulon', 'Carpentras', 'Venelles',
  'Tarbes', 'Aix en Provence', 'Saint Etienne', 'Martigues', 'Cannet-en-Roussillon', 'Cavaillon ?', 'Cavaillon'
];



// Maps categories to database groups
function getGroupIdsForCategories(categories: string, dbGroups: any[]): string[] {
  const matchedIds: string[] = [];
  const cats = categories.toLowerCase().trim();
  
  if (!cats) return [];

  // Helper filters to match Triton Cavaillon groups
  const isAvenirs = (g: any) => g.nom.includes('Avenirs');
  const isBenjamins = (g: any) => g.nom.includes('Benjamins');
  const isJuniors = (g: any) => g.nom.includes('Juniors');
  const isAdultes = (g: any) => g.nom.includes('Adultes');

  // Handle composite categories ("et +")
  if (cats.includes('u12 et +') || cats.includes('u12 et plus')) {
    // "u12 et +" covers Benjamins, Juniors, and Adultes (Seniors/Maitres)
    const gIds = dbGroups.filter(g => isBenjamins(g) || isJuniors(g) || isAdultes(g)).map(g => g.id);
    matchedIds.push(...gIds);
  } else if (cats.includes('u14 et +') || cats.includes('u14 et plus')) {
    // "u14 et +" covers Juniors and Adultes (Seniors/Maitres)
    const gIds = dbGroups.filter(g => isJuniors(g) || isAdultes(g)).map(g => g.id);
    matchedIds.push(...gIds);
  } else if (cats.includes('u18 et +') || cats.includes('u18 et plus')) {
    // "u18 et +" covers Adultes (Seniors/Maitres)
    const gIds = dbGroups.filter(g => isAdultes(g)).map(g => g.id);
    matchedIds.push(...gIds);
  } else {
    // Precise individual age categories
    // 1. U11 et moins = Avenirs
    if (cats.includes('u11') || cats.includes('avenirs')) {
      const gIds = dbGroups.filter(isAvenirs).map(g => g.id);
      matchedIds.push(...gIds);
    }
    // 2. U12 et U13 = Benjamins
    if (cats.includes('u12') || cats.includes('u13') || cats.includes('benjamins')) {
      const gIds = dbGroups.filter(isBenjamins).map(g => g.id);
      matchedIds.push(...gIds);
    }
    // 3. U14 jusqu'à U18 = Juniors (Compétition & Loisirs)
    if (
      cats.includes('u14') || cats.includes('u15') || cats.includes('u16') ||
      cats.includes('u17') || cats.includes('u18') || cats.includes('juniors')
    ) {
      const gIds = dbGroups.filter(isJuniors).map(g => g.id);
      matchedIds.push(...gIds);
    }
    // 4. U18 jusqu'à U25 = Seniors & au delà de 25ans = Maîtres (both map to Adultes in Cavaillon)
    if (
      cats.includes('u20') || cats.includes('u25') || cats.includes('seniors') ||
      cats.includes('elites') || cats.includes('maîtres') || cats.includes('maitres') ||
      cats.includes('adultes')
    ) {
      const gIds = dbGroups.filter(isAdultes).map(g => g.id);
      matchedIds.push(...gIds);
    }
  }
  
  return Array.from(new Set(matchedIds));
}

function makeReglementPagerender() {
  let currentPage = 0;
  return async function pagerender(pageData: any): Promise<string> {
    currentPage++;
    const content = await pageData.getTextContent();
    let text = "";
    let lastY: number | undefined;
    for (const item of content.items as any[]) {
      if (lastY === item.transform[5] || !lastY) {
        text += item.str;
      } else {
        text += '\n' + item.str;
      }
      lastY = item.transform[5];
    }
    return `${text}\n__PAGE_NUMBER__:${currentPage}\n`;
  };
}

/**
 * Extrait le texte du PDF calendrier en utilisant pdfjs-dist directement.
 * Utilise les coordonnées Y des éléments PDF pour trier les lignes de haut en bas,
 * garantissant que les en-têtes de mois apparaissent AVANT leurs événements.
 *
 * Le PDFParse.getText() standard ne préserve pas l'ordre visuel Y, ce qui causait
 * les en-têtes de mois à apparaître APRÈS les événements dans le texte extrait,
 * forçant un fallback statique index→mois fragile et incorrect.
 */
async function extractCalendarTextFromPdf(buffer: Buffer): Promise<string> {
  // Import dynamique de pdfjs-dist (module ESM)
  // pathToFileURL nécessaire pour compatibilité Windows avec les imports ESM
  const { pathToFileURL } = await import('url');
  const path = await import('path');
  const pdfjsPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs');
  const pdfjsLib: any = await import(pathToFileURL(pdfjsPath).href);

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  let fullText = '';

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    // Grouper les éléments par position Y (tolérance ±3 pour même alignement visuel)
    const buckets = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of content.items as any[]) {
      const str: string = item.str ?? '';
      if (!str.trim()) continue;
      const y = item.transform[5] as number;
      const x = item.transform[4] as number;
      let key = y;
      for (const k of buckets.keys()) {
        if (Math.abs(k - y) <= 3) { key = k; break; }
      }
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push({ x, text: str });
    }

    // Trier par Y décroissant (haut → bas) puis X croissant (gauche → droite)
    const pageText = [...buckets.entries()]
      .sort(([a], [b]) => b - a)
      .map(([, items]) => {
        items.sort((a, b) => a.x - b.x);
        return items.map(i => i.text).join(' ');
      })
      .join('\n');

    fullText += pageText + '\n';
  }

  return fullText;
}

async function parsePdfText(buffer: Buffer, options?: Record<string, unknown>): Promise<string> {
  const pdfparseModule = require('pdf-parse');
  const uint8Array = new Uint8Array(buffer);

  const finalOptions = {
    pageJoiner: '__PAGE_NUMBER__:page_number',
    ...options
  };

  if (typeof pdfparseModule === 'function') {
    const data = await pdfparseModule(uint8Array, finalOptions);
    return data.text;
  } else if (pdfparseModule && typeof pdfparseModule.PDFParse === 'function') {
    const parser = new pdfparseModule.PDFParse(uint8Array, finalOptions);
    const data = await parser.getText(finalOptions);
    return data.text;
  } else {
    throw new Error("Impossible de trouver la fonction de parsing dans le module 'pdf-parse'");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return apiError('Origine non autorisée', 403, undefined, 'FORBIDDEN_ORIGIN');
  }

  const session = await getAdminSession();
  if (!session) {
    return apiError('Non authentifié', 401, undefined, 'UNAUTHENTICATED');
  }

  try {
    const formData = await request.formData();
    const calendarFile = formData.get('calendar');
    const reglementFile = formData.get('reglement');
    const regionalFile = formData.get('regional');

    if (!(calendarFile instanceof File)) {
      return apiError('Fichier PDF du calendrier manquant', 400, undefined, 'MISSING_CALENDAR');
    }

    const calendarBuffer = Buffer.from(await calendarFile.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reglements');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 1. Sauvegarder le calendrier avec un nom unique
    const timestamp = Date.now();
    const cleanCalName = calendarFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueCalName = `${timestamp}-${cleanCalName}`;
    fs.writeFileSync(path.join(uploadDir, uniqueCalName), calendarBuffer);

    // 2. Extraire les fiches depuis le règlement départemental (si fourni)
    let sheets: any[] = [];
    let pdfReglementPath: string | null = null;
    if (reglementFile instanceof File) {
      const reglementBuffer = Buffer.from(await reglementFile.arrayBuffer());
      const cleanRegName = reglementFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueRegName = `${timestamp}-${cleanRegName}`;
      fs.writeFileSync(path.join(uploadDir, uniqueRegName), reglementBuffer);
      pdfReglementPath = `/uploads/reglements/${uniqueRegName}`;

      const regText = await parsePdfText(reglementBuffer, { pagerender: makeReglementPagerender() });
      sheets = parseCompetitionSheets(regText);
      sheets.forEach(s => (s as any).pdfPath = pdfReglementPath);
      importLogger.info(`${sheets.length} fiches de compétition extraites du règlement départemental.`);
    }

    // Extraire les fiches depuis le règlement régional (si fourni)
    let regionalSheets: any[] = [];
    let regionalPdfPath: string | null = null;
    if (regionalFile instanceof File) {
      const regionalBuffer = Buffer.from(await regionalFile.arrayBuffer());
      const cleanRegionalName = regionalFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueRegionalName = `${timestamp}-${cleanRegionalName}`;
      fs.writeFileSync(path.join(uploadDir, uniqueRegionalName), regionalBuffer);
      regionalPdfPath = `/uploads/reglements/${uniqueRegionalName}`;

      const regionalText = await parsePdfText(regionalBuffer, { pagerender: makeReglementPagerender() });
      regionalSheets = parseCompetitionSheets(regionalText);
      regionalSheets.forEach(s => (s as any).pdfPath = regionalPdfPath);
      importLogger.info(`${regionalSheets.length} fiches de compétition extraites du règlement régional PACA.`);
    }

    const allSheets = [...sheets, ...regionalSheets];

    // 3. Extraire le texte du PDF calendrier et parser les événements de manière robuste
    let calendarText: string;
    try {
      calendarText = await extractCalendarTextFromPdf(calendarBuffer);
      importLogger.info('Texte calendrier extrait avec tri par position Y (pdfjs-dist).');
    } catch (extractErr) {
      importLogger.warn('Extraction positionnelle échouée, fallback sur extraction par défaut:', extractErr);
      calendarText = await parsePdfText(calendarBuffer, {});
    }
    const events = parseCalendarEventsFromText(calendarText, allSheets);
    importLogger.info(`Parsed ${events.length} events from calendar PDF using robust regex parser.`);

    if (events.length === 0) {
      return apiError('Aucun événement détecté dans le calendrier PDF. Vérifiez que le fichier est lisible.', 422, undefined, 'NO_EVENTS_FOUND');
    }

    // 4. Charger les groupes pour la distribution
    const dbGroups = await prisma.groupe.findMany({
      select: { id: true, nom: true, niveau: true }
    });

    // 5. Nettoyer les anciennes compétitions pour les années des événements importés
    const targetYears = Array.from(new Set(
      events.map(e => new Date(e.date).getFullYear()).filter(y => !isNaN(y) && y >= 2025)
    ));

    let totalDeleted = 0;
    for (const year of targetYears) {
      const deleteResult = await prisma.evenementCalendrier.deleteMany({
        where: {
          date: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31, 23, 59, 59, 999)
          },
          type: 'competition'
        }
      });
      totalDeleted += deleteResult.count;
      importLogger.info(`Suppression de ${deleteResult.count} anciennes compétitions pour l'année ${year}.`);
    }

    // 6. Insérer les nouveaux événements distribués par groupes
    let totalInsertions = 0;

    for (const event of events) {
      const categoriesStr = event.categories || '';
      const matchingGroupIds = getGroupIdsForCategories(categoriesStr, dbGroups);
      
      const baseDescription = event.description || `Compétition CD84 - Catégories : ${categoriesStr || 'Toutes'}`;

      let eventPdfReglement = pdfReglementPath;
      if (event.sheet && (event.sheet as any).pdfPath) {
        eventPdfReglement = (event.sheet as any).pdfPath;
      }

      const dataPayload = {
        title: event.title,
        date: new Date(event.date),
        dateFin: event.dateFin ? new Date(event.dateFin) : null,
        heureDebut: event.heureDebut || '08:00',
        heureFin: event.heureFin || '18:00',
        lieu: event.lieu || null,
        type: 'competition' as const,
        pdfReglement: eventPdfReglement,
        actif: true
      };

      if (matchingGroupIds.length === 0) {
        await prisma.evenementCalendrier.create({
          data: {
            ...dataPayload,
            description: baseDescription,
            couleur: '#15803d',
          }
        });
        totalInsertions++;
      } else if (matchingGroupIds.length === 1) {
        const gId = matchingGroupIds[0];
        const group = dbGroups.find(g => g.id === gId);
        await prisma.evenementCalendrier.create({
          data: {
            ...dataPayload,
            description: event.description ? baseDescription : `${baseDescription} (${group?.nom})`,
            groupeId: gId,
            couleur: group?.niveau === 'competition' ? '#1d4ed8' : '#15803d',
          }
        });
        totalInsertions++;
      } else {
        const groupNames = matchingGroupIds
          .map(gId => dbGroups.find(g => g.id === gId)?.nom)
          .filter(Boolean)
          .join(', ');

        const hasCompetitionGroup = dbGroups
          .filter(g => matchingGroupIds.includes(g.id))
          .some(g => g.niveau === 'competition');

        await prisma.evenementCalendrier.create({
          data: {
            ...dataPayload,
            description: `${baseDescription}\n__TARGET_GROUPS__:${JSON.stringify(matchingGroupIds)}`,
            groupeId: null,
            couleur: hasCompetitionGroup ? '#1d4ed8' : '#15803d',
          }
        });
        totalInsertions++;
      }
    }

    return apiSuccess({
      message: 'Importation réussie',
      eventsCount: events.length,
      insertionsCount: totalInsertions,
      deletedCount: totalDeleted
    });

  } catch (err) {
    importLogger.error('[IMPORT_ERROR]', err);
    return apiError(
      `Erreur lors de l'importation : ${err instanceof Error ? err.message : String(err)}`,
      500,
      undefined,
      'IMPORT_ERROR'
    );
  }
}
