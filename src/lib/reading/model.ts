export interface ReadingHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface ReadingGroup {
  heading: ReadingHeading;
  children: ReadingHeading[];
}

export function majorReadingHeadings(headings: ReadingHeading[]): ReadingHeading[] {
  const depth = headings.some((heading) => heading.depth === 2) ? 2 : 3;
  const chapters = headings.filter((heading) => heading.depth === depth);
  return chapters.length > 1 ? chapters : [];
}

export function groupReadingHeadings(headings: ReadingHeading[]): ReadingGroup[] {
  const groups: ReadingGroup[] = [];
  for (const heading of headings) {
    if (heading.depth !== 2 && heading.depth !== 3) continue;
    const parent = groups.at(-1);
    if (heading.depth === 3 && parent?.heading.depth === 2) parent.children.push(heading);
    else groups.push({ heading, children: [] });
  }
  return groups;
}

export function readingFraction(
  scrollTop: number,
  proseTop: number,
  proseBottom: number,
  viewportHeight: number,
  safeOffset: number,
): number {
  const start = Math.max(0, proseTop - safeOffset);
  const end = proseBottom - viewportHeight;
  if (end <= start) return scrollTop + viewportHeight >= proseBottom ? 1 : 0;
  return Math.min(1, Math.max(0, (scrollTop - start) / (end - start)));
}

export function readingProgress(...geometry: Parameters<typeof readingFraction>): number {
  return Math.round(readingFraction(...geometry) * 100);
}

export function readingDogPosition(fraction: number, ballLeft: number, dogWidth: number): number {
  return Math.max(0, ballLeft - dogWidth - 8) * Math.min(1, Math.max(0, fraction));
}

export function readingDogFrame(position: number, reducedMotion: boolean, finished = false): number {
  return reducedMotion || finished ? 0 : Math.floor(Math.max(0, position) / 8) % 4;
}

export function activeHeadingIndex(positions: number[], readingLine: number, finished = false): number {
  if (!positions.length) return -1;
  if (finished) return positions.length - 1;
  let left = 0;
  let right = positions.length;
  while (left < right) {
    const middle = (left + right) >>> 1;
    if (positions[middle] <= readingLine) left = middle + 1;
    else right = middle;
  }
  return Math.max(0, left - 1);
}
