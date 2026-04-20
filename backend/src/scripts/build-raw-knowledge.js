#!/usr/bin/env node
import { access, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_RAW_ROOT = path.resolve(__dirname, '../../../knowledge/raw_knowledge');
const DEFAULT_OUTPUT_ROOT = path.resolve(__dirname, '../../../knowledge/pensamiento');

const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;
const PAGE_NUMBER_ONLY = /^(\d+|[ivxlcdm]+)$/i;
const DATE_STAMP = /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}$/;
const PART_HEADING = /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SEPTIMA|S[EÉ]PTIMA|OCTAVA|NOVENA|DECIMA)\s+PARTE\.?\s*(.*)$/i;
const CHAPTER_START = /^(\d{1,2})\.\s+(.+)$/;
const MOJIBAKE_SEQUENCE = /(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2[\u0080-\u00BF]{1,2})/g;
const STUDY_AID_HEADING = /^(?:Terminos clave|T\u00E9rminos clave|Preguntas para repasar, debatir e investigar|Lecturas propuestas|Lecturas en fuentes originales)$/i;
const STUDY_AID_MARKERS = [
  '\nT\u00E9rminos clave\n',
  '\nTerminos clave\n',
  '\nPreguntas para repasar, debatir e investigar\n',
  '\nLecturas propuestas\n',
  '\nLecturas en fuentes originales\n',
];

function stripControlChars(value) {
  return value.replace(CONTROL_CHARS, '');
}

function normalizeSpaces(value) {
  return stripControlChars(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function countMojibake(value) {
  return value.match(MOJIBAKE_SEQUENCE)?.length || 0;
}

function repairMojibake(value) {
  let current = value;

  for (let pass = 0; pass < 2; pass += 1) {
    const currentScore = countMojibake(current);
    if (currentScore === 0) {
      break;
    }

    const candidate = Buffer.from(current, 'latin1').toString('utf8');
    const candidateScore = countMojibake(candidate);

    if (candidateScore >= currentScore) {
      break;
    }

    current = candidate;
  }

  return current;
}

function isStudyAidHeading(value) {
  return STUDY_AID_HEADING.test(normalizeSpaces(value));
}

function normalizeSearchText(value) {
  return normalizeSpaces(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function slugify(value) {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitPages(raw) {
  return raw
    .split('\f')
    .map((page) => page.replace(/\r\n/g, '\n'))
    .map((page) => page.trim())
    .filter(Boolean);
}

function parseMetadata(infoText, fileName) {
  const data = {
    title: path.basename(fileName, path.extname(fileName)),
    author: '',
    creationYear: '',
  };

  for (const line of infoText.split(/\r?\n/)) {
    const match = /^([^:]+):\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }

    const key = normalizeSearchText(match[1]);
    const value = repairMojibake(normalizeSpaces(match[2]));

    if (key === 'title' && value && (!data.title || data.title === path.basename(fileName, path.extname(fileName)))) {
      data.title = value;
    }

    if (key === 'author' && value) {
      data.author = value.replace(/\(Author\)/g, '').trim();
    }

    if (key === 'creationdate') {
      const yearMatch = /\b(19|20)\d{2}\b/.exec(value);
      if (yearMatch) {
        data.creationYear = yearMatch[0];
      }
    }
  }

  return data;
}

function inferTitleFromCoverPages(pages) {
  const earlyPages = pages.slice(0, 8).map(cleanExtractedPage);

  for (const page of earlyPages) {
    const lines = page
      .split('\n')
      .map(normalizeSpaces)
      .filter(Boolean);

    const candidate = [];
    let collecting = false;

    for (const line of lines) {
      if (/^LANDRETH\b/i.test(line) || DATE_STAMP.test(line)) {
        continue;
      }

      if (/^(Harry|David|Traductor|MADRID|BOGOT[AÁ]|NUEVA|AUCKLAND|SAN FRANCISCO|IMPRESO|Para\b)/i.test(line)) {
        if (candidate.length >= 2) {
          break;
        }
        continue;
      }

      const looksTitle =
        /^[A-ZÁÉÍÓÚÜÑ0-9 .,:;()\-]+$/.test(line) ||
        /edici[oó]n/i.test(line);

      if (!collecting && looksTitle) {
        collecting = true;
      }

      if (collecting && looksTitle) {
        candidate.push(line);
        continue;
      }

      if (collecting) {
        break;
      }
    }

    if (candidate.length >= 2) {
      return candidate.join(' ');
    }
  }

  return '';
}

function sanitizeTocLine(line) {
  return normalizeSpaces(
    line
      .replace(/[·•]+/g, ' ')
      .replace(/\u0008/g, ' ')
      .replace(/[–—]/g, '-')
  );
}

function extractTrailingPageNumber(line) {
  const match = /(.*?)(\d{1,3})$/.exec(line);
  if (!match) {
    return { text: line.trim(), page: null };
  }

  const left = match[1].trim();
  const page = Number(match[2]);

  if (!left || !Number.isFinite(page)) {
    return { text: line.trim(), page: null };
  }

  return { text: left, page };
}

function finalizeChapter(chapters, chapter) {
  if (!chapter || !chapter.bookPage || !chapter.title) {
    return;
  }

  chapter.title = normalizeSpaces(chapter.title);
  chapter.slug = `pensamiento__${chapter.bookSlug}__${String(chapter.number).padStart(2, '0')}-${slugify(chapter.title)}`;
  chapter.tags = unique([
    'pensamiento-economico',
    'historia-economica',
    ...chapter.title
      .split(/\s+/)
      .map((token) => slugify(token))
      .filter((token) => token.length >= 4)
      .slice(0, 4),
  ]);

  chapters.push(chapter);
}

function parseTableOfContents(layoutPages, bookSlug) {
  const joinedPages = layoutPages.slice(0, 24);
  const tocStart = joinedPages.findIndex((page) => /contenido/i.test(page));

  if (tocStart === -1) {
    throw new Error('No pude encontrar una seccion de contenido/indice dentro del PDF.');
  }

  const lines = joinedPages
    .slice(tocStart, tocStart + 16)
    .flatMap((page) => page.split('\n'))
    .map(sanitizeTocLine);

  const chapters = [];
  let currentChapter = null;
  let currentPart = '';
  let collectingPart = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (/^contenido$/i.test(line) || /^prologo$/i.test(line)) {
      continue;
    }

    const partMatch = PART_HEADING.exec(line);
    if (partMatch) {
      currentPart = normalizeSpaces(`${partMatch[1]} PARTE ${partMatch[2] || ''}`);
      collectingPart = true;
      continue;
    }

    if (collectingPart && !CHAPTER_START.test(line) && !PAGE_NUMBER_ONLY.test(line)) {
      currentPart = normalizeSpaces(`${currentPart} ${line}`);
      continue;
    }

    collectingPart = false;

    const chapterMatch = CHAPTER_START.exec(line);
    if (chapterMatch) {
      finalizeChapter(chapters, currentChapter);

      const number = Number(chapterMatch[1]);
      const tail = extractTrailingPageNumber(chapterMatch[2]);

      currentChapter = {
        number,
        title: tail.text,
        bookPage: tail.page,
        outline: [],
        part: currentPart || '',
        bookSlug,
      };
      continue;
    }

    if (!currentChapter) {
      continue;
    }

    const maybePage = extractTrailingPageNumber(line);

    if (!currentChapter.bookPage) {
      currentChapter.title = normalizeSpaces(`${currentChapter.title} ${maybePage.text}`);
      currentChapter.bookPage = maybePage.page;
      continue;
    }

    if (PAGE_NUMBER_ONLY.test(line)) {
      continue;
    }

    currentChapter.outline.push(maybePage.text);
  }

  finalizeChapter(chapters, currentChapter);

  if (chapters.length === 0) {
    throw new Error('No pude parsear capitulos desde el indice del libro.');
  }

  return chapters;
}

function cleanContentPage(page) {
  const lines = page
    .split('\n')
    .map((line) => line.replace(/\r/g, ''))
    .map((line) => line.replace(/\u00a0/g, ' '))
    .filter((line) => {
      const normalized = normalizeSpaces(line);

      if (!normalized) {
        return true;
      }

      if (DATE_STAMP.test(normalized)) {
        return false;
      }

      if (PAGE_NUMBER_ONLY.test(normalized)) {
        return false;
      }

      if (/^LANDRETH - Historia del pensamie\d+/i.test(normalized)) {
        return false;
      }

      return true;
    });

  return lines
    .join('\n')
    .replace(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])-\n([a-záéíóúüñ])/g, '$1$2')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanExtractedPage(page) {
  const lines = page
    .split('\n')
    .map((line) => line.replace(/\r/g, ''))
    .map((line) => line.replace(/\u00a0/g, ' '))
    .filter((line) => {
      const normalized = normalizeSpaces(line);

      if (!normalized) {
        return true;
      }

      if (DATE_STAMP.test(normalized)) {
        return false;
      }

      if (PAGE_NUMBER_ONLY.test(normalized)) {
        return false;
      }

      if (/^LANDRETH - Historia del pensamie\d+/i.test(normalized)) {
        return false;
      }

      return true;
    });

  return lines
    .join('\n')
    .replace(/([A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00DC\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1])-\n([a-z\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1])/g, '$1$2')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function trimTrailingBackMatter(content) {
  const scanStart = Math.floor(content.length * 0.6);
  const cutPoints = STUDY_AID_MARKERS
    .map((marker) => content.indexOf(marker, scanStart))
    .filter((index) => index >= 0);

  if (cutPoints.length === 0) {
    return content.trim();
  }

  return content.slice(0, Math.min(...cutPoints)).trim();
}

function buildChapterMarkdown({ chapter, metadata, content, bookPath, chapterEndPage }) {
  const title = `Capitulo ${chapter.number}. ${chapter.title}`;
  const outline = unique(
    chapter.outline
      .map((item) => normalizeSpaces(item))
      .filter((item) => item.length >= 4)
      .filter((item) => !isStudyAidHeading(item))
      .filter((item) => !DATE_STAMP.test(item))
      .filter((item) => !/^LANDRETH - Historia del pensamie/i.test(item))
  );

  const frontmatter = [
    '---',
    `title: "${title}"`,
    `slug: ${chapter.slug}`,
    'category: pensamiento',
    `source: "${metadata.title}"`,
    `author: "${metadata.author || 'Harry Landreth; David C. Colander'}"`,
    `tags: [${chapter.tags.join(', ')}]`,
    metadata.creationYear ? `year: "${metadata.creationYear}"` : '',
    `book_page_start: "${chapter.bookPage}"`,
    `book_page_end: "${chapterEndPage}"`,
    `pdf_source: "${bookPath.replace(/\\/g, '/')}"`,
    '---',
  ]
    .filter((item) => item !== '')
    .join('\n');

  const outlineBlock = outline.length > 0
    ? `## Temas cubiertos\n\n${outline.map((item) => `- ${item}`).join('\n')}\n\n`
    : '';

  return `${frontmatter}\n\n# ${title}\n\n## Fuente\n\n- Libro: ${metadata.title}\n- Autor(es): ${metadata.author || 'Harry Landreth; David C. Colander'}\n- Paginas del libro: ${chapter.bookPage}-${chapterEndPage}\n\n${outlineBlock}## Texto base del capitulo\n\n${content}\n`;
}

function buildGuideMarkdown({ metadata, chapters, bookPath, guideSlug }) {
  const lines = [
    '---',
    'title: "Guia del libro de pensamiento economico"',
    `slug: ${guideSlug}`,
    'category: pensamiento',
    `source: "${metadata.title}"`,
    `author: "${metadata.author || 'Harry Landreth; David C. Colander'}"`,
    'tags: [pensamiento-economico, historia-economica, guia, autores, escuelas]',
    metadata.creationYear ? `year: "${metadata.creationYear}"` : '',
    `pdf_source: "${bookPath.replace(/\\/g, '/')}"`,
    '---',
    '',
    '# Guia del libro de pensamiento economico',
    '',
    'Este documento resume los capitulos disponibles del libro procesado desde `raw_knowledge/` para orientar las busquedas RAG.',
    '',
    `- Libro fuente: ${metadata.title}`,
    `- Autor(es): ${metadata.author || 'Harry Landreth; David C. Colander'}`,
    '',
    '## Capitulos disponibles',
    '',
  ];

  for (const chapter of chapters) {
    lines.push(`- Capitulo ${chapter.number}: ${chapter.title} (pagina ${chapter.bookPage})`);
    for (const item of unique(chapter.outline).filter((entry) => !isStudyAidHeading(entry)).slice(0, 8)) {
      lines.push(`- Tema asociado: ${item}`);
    }
  }

  lines.push('');
  lines.push('## Uso recomendado');
  lines.push('');
  lines.push('- Usa `search_knowledge_base` cuando el usuario pregunte por escuelas, autores, doctrinas o debates de historia del pensamiento economico.');
  lines.push('- Prioriza los capitulos del libro como fuente cuando la pregunta encaje con el pensamiento clasico, preclasico, marxista, marginalista, keynesiano o neoclasico.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function fileExists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    child.stderr.on('data', (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    child.on('error', reject);
    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');

      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr.trim() || `Command failed (${command} ${args.join(' ')})`));
    });
  });
}

async function findBinary(name, envVarName, extraCandidates = []) {
  if (process.env[envVarName]) {
    return process.env[envVarName];
  }

  for (const candidate of extraCandidates) {
    if (candidate && await fileExists(candidate)) {
      return candidate;
    }
  }

  const resolver = process.platform === 'win32' ? 'where.exe' : 'which';

  try {
    const stdout = await runCommand(resolver, [name]);
    const resolved = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    if (resolved) {
      return resolved;
    }
  } catch {
    // Fall through to final error.
  }

  throw new Error(`No encontre el binario "${name}". Configura ${envVarName} si ya lo tienes instalado.`);
}

async function extractPdfText(pdfPath, { layout, firstPage, lastPage }, pdftotextBin) {
  const args = ['-enc', 'UTF-8'];

  if (layout) {
    args.push('-layout');
  }

  if (firstPage) {
    args.push('-f', String(firstPage));
  }

  if (lastPage) {
    args.push('-l', String(lastPage));
  }

  args.push(pdfPath, '-');
  return runCommand(pdftotextBin, args);
}

function locateFirstChapterPage(pages, chapter, tocSearchFloor) {
  const target = normalizeSearchText(`${chapter.number}. ${chapter.title}`);

  for (let index = tocSearchFloor; index < pages.length; index += 1) {
    const window = normalizeSearchText(
      cleanExtractedPage(pages[index])
        .split('\n')
        .slice(0, 24)
        .join(' ')
    );

    if (window.includes(target)) {
      return index;
    }
  }

  return -1;
}

function findNearbyChapterPage(pages, chapter, expectedIndex, tocSearchFloor) {
  const target = normalizeSearchText(`${chapter.number}. ${chapter.title}`);
  const start = Math.max(tocSearchFloor, expectedIndex - 3);
  const end = Math.min(pages.length - 1, expectedIndex + 3);

  for (let index = start; index <= end; index += 1) {
    const window = normalizeSearchText(
      cleanExtractedPage(pages[index])
        .split('\n')
        .slice(0, 24)
        .join(' ')
    );

    if (window.includes(target)) {
      return index;
    }
  }

  return expectedIndex;
}

async function buildBookKnowledge(pdfPath, { pdftotextBin, pdfinfoBin, outputRoot }) {
  const fileName = path.basename(pdfPath);
  const bookSlug = slugify(path.basename(pdfPath, path.extname(pdfPath)));
  const metadataText = await runCommand(pdfinfoBin, [pdfPath]);
  const metadata = parseMetadata(metadataText, fileName);

  const layoutText = await extractPdfText(pdfPath, { layout: true, firstPage: 1, lastPage: 24 }, pdftotextBin);
  const layoutPages = splitPages(layoutText);
  const chapters = parseTableOfContents(layoutPages, bookSlug);

  const contentText = await extractPdfText(pdfPath, { layout: false }, pdftotextBin);
  const contentPages = splitPages(contentText);

  const inferredTitle = inferTitleFromCoverPages(contentPages);
  if (!metadata.title || /^ISO\s+\d+/i.test(metadata.title) || metadata.title === path.basename(fileName, path.extname(fileName))) {
    metadata.title = inferredTitle || metadata.title;
  }

  const firstChapterPageIndex = locateFirstChapterPage(contentPages, chapters[0], layoutPages.length);
  if (firstChapterPageIndex === -1) {
    throw new Error(`No pude localizar el inicio del capitulo 1 dentro de ${fileName}.`);
  }

  const pdfPageOffset = (firstChapterPageIndex + 1) - chapters[0].bookPage;

  for (const chapter of chapters) {
    const expectedPdfIndex = (chapter.bookPage + pdfPageOffset) - 1;
    chapter.pdfPageIndex = findNearbyChapterPage(
      contentPages,
      chapter,
      expectedPdfIndex,
      layoutPages.length
    );
  }

  const bookOutputDir = path.join(outputRoot, bookSlug);
  await rm(bookOutputDir, { recursive: true, force: true });
  await mkdir(bookOutputDir, { recursive: true });

  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index];
    const nextChapter = chapters[index + 1];
    const chapterEndPdfIndex = nextChapter ? nextChapter.pdfPageIndex - 1 : contentPages.length - 1;
    const chapterEndBookPage = nextChapter
      ? nextChapter.bookPage - 1
      : chapter.bookPage + (chapterEndPdfIndex - chapter.pdfPageIndex);

    const cleanedPages = contentPages
      .slice(chapter.pdfPageIndex, chapterEndPdfIndex + 1)
      .map(cleanExtractedPage)
      .filter(Boolean);

    const markdown = buildChapterMarkdown({
      chapter,
      metadata,
      content: trimTrailingBackMatter(cleanedPages.join('\n\n')),
      bookPath: path.relative(path.resolve(__dirname, '../../..'), pdfPath),
      chapterEndPage: chapterEndBookPage,
    });

    const filePath = path.join(
      bookOutputDir,
      `${String(chapter.number).padStart(2, '0')}-${slugify(chapter.title)}.md`
    );

    await writeFile(filePath, markdown, 'utf8');
    console.log(`  + ${path.relative(outputRoot, filePath).replace(/\\/g, '/')} (${chapter.bookPage}-${chapterEndBookPage})`);
  }

  const guideSlug = `pensamiento__${bookSlug}__guia`;
  const guidePath = path.join(bookOutputDir, '00-guia-del-libro.md');
  await writeFile(
    guidePath,
    buildGuideMarkdown({
      metadata,
      chapters,
      bookPath: path.relative(path.resolve(__dirname, '../../..'), pdfPath),
      guideSlug,
    }),
    'utf8'
  );

  console.log(`  + ${path.relative(outputRoot, guidePath).replace(/\\/g, '/')} (guia)`);
}

async function listPdfFiles(root) {
  const entries = await readdir(root);
  const files = [];

  for (const name of entries) {
    const fullPath = path.join(root, name);
    const info = await stat(fullPath);

    if (info.isDirectory()) {
      continue;
    }

    if (fullPath.toLowerCase().endsWith('.pdf')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const rawRoot = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_RAW_ROOT;
  const outputRoot = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT_ROOT;

  console.log(`[raw-knowledge] source=${rawRoot}`);
  console.log(`[raw-knowledge] output=${outputRoot}`);

  const localMiKTeXPath = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64');
  const pdftotextBin = await findBinary('pdftotext', 'PDFTOTEXT_BIN', [
    path.join(localMiKTeXPath, 'pdftotext.exe'),
  ]);
  const pdfinfoBin = await findBinary('pdfinfo', 'PDFINFO_BIN', [
    path.join(localMiKTeXPath, 'pdfinfo.exe'),
  ]);

  console.log(`[raw-knowledge] pdftotext=${pdftotextBin}`);
  console.log(`[raw-knowledge] pdfinfo=${pdfinfoBin}`);

  await mkdir(outputRoot, { recursive: true });

  const pdfFiles = await listPdfFiles(rawRoot);
  if (pdfFiles.length === 0) {
    console.log('[raw-knowledge] no encontre PDFs para procesar.');
    return;
  }

  for (const pdfPath of pdfFiles) {
    console.log(`[raw-knowledge] procesando ${path.basename(pdfPath)}`);
    await buildBookKnowledge(pdfPath, { pdftotextBin, pdfinfoBin, outputRoot });
  }

  console.log('[raw-knowledge] listo.');
}

main().catch((error) => {
  console.error('[raw-knowledge] fatal', error);
  process.exit(1);
});
