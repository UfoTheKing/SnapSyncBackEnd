import moment from 'moment';
/**
 * @method isEmpty
 * @param {String | Number | Object} value
 * @returns {Boolean} true & false
 * @description this value is Empty Check
 */
export const isEmpty = (value: string | number | object): boolean => {
  if (value === null) {
    return true;
  } else if (typeof value !== 'number' && value === '') {
    return true;
  } else if (typeof value === 'undefined' || value === undefined) {
    return true;
  } else if (value !== null && typeof value === 'object' && !Object.keys(value).length) {
    return true;
  } else {
    return false;
  }
};

// Calcolo la differenza tra due date e ritorno:
// se la differenza è minore di 1 minuto ritorno now
// 1 mn
// 1 hr
// 1 day
// 1 week
// 1 month
// 1 year

export const timeDifference = (current: Date, previous: Date): string => {
  const milliSecondsPerMinute = 60 * 1000;
  const milliSecondsPerHour = milliSecondsPerMinute * 60;
  const milliSecondsPerDay = milliSecondsPerHour * 24;
  const milliSecondsPerMonth = milliSecondsPerDay * 30;
  const milliSecondsPerYear = milliSecondsPerDay * 365;

  const elapsed = current.getTime() - previous.getTime();

  if (elapsed < milliSecondsPerMinute / 3) {
    return 'now';
  } else if (elapsed < milliSecondsPerMinute) {
    return '1 mn ago';
  } else if (elapsed < milliSecondsPerHour) {
    return Math.round(elapsed / milliSecondsPerMinute) + ' mn ago';
  } else if (elapsed < milliSecondsPerDay) {
    return Math.round(elapsed / milliSecondsPerHour) + ' hr ago';
  } else if (elapsed < milliSecondsPerMonth) {
    return Math.round(elapsed / milliSecondsPerDay) + ' days ago';
  } else if (elapsed < milliSecondsPerYear) {
    return Math.round(elapsed / milliSecondsPerMonth) + ' mo ago';
  } else {
    return Math.round(elapsed / milliSecondsPerYear) + ' years ago';
  }
};

export const generateRandomKey = () => {
  return Date.now() + '-' + Math.random().toString(36).substring(2, 15);
};

export const nowUtc = (): Date => {
  let now = moment.utc().toDate();

  return now;
};
