export const formatLastUpdated = () =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date());

export const relativeTime = (iso?: string) => {
  if (!iso) return 'No sync yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No sync yet';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};
