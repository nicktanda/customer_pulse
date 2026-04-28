import { boardColumnLabel, type BoardStatusColumn } from "@/lib/discovery-board";

/** Activity type int (1–7) — used on the OST map and the old list view. */
export function discoveryOstMapActivityTypeLabel(type: number): string {
  switch (type) {
    case 1:
      return "Interview guide";
    case 2:
      return "Survey";
    case 3:
      return "Assumption map";
    case 4:
      return "Competitor scan";
    case 5:
      return "Data query";
    case 6:
      return "Desk research";
    case 7:
      return "Prototype hypothesis";
    default:
      return "Activity";
  }
}

export function discoveryOstMapActivityStatusLabel(status: number): string {
  if (status >= 1 && status <= 4) {
    return boardColumnLabel[status as BoardStatusColumn];
  }
  return "Unknown";
}
