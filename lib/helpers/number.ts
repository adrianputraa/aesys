export const formatNumber = (value: string | number): string => {
  let realVal = 0;
  if (typeof value === 'string' && isNaN(Number(value))) {
    return '0'; // return as 0
  } else {
    realVal = Number(value);
  }

  return new Intl.NumberFormat('en-US').format(realVal);
};
