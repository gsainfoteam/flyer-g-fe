import type { NoticeContent } from "../../types/content";
import { PosterDisplayCard } from "./PosterDisplayCard";

interface SplitDisplayProps {
  contents: NoticeContent[];
}

export function SplitDisplay({ contents }: SplitDisplayProps) {
  return (
    <section className="mx-auto grid h-full min-h-0 max-w-[680px] grid-cols-2 gap-6">
      {contents.slice(0, 2).map((content) => (
        <PosterDisplayCard key={content.id} content={content} />
      ))}
    </section>
  );
}
