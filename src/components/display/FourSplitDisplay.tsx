import type { NoticeContent } from "../../types/content";
import { PosterDisplayCard } from "./PosterDisplayCard";

interface FourSplitDisplayProps {
  contents: NoticeContent[];
}

export function FourSplitDisplay({ contents }: FourSplitDisplayProps) {
  return (
    <section className="mx-auto grid h-full min-h-0 max-w-[760px] grid-cols-2 grid-rows-2 gap-6">
      {contents.slice(0, 4).map((content) => (
        <PosterDisplayCard key={content.id} content={content} />
      ))}
    </section>
  );
}
