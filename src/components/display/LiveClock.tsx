import { useEffect, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatClock(now: Date) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const weekday = WEEKDAYS[now.getDay()];
  const hours24 = now.getHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return {
    date: `${y}. ${m}. ${d}. (${weekday})`,
    time: `${hours12}:${minutes}`,
    period,
  };
}

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { date, time, period } = formatClock(now);

  return (
    <div className="text-right">
      <p className="text-lg font-black text-gray-500">{date}</p>
      <p className="text-4xl font-black tracking-tight text-gray-900">
        {time} <span className="text-2xl">{period}</span>
      </p>
    </div>
  );
}
