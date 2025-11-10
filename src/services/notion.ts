import type { BookDetailSection } from "../types/library";

type NotionRichText = Array<[string, unknown?]>;

type NotionBlockValue = {
  id: string;
  type: string;
  properties?: {
    title?: NotionRichText;
  };
  content?: string[];
};

type NotionBlockRecord = {
  value: NotionBlockValue;
};

type NotionBlockMap = Record<string, NotionBlockRecord>;

type NotionCursor = {
  stack: unknown[];
};

type LoadCachedPageChunkResponse = {
  cursor?: NotionCursor;
  recordMap?: {
    block?: NotionBlockMap;
  };
};

const NOTION_API_URL = "https://www.notion.so/api/v3/loadCachedPageChunk";
const DEFAULT_CURSOR: NotionCursor = { stack: [] };
const NOTION_REQUEST_LIMIT = 100;
const NOTION_MAX_PAGES = 20;

const headingPatterns: RegExp[] = [
  /^введение\b/i,
  /^заключение\b/i,
  /^эпилог\b/i,
  /^пролог\b/i,
  /^предисловие\b/i,
  /^послесловие\b/i,
  /^afterword\b/i,
  /^preface\b/i,
  /^глава\b/i,
  /^часть\b/i,
  /^раздел\b/i,
  /^section\b/i,
  /^chapter\b/i,
  /^part\b/i,
  /^итоги\b/i
];

const dividerPattern = /^[\s⸺⸻—–\-·•]+$/u;

const HEADING_BLOCK_TYPES = new Set(["header", "sub_header", "sub_sub_header"]);
const LIST_BLOCK_TYPES = new Set(["bulleted_list", "numbered_list"]);

const sanitizeText = (raw: string): string => raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const getPlainText = (block: NotionBlockValue): string => {
  const { properties } = block;
  if (!properties || !Array.isArray(properties.title)) {
    return "";
  }
  return properties.title
    .map((segment) => {
      if (Array.isArray(segment) && typeof segment[0] === "string") {
        return segment[0];
      }
      return "";
    })
    .join("");
};

const shouldStartNewSection = (block: NotionBlockValue, text: string): boolean => {
  if (!text) {
    return false;
  }

  if (HEADING_BLOCK_TYPES.has(block.type)) {
    return true;
  }

  return headingPatterns.some((pattern) => pattern.test(text));
};

const formatLine = (block: NotionBlockValue, text: string): string => {
  if (!text) {
    return "";
  }

  if (LIST_BLOCK_TYPES.has(block.type)) {
    return text.startsWith("•") ? text : `• ${text}`;
  }

  if (/^[\-–—]\s*/.test(text)) {
    return text.replace(/^[\-–—]\s*/, "• ");
  }

  return text;
};

const mergeBlocks = (target: NotionBlockMap, source?: NotionBlockMap) => {
  if (!source) {
    return;
  }
  Object.keys(source).forEach((key) => {
    target[key] = source[key];
  });
};

const buildSectionsFromBlocks = (blocks: NotionBlockMap, pageId: string): BookDetailSection[] => {
  const page = blocks[pageId];
  if (!page) {
    return [];
  }

  const queue = [...(page.value.content ?? [])];
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  const mergeTitles = (primary: string, secondary: string): string => {
    const first = primary.trim();
    const second = secondary.trim();
    if (!first) {
      return second;
    }
    if (!second) {
      return first;
    }

    const firstLower = first.toLowerCase();
    const secondLower = second.toLowerCase();

    if (secondLower.startsWith(firstLower)) {
      return second;
    }
    if (firstLower.startsWith(secondLower)) {
      return first;
    }

    if (/^глава\b/i.test(first) && !/^глава\b/i.test(second)) {
      return `${first.replace(/[.:—–-]+\s*$/u, "")}. ${second}`;
    }

    if (!/:$/.test(first)) {
      return `${first}: ${second}`;
    }

    return `${first} ${second}`;
  };

  const commitCurrent = () => {
    if (!current) {
      return;
    }
    const body = current.lines.map((line) => line.replace(/\s+$/g, "")).filter((line) => line.length > 0);
    if (current.title.trim().length === 0 && body.length === 0) {
      current = null;
      return;
    }
    sections.push({
      title: current.title.trim(),
      lines: body
    });
    current = null;
  };

  const ensureCurrent = () => {
    if (!current) {
      current = { title: "", lines: [] };
    }
    return current;
  };

  const processBlock = (blockId: string) => {
    const record = blocks[blockId];
    if (!record) {
      return;
    }
    const block = record.value;
    if (block.type === "page") {
      return;
    }
    const plainText = sanitizeText(getPlainText(block));
    if (!plainText || dividerPattern.test(plainText)) {
      if (block.content) {
        block.content.forEach(processBlock);
      }
      return;
    }

    if (shouldStartNewSection(block, plainText)) {
      if (current && current.lines.length === 0) {
        current.title = mergeTitles(current.title, plainText);
      } else {
        commitCurrent();
        current = { title: plainText, lines: [] };
      }
    } else {
      const section = ensureCurrent();
      section.lines.push(formatLine(block, plainText));
    }

    if (Array.isArray(block.content)) {
      block.content.forEach(processBlock);
    }
  };

  queue.forEach(processBlock);
  commitCurrent();

  return sections
    .map((section) => ({
      title: section.title,
      body: section.lines.join("\n")
    }))
    .filter((section) => section.title.length > 0 || section.body.length > 0);
};

export const loadNotionBookSections = async (pageId: string, signal?: AbortSignal): Promise<BookDetailSection[]> => {
  if (!pageId) {
    return [];
  }

  let chunkNumber = 0;
  let cursor: NotionCursor | undefined = undefined;
  const aggregatedBlocks: NotionBlockMap = {};

  while (chunkNumber < NOTION_MAX_PAGES) {
    const payload = {
      pageId,
      chunkNumber,
      limit: NOTION_REQUEST_LIMIT,
      cursor: cursor ?? DEFAULT_CURSOR,
      verticalColumns: false
    };

    const response = await fetch(NOTION_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Referer: "https://www.notion.so"
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      throw new Error(`Notion request failed with status ${response.status}`);
    }

    const data = (await response.json()) as LoadCachedPageChunkResponse;
    mergeBlocks(aggregatedBlocks, data.recordMap?.block);

    if (!data.cursor || !Array.isArray(data.cursor.stack) || data.cursor.stack.length === 0) {
      break;
    }

    cursor = data.cursor;
    chunkNumber += 1;
  }

  return buildSectionsFromBlocks(aggregatedBlocks, pageId);
};
