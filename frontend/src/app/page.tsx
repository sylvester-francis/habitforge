import Link from "next/link";

export default function Home() {
    return (
        <main className="mx-auto flex min-h-[90vh] max-w-2xl flex-col justify-center px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-ember">
                Daily &middot; Weekly
            </p>
            <h1 className="mt-5 font-display text-6xl font-black leading-[0.95] tracking-tight text-cream sm:text-7xl">
                Habit<span className="text-ember">Forge</span>
            </h1>
            <p className="mt-5 max-w-md font-display text-xl italic text-cream-dim">
                Discipline is forged, not found. Track your daily and weekly
                habits, one streak at a time.
            </p>
            <div className="mt-10">
                <Link
                    href="/habits"
                    className="group inline-flex items-center gap-2 rounded-full bg-ember px-7 py-3 font-medium text-ash shadow-[0_0_30px_-6px_var(--color-ember)] transition-all hover:bg-ember-glow hover:shadow-[0_0_38px_-4px_var(--color-ember)]"
                >
                    Enter the forge
                    <span className="transition-transform group-hover:translate-x-1">
                        &rarr;
                    </span>
                </Link>
            </div>
        </main>
    );
}
