import { STORY_TAG_LABELS } from "@/entities/submission/model/types";
import { useRecentStories } from "@/features/submissions/api/queries";

/**
 * 사용자 홈 옆 칸의 "지금 TV의 제보" (기획 4-1, `GET /signage/stories/recent`).
 *
 * 지금 TV에 걸린 제보를 최근 승인 순으로 몇 개 보여 준다. 작성자는 오지 않는다.
 * 걸린 제보가 없거나 불러오지 못하면 칸을 그리지 않는다. 홈의 곁가지 정보라 빈 칸이나
 * 오류 안내를 둘 만큼 중요하지 않다.
 */
const SHOWN = 3;

export function RecentStories() {
  const stories = useRecentStories(SHOWN);
  if (!stories.data || stories.data.length === 0) return null;

  return (
    <section
      aria-labelledby="recent-stories"
      className="rounded-block bg-surface px-6 py-5.5 ring-1 ring-line"
    >
      <h2 id="recent-stories" className="mb-3 text-subhead text-ink">
        지금 TV의 제보
      </h2>
      <ul className="flex flex-col gap-3.5">
        {stories.data.map((story) => (
          <li key={story.storyNumber}>
            <p className="flex items-center gap-1.5 text-caption">
              <span className="inline-flex h-5 items-center rounded-pill bg-type-story-subtle px-2 font-bold text-type-story">
                {STORY_TAG_LABELS[story.tag]}
              </span>
              <span className="text-ink-subtle tabular-nums">
                #{story.storyNumber}
              </span>
            </p>
            <p className="mt-1 line-clamp-2 text-label text-ink">
              {story.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
