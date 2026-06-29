export type ContentStatus = "published" | "scheduled" | "pending" | "ended";

export type ContentCategory = "공지" | "동아리" | "공연" | "행사" | "학과";

export interface NoticeContent {
  id: string;
  title: string;
  subtitle?: string;
  category: ContentCategory;
  organizer: string;
  status: ContentStatus;
  startDate: string;
  endDate?: string;
  location?: string;
  description?: string;
  posterUrl: string;
  linkUrl: string;
  qrCodeUrl: string;
  views: number;
  likes?: number;
}
