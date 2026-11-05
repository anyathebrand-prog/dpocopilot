/** True from 1 November to 31 December (WAT): the renewal season. */
export const renewalSeason = (today: string) => today.slice(5, 7) >= "11";
