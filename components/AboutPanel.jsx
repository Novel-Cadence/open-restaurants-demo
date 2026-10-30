export default function AboutPanel() {
  return (
    <section
      aria-labelledby="hours-rules-heading"
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 id="hours-rules-heading" className="text-lg font-medium">
        How hours work
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        <li>A day that is not listed is closed.</li>
        <li>Times are local time.</li>
        <li>
          Opening time counts as open, and closing time counts as closed. A
          restaurant that closes at 9 pm is closed at 9:00 pm.
        </li>
        <li>Hours that run past midnight stay open into the next day.</li>
      </ul>
    </section>
  );
}
