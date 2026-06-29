import { CalendarDays, ChevronRight, MapPin, Users } from "lucide-react";
import type { NoticeContent } from "../../types/content";
import { Logo } from "../common/Logo";
import { PosterArtwork } from "../common/PosterArtwork";
import { QRCodeBox } from "../common/QRCodeBox";

interface SinglePosterDisplayProps {
  current: NoticeContent;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-2.5 py-1.5 text-base font-black text-violet-700">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="text-xl font-bold text-gray-700">{value}</span>
    </div>
  );
}

export function SinglePosterDisplay({ current }: SinglePosterDisplayProps) {
  const formattedDate = current.startDate.replaceAll("-", ". ");

  return (
    <div className="relative h-full">
      <div className="absolute right-1 top-1 text-right">
        <p className="text-lg font-black text-gray-500">2026. 06. 05. (금)</p>
        <p className="text-4xl font-black tracking-tight text-gray-900">
          10:30 <span className="text-2xl">AM</span>
        </p>
      </div>

      <div className="flex h-full items-stretch gap-8 pr-44">
        <section className="flex w-[36%] shrink-0 flex-col py-2">
          <Logo size="lg" />

          <div className="mt-10">
            <span className="inline-flex rounded-lg bg-violet-600 px-4 py-1.5 text-lg font-black text-white">
              {current.category}
            </span>
            <h1 className="mt-6 break-keep text-6xl font-black leading-[1.08] tracking-tight text-gray-900">
              {current.title}
            </h1>
            <div className="mt-5 inline-block">
              <p className="text-2xl font-bold text-gray-500">
                {current.subtitle}
              </p>
              <span className="mt-2 block h-1 w-28 rounded-full bg-[#F15A24]" />
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <InfoRow
              icon={CalendarDays}
              label="일시"
              value={`${formattedDate} 13:30`}
            />
            {current.location && (
              <InfoRow icon={MapPin} label="장소" value={current.location} />
            )}
            <InfoRow icon={Users} label="주최" value={current.organizer} />
          </div>

          <div className="mt-auto flex items-center gap-5">
            <QRCodeBox value={current.qrCodeUrl} size="xl" />
            <div>
              <p className="text-lg font-bold text-gray-600">
                더 많은 공지와 정보를
                <br />
                확인해보세요!
              </p>
              <a
                href={current.linkUrl}
                className="mt-2 inline-flex items-center gap-1 text-xl font-black text-violet-700"
              >
                지글(Ziggle) 바로가기 <ChevronRight className="size-5" />
              </a>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center">
          <div className="aspect-[3/4] h-full max-h-full overflow-hidden rounded-3xl bg-white shadow-2xl shadow-violet-300/40 ring-1 ring-gray-100">
            <PosterArtwork content={current} fit="cover" />
          </div>
        </section>
      </div>
    </div>
  );
}
