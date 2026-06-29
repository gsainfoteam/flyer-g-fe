import type { NoticeContent } from "../../types/content";
import { PosterDisplayCard } from "./PosterDisplayCard";

interface GridDisplayProps {
  contents: NoticeContent[];
}

export function GridDisplay({ contents }: GridDisplayProps) {
  return (
    <section className="grid h-full min-h-0 grid-cols-4 grid-rows-2 gap-4">
      {contents.slice(0, 8).map((content) => (
        <PosterDisplayCard key={content.id} content={content} compact />
      ))}
    </section>
  );
}
