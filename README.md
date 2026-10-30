# Open restaurants finder

See which restaurants are open at a date and time you choose. The page lists every place from the included sample dataset that is open then.

Live page: https://www.novelcadence.com/demos/open-restaurants

## Hours

Each restaurant has weekly hours such as `Mon-Thu, Sun 11:30 am - 9 pm`.

- A day that is not listed is closed.
- Times are local, with no time zones.
- The opening time is inclusive and the closing time is exclusive. A place that closes at 9 pm is closed at 9:00 pm.
- When the close is at or before the open, hours continue past midnight into the next day. Hours that run past Sunday midnight carry into Monday.
- A close of 12 am is the end of that same day.

## Run

```bash
npm install
npm run dev
```

`npm test` runs the parser and query tests. `npm run build` writes a static bundle to `dist/`.

## Data

`data/rest_hours.json` is sample data included for demonstration. The live page uses this same dataset.
