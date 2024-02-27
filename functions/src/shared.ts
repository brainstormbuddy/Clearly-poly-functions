import {
  add,
  isAfter,
  startOfMonth,
  startOfWeek,
  startOfYesterday,
} from "date-fns";

export function getStartTime(frequency: "Daily" | "Weekly" | "Monthly") {
  switch (frequency) {
    case "Daily": // yesterday 8pm
      return add(startOfYesterday(), { hours: 3 }).getTime();
    case "Weekly": // last saturday at 8 pm
      return add(startOfWeek(new Date()), { hours: 3 }).getTime();
    case "Monthly": // first day of month at 8 pm
      return add(startOfMonth(startOfYesterday()), { hours: 27 }).getTime();
  }
}

export function inDateRange(type: "day" | "week" | "month", date: number) {
  switch (type) {
    case "day":
      return isAfter(new Date(date), getStartTime("Daily"));
    case "week":
      return isAfter(new Date(date), getStartTime("Weekly"));
    case "month":
      return isAfter(new Date(date), getStartTime("Monthly"));
  }
}

export function combinations(array: Array<any>) {
  let result: Array<any> = [];
  let f = (prefix: any, arr: any) => {
    arr.forEach((item: any, index: any) => {
      result.push([...prefix, item]);
      f([...prefix, item], arr.slice(index + 1));
    });
  };
  f([], array);

  return result;
}
