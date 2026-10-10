export const BILAN_MONTHS = [
  { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' }, { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' }, { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
];

export function formatBilanMonth(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value || '');
  return match ? `${BILAN_MONTHS[Number(match[2]) - 1].label.toLowerCase()} ${match[1]}` : '';
}
