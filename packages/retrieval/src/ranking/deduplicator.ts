export interface SnippetSpan {
  filePath: string;
  startLine: number;
  endLine: number;
}

export class SnippetDeduplicator {
  /**
   * Deduplicates candidates that overlap significantly within the same file.
   * Preserves higher-ranked candidates.
   */
  public deduplicate<T extends SnippetSpan>(
    items: T[],
    overlapThreshold = 0.6
  ): T[] {
    const retained: T[] = [];

    for (const candidate of items) {
      let isDuplicate = false;

      for (const accepted of retained) {
        if (candidate.filePath !== accepted.filePath) continue;

        // Check line overlap
        const overlapStart = Math.max(candidate.startLine, accepted.startLine);
        const overlapEnd = Math.min(candidate.endLine, accepted.endLine);

        if (overlapEnd >= overlapStart) {
          const overlapLines = overlapEnd - overlapStart + 1;
          const candidateSpan = candidate.endLine - candidate.startLine + 1;
          const acceptedSpan = accepted.endLine - accepted.startLine + 1;

          const ratioCandidate = overlapLines / candidateSpan;
          const ratioAccepted = overlapLines / acceptedSpan;

          if (ratioCandidate >= overlapThreshold || ratioAccepted >= overlapThreshold) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate) {
        retained.push(candidate);
      }
    }

    return retained;
  }
}
