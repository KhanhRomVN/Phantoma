/**
 * FuzzyMatcher — Tìm kiếm fuzzy trong nội dung file.
 *
 * ?Usage:
 *   const match = FuzzyMatcher.findMatch(fileContent, searchBlock);
 *   if (match) { ... }
 *
 * ?Function:
 *   findMatch(): Tìm vị trí khớp gần đúng nhất của searchBlock trong fileContent.
 *
 * ?Note:
 *   Port từ temp/Zen/src/utils/FuzzyMatcher.ts.
 *   Zen dùng Fuse.js — bản này dùng thuật toán bigram similarity tự implement
 *   để tránh thêm dependency. Nếu cần độ chính xác cao hơn, upgrade path: cài fuse.js.
 */

interface MatchResult {
  startIndex: number;
  endIndex: number;
  originalText: string;
  score: number; // 0 = perfect match, 1 = no match (giống Fuse convention)
  startLine: number; // 1-indexed
}

export class FuzzyMatcher {
  /**
   * Tìm best fuzzy match cho search block trong file content.
   * Dùng anchor line (dòng đầu tiên không trống của search block) để tìm
   * vị trí tiềm năng, sau đó mở rộng cửa sổ và tính similarity.
   */
  public static findMatch(
    fileContent: string,
    searchBlock: string,
  ): MatchResult | null {
    const fileLines = fileContent.split(/\r?\n/);
    const searchLines = searchBlock.split(/\r?\n/);

    const normalize = (str: string) => str.replace(/\s+/g, '');
    const normalizedSearch = normalize(searchBlock);

    // Lọc dòng trống để tìm anchor line
    const meaningfulSearchLines = searchLines.filter((l) => l.trim().length > 0);
    if (meaningfulSearchLines.length === 0) return null;

    const anchorLine = meaningfulSearchLines[0].trim();

    // Tìm tất cả dòng trong file khớp với anchor line (fuzzy)
    const candidates: number[] = [];
    for (let i = 0; i < fileLines.length; i++) {
      const sim = this.lineSimilarity(fileLines[i].trim(), anchorLine);
      if (sim > 0.4) {
        candidates.push(i);
      }
    }

    // Sắp xếp theo similarity giảm dần, lấy top 20
    candidates.sort((a, b) => {
      const sa = this.lineSimilarity(fileLines[a].trim(), anchorLine);
      const sb = this.lineSimilarity(fileLines[b].trim(), anchorLine);
      return sb - sa;
    });
    const topCandidates = candidates.slice(0, 20);

    let bestMatch: MatchResult | null = null;
    let bestScore = 0; // similarity score (1 = perfect)

    for (const fileAnchorIdx of topCandidates) {
      const anchorOffsetInSearch = searchLines.indexOf(meaningfulSearchLines[0]);
      const potentialStartLineIdx = fileAnchorIdx - anchorOffsetInSearch;
      if (potentialStartLineIdx < 0) continue;

      const maxWindowLines = Math.max(searchLines.length * 5, 20);

      for (let length = 1; length <= maxWindowLines; length++) {
        const endIdx = potentialStartLineIdx + length;
        if (endIdx > fileLines.length) break;

        const candidateLines = fileLines.slice(potentialStartLineIdx, endIdx);
        const candidateBlock = candidateLines.join('\n');
        const normalizedCandidate = normalize(candidateBlock);

        const similarity = this.calculateSimilarity(normalizedSearch, normalizedCandidate);

        if (similarity > bestScore && similarity > 0.7) {
          bestScore = similarity;
          bestMatch = {
            startIndex: this.getCharacterIndex(fileContent, potentialStartLineIdx),
            originalText: candidateBlock,
            endIndex: -1,
            score: 1 - similarity, // Fuse convention: 0 = perfect
            startLine: potentialStartLineIdx + 1,
          };
        }

        // Dừng sớm nếu candidate đã dài hơn search đáng kể
        if (normalizedCandidate.length > normalizedSearch.length * 1.5) break;
      }
    }

    return bestMatch;
  }

  /** Tính similarity giữa 2 chuỗi dùng Dice coefficient trên bigrams */
  private static calculateSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 1;

    const getBigrams = (str: string): Set<string> => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);
    const intersection = new Set([...b1].filter((x) => b2.has(x))).size;

    return (2 * intersection) / (b1.size + b2.size);
  }

  /** Tính similarity giữa 2 dòng đơn */
  private static lineSimilarity(line1: string, line2: string): number {
    return this.calculateSimilarity(line1.replace(/\s+/g, ''), line2.replace(/\s+/g, ''));
  }

  /** Lấy character index từ line index */
  private static getCharacterIndex(content: string, lineIndex: number): number {
    const lines = content.split(/\r?\n/);
    let index = 0;
    for (let i = 0; i < lineIndex; i++) {
      index += lines[i].length + 1; // +1 cho newline
    }
    return index;
  }
}