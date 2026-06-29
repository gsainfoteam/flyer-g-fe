import { useState } from "react";
import type { NoticeContent } from "../../types/content";

const gradients = [
  "from-violet-500 via-fuchsia-400 to-orange-300",
  "from-sky-400 via-violet-400 to-fuchsia-300",
  "from-emerald-400 via-teal-300 to-violet-300",
  "from-orange-400 via-rose-300 to-violet-400",
  "from-indigo-500 via-purple-400 to-pink-300",
  "from-amber-300 via-orange-300 to-violet-400",
  "from-rose-400 via-fuchsia-400 to-indigo-400",
  "from-teal-400 via-sky-400 to-violet-400",
];

interface PosterArtworkProps {
  content: NoticeContent;
  /** contain keeps the original vertical ratio (TV/canvas). cover fills the slot (thumbnails). */
  fit?: "contain" | "cover";
  className?: string;
}

export function PosterArtwork({
  content,
  fit = "contain",
  className = "",
}: PosterArtworkProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const gradient =
    gradients[Number(content.id.replace(/\D/g, "")) % gradients.length];

  if (!imageFailed) {
    return (
      <img
        src={content.posterUrl}
        alt={`${content.title} 포스터`}
        className={`${fit === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain"} ${className}`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between bg-gradient-to-br ${gradient} text-white ${className}`}
      style={{ containerType: "size", padding: "7cqw" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.45),transparent_30%),radial-gradient(circle_at_82%_2%,rgba(255,255,255,0.25),transparent_26%)]" />
      <div className="relative">
        <span
          className="inline-block rounded-full bg-white/25 font-black backdrop-blur"
          style={{ fontSize: "3.2cqw", padding: "1.4cqw 3cqw" }}
        >
          {content.category}
        </span>
      </div>
      <div className="relative" style={{ marginBottom: "1cqw" }}>
        <p className="font-bold text-white/85" style={{ fontSize: "3cqw" }}>
          {content.organizer}
        </p>
        <h3
          className="break-keep font-black tracking-tight"
          style={{ fontSize: "7.5cqw", lineHeight: 1.05, marginTop: "2cqw" }}
        >
          {content.title}
        </h3>
        <p
          className="break-keep font-semibold text-white/85"
          style={{ fontSize: "3.2cqw", marginTop: "2.5cqw" }}
        >
          {content.subtitle ?? content.description}
        </p>
      </div>
      <div className="relative flex items-end justify-between">
        <span className="font-bold text-white/85" style={{ fontSize: "3cqw" }}>
          {content.startDate.replaceAll("-", ".")}
        </span>
        <span
          className="grid place-items-center rounded-lg bg-white/25 font-black backdrop-blur"
          style={{ fontSize: "3cqw", padding: "2cqw 3cqw" }}
        >
          QR
        </span>
      </div>
    </div>
  );
}
