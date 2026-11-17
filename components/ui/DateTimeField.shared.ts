import { sameLocalDay } from './dateValue';

/** One minute in ms. */
export const MIN = 60 * 1000;

/** "Today, 3:42 PM" · "Yesterday, 11:05 PM" · "Mon, Nov 10, 6:30 AM". */
export const formatDateTime = (d: Date, now = new Date()) => {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day = sameLocalDay(d, now)
    ? 'Today'
    : sameLocalDay(d, yesterday)
    ? 'Yesterday'
    : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};

/** Quick "… ago" chips shown above the picker on every platform. */
export const QUICK = [
  { label: 'Now', minutes: 0 },
  { label: '15 min ago', minutes: 15 },
  { label: '30 min ago', minutes: 30 },
  { label: '1 hr ago', minutes: 60 },
];
