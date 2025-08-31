import { useState, useEffect } from "react";

export type ZoomLevel = "hour" | "day" | "week" | "year";

export function useViewport(initialZoom: ZoomLevel = "day") {
  const [zoom, setZoom] = useState<ZoomLevel>(initialZoom);
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  useEffect(() => {
    // Adjust viewport when zoom changes
    const now = new Date();
    const s = new Date(now);
    const e = new Date(now);
    switch (zoom) {
      case "hour":
        s.setHours(now.getHours() - 6);
        e.setHours(now.getHours() + 6);
        break;
      case "day":
        s.setDate(now.getDate() - 3);
        e.setDate(now.getDate() + 3);
        break;
      case "week":
        s.setDate(now.getDate() - 21);
        e.setDate(now.getDate() + 21);
        break;
      case "year":
        s.setFullYear(now.getFullYear() - 1);
        e.setFullYear(now.getFullYear() + 1);
        break;
    }
    setStartDate(s);
    setEndDate(e);
  }, [zoom]);

  const jumpToNow = () => {
    const now = new Date();
    const s = new Date(now);
    const e = new Date(now);
    switch (zoom) {
      case "hour":
        s.setHours(now.getHours() - 6);
        e.setHours(now.getHours() + 6);
        break;
      case "day":
        s.setDate(now.getDate() - 3);
        e.setDate(now.getDate() + 3);
        break;
      case "week":
        s.setDate(now.getDate() - 21);
        e.setDate(now.getDate() + 21);
        break;
      case "year":
        s.setFullYear(now.getFullYear() - 1);
        e.setFullYear(now.getFullYear() + 1);
        break;
    }
    setStartDate(s);
    setEndDate(e);
  };

  return {
    zoom,
    setZoom,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    jumpToNow,
  };
}
