import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">HabitForge</h1>
      <p className="mt-2 text-gray-600">Track your daily and weekly habits.</p>
      <Link
        href="/habits"
        className="mt-4 inline-block rounded bg-black px-4 py-2 text-white"
      >
        View habits
      </Link>
    </main>
  );
}