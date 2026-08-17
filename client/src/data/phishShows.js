// NOTE: placeholder tour dates. Replace with the real Phish schedule before launch.
// Dates are future-facing so listings/deadlines behave correctly.
export const PHISH_SHOWS = [
  { id: 1, date: '2026-08-28', venue: "Dick's Sporting Goods Park", city: 'Denver, CO' },
  { id: 2, date: '2026-08-29', venue: "Dick's Sporting Goods Park", city: 'Denver, CO' },
  { id: 3, date: '2026-08-30', venue: "Dick's Sporting Goods Park", city: 'Denver, CO' },
  { id: 4, date: '2026-10-16', venue: 'Madison Square Garden', city: 'New York, NY' },
  { id: 5, date: '2026-10-17', venue: 'Madison Square Garden', city: 'New York, NY' },
  { id: 6, date: '2026-10-18', venue: 'Madison Square Garden', city: 'New York, NY' },
  { id: 7, date: '2026-12-28', venue: 'Madison Square Garden', city: 'New York, NY' },
  { id: 8, date: '2026-12-29', venue: 'Madison Square Garden', city: 'New York, NY' },
  { id: 9, date: '2026-12-30', venue: 'Madison Square Garden', city: 'New York, NY' },
  { id: 10, date: '2026-12-31', venue: 'Madison Square Garden', city: 'New York, NY' },
  { id: 11, date: '2027-07-23', venue: 'Deer Creek Music Center', city: 'Noblesville, IN' },
  { id: 12, date: '2027-07-24', venue: 'Deer Creek Music Center', city: 'Noblesville, IN' },
];

// Only shows whose date is today or later. Use this for listing dropdowns so
// nobody can list or buy a ticket to a show that already happened.
export const UPCOMING_SHOWS = PHISH_SHOWS.filter((s) => {
  const showEnd = new Date(s.date + 'T23:59:59');
  return showEnd >= new Date();
});
