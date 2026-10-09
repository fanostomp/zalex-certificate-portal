type CertificateDate = {
  year: number;
  month: number;
  day: number;
  isoDate: string;
  // A date-only comparison value; no timezone or timestamp is involved.
  sortValue: number;
};

export function parseCertificateDate(value: string): CertificateDate | null {
  const match = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(\d{4})$/.exec(value);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1) return null;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return null;

  return {
    year,
    month,
    day,
    isoDate: `${match[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    sortValue: year * 10000 + month * 100 + day,
  };
}

export function formatApiDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const date = match ? parseCertificateDate(`${match[2]}/${match[3]}/${match[1]}`) : null;
  if (!date) throw new Error('Invalid certificate date');
  return `${date.month}/${date.day}/${String(date.year).padStart(4, '0')}`;
}
