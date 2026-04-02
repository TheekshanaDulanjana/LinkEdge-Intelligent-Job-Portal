import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-slate-50 font-sans dark:bg-black min-h-screen">
      <main className="flex w-full max-w-5xl flex-col items-center justify-center py-20 px-6 text-center sm:px-12">
        
        {/* Headline and Subtext Area */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Find Your Dream Job or Hire Top Talent
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            An intelligent platform connecting job seekers with companies using smart CV matching and automated career pathing.
          </p>
        </div>

        {/* Search Bar Box */}
        <div className="flex flex-col sm:flex-row w-full max-w-4xl gap-4 mb-10 p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-slate-200 dark:border-zinc-800">
          <input
            type="text"
            placeholder="Job title, skills, or keywords"
            className="flex-1 px-5 py-4 text-slate-900 bg-slate-100 rounded-xl dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="text"
            placeholder="Location"
            className="flex-1 px-5 py-4 text-slate-900 bg-slate-100 rounded-xl dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button className="px-8 py-4 font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
            Search Jobs
          </button>
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row w-full justify-center">
          <a
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-slate-900 px-8 text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
            href="#"
          >
            Upload CV for AI Match
          </a>
          <a
            className="flex h-14 items-center justify-center rounded-full border border-solid border-slate-300 px-8 transition-colors hover:bg-slate-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800"
            href="#"
          >
            Post a Job
          </a>
        </div>

      </main>
    </div>
  );
}