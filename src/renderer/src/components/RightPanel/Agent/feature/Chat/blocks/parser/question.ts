import type { ContentBlock, Question } from "../types";

/**
 * Parse the inner content of a <question> tag into a ContentBlock.
 * Supports both legacy schema (flat <option> list) and new schema (paginated <q> elements).
 */
export const parseQuestionBlock = (
  innerContent: string,
  openTag: string,
): ContentBlock => {
  const options: string[] = [];
  let title: string | undefined = undefined;
  const questions: Question[] = [];

  // Extract title if present (legacy)
  const titleMatch =
    /<question_title>([\s\S]*?)<\/question_title>/i.exec(
      innerContent || "",
    );
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Try to parse new schema with <q> elements
  let hasNewSchema = false;
  const content = innerContent || "";

  let searchIndex = 0;

  while (searchIndex < content.length) {
    const qStart = content.indexOf("<q ", searchIndex);
    if (qStart === -1) break;

    let tagEnd = -1;
    let isSelfClosing = false;
    let i = qStart + 2;

    while (i < content.length) {
      if (content[i] === "<" && content[i + 1] === "/") {
        break;
      }
      if (content[i] === ">" && content[i - 1] === "/") {
        isSelfClosing = true;
        tagEnd = i;
        break;
      }
      if (content[i] === ">") {
        tagEnd = i;
        break;
      }
      i++;
    }

    if (tagEnd === -1) {
      searchIndex = qStart + 2;
      continue;
    }

    const openTagText = content.substring(qStart, tagEnd + 1);
    const idMatch = openTagText.match(/id="([^"]+)"/);
    const typeMatch = openTagText.match(/type="([^"]+)"/);
    let qLabel = "";
    const doubleQuoteMatch = openTagText.match(/label="([^"]*)"/);
    const singleQuoteMatch = openTagText.match(/label='([^']*)'/);
    if (doubleQuoteMatch) {
      qLabel = doubleQuoteMatch[1].trim();
    } else if (singleQuoteMatch) {
      qLabel = singleQuoteMatch[1].trim();
    }

    if (!idMatch || !typeMatch) {
      searchIndex = tagEnd + 1;
      continue;
    }

    hasNewSchema = true;
    const qId = idMatch[1].trim();
    const qType = typeMatch[1].trim() as Question["type"];

    let qInner = "";
    let closeTagEnd = tagEnd;

    if (!isSelfClosing) {
      let closeIndex = content.indexOf("</q>", tagEnd + 1);
      if (closeIndex === -1) {
        closeTagEnd = tagEnd;
      } else {
        qInner = content.substring(tagEnd + 1, closeIndex);
        closeTagEnd = closeIndex + 4;
      }
    } else {
      closeTagEnd = tagEnd + 1;
    }

    const qOptions: string[] = [];
    if (qInner.trim()) {
      const optionRegex = /<option>([\s\S]*?)<\/option>/gi;
      let optMatch;
      while ((optMatch = optionRegex.exec(qInner)) !== null) {
        if (optMatch[1].trim()) {
          qOptions.push(optMatch[1].trim());
        }
      }
    }

    if (qType === "single" || qType === "multi") {
      if (qOptions.length < 2) {
        console.warn(
          `[Zen][Question] ⚠️ SKIPPING question "${qId}" - type ${qType} needs at least 2 options, got ${qOptions.length}`,
        );
        searchIndex = closeTagEnd;
        continue;
      }
    }

    const question: Question = {
      id: qId,
      type: qType,
      label: qLabel || `Question ${questions.length + 1}`,
      options: qOptions.length > 0 ? qOptions : undefined,
    };

    questions.push(question);
    searchIndex = closeTagEnd;
  }

  // If no new schema found, fall back to legacy parsing
  if (!hasNewSchema) {
    const optionRegex = /<option>([\s\S]*?)<\/option>/gi;
    let optMatch;
    while ((optMatch = optionRegex.exec(innerContent || "")) !== null) {
      if (optMatch[1].trim()) {
        options.push(optMatch[1].trim());
      }
    }
  }

  const optional = /optional=["']true["']/i.test(openTag);

  const qBlock: ContentBlock = {
    type: "question",
    options: options.length > 0 ? options : [],
    title,
    optional,
    ...(questions.length > 0 ? { questions } : {}),
  };

  return qBlock;
};