import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Rookie Line works",
  description:
    "Rookie Line gives 911 trainees a caller who panics, stammers and gets cut off, voiced live by AssemblyAI's text-to-speech, and a scorecard that checks what they caught.",
};

const POLICE1 =
  "https://www.police1.com/innovation-report/the-future-of-the-telecommunicator-how-ai-is-changing-dispatcher-training";
const SIM911 = "https://arxiv.org/html/2412.16844v3";

export default function About() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="min-h-[52px] px-5 flex items-center gap-3.5 border-b border-line flex-wrap py-2">
        <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
          <rect x="6" y="10" width="36" height="28" rx="5" fill="var(--accent)" />
          <rect x="14" y="21" width="20" height="6" rx="3" fill="var(--accent-ink)" />
        </svg>
        <Link href="/" className="font-bold text-[17px] tracking-[-0.01em]">
          Rookie Line
        </Link>
        <span className="flex-1" />
        <Link href="/" className="h-10 px-4 rounded-md bg-accent text-accent-ink font-semibold inline-flex items-center">
          Take a call
        </Link>
      </header>

      <main className="max-w-[780px] mx-auto px-5 sm:px-8 py-14 flex flex-col gap-14">
        <section className="flex flex-col gap-5">
          <h1 className="m-0 text-[40px] sm:text-[56px] leading-[1.05] font-semibold tracking-[-0.02em]">
            Practice the 911 call before the real one
          </h1>
          <p className="m-0 text-xl leading-relaxed text-[#c3c9d1]">
            A caller who panics, stammers and gets cut off, voiced live by AssemblyAI&apos;s text-to-speech, and a
            scorecard that checks what you caught.
          </p>
          <p className="m-0 text-[17px] leading-relaxed text-ink-muted">
            New call-takers learn to pull an address out of a frightened caller by role-play, and a trainer has to play the
            caller for every repetition. One dispatch centre told Police1 that building that repetition &ldquo;often meant
            asking trainers to play the caller during role-playing exercises&rdquo; (
            <a className="underline underline-offset-4" href={POLICE1}>
              Police1, 2026
            </a>
            ); researchers working with a regional 911 centre call that role-play labor-intensive and time-consuming (
            <a className="underline underline-offset-4" href={SIM911}>
              Sim911, AAAI 2025
            </a>
            ). Rookie Line is a caller a trainee can practise on alone.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="m-0 text-2xl font-semibold">How it works</h2>
          <ol className="m-0 pl-0 list-none flex flex-col gap-3 text-[17px]">
            <li>
              <span className="font-mono text-ink-muted">1 · </span>Answer the ringing line. The caller is already talking, and
              she is scared.
            </li>
            <li>
              <span className="font-mono text-ink-muted">2 · </span>Hold Space and ask. Get the address and a callback number,
              read them back, and give her something to do. Talk over her and she stops mid-word.
            </li>
            <li>
              <span className="font-mono text-ink-muted">3 · </span>Hang up and read the scorecard: how long the address took,
              what you read back, what you missed, and how her panic moved and why.
            </li>
          </ol>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="m-0 text-2xl font-semibold">What it does that a script can&apos;t</h2>
          <div className="flex flex-col">
            <Proof title="She sounds frightened, and it changes">
              Her panic is a number from 0 to 10, kept in code. It picks how her lines are written: at the top she starts
              words twice, says &ldquo;uh&rdquo;, shouts one word and trails off; as she steadies, the same voice speaks in
              plain sentences. Say her name or tell her help is coming and it falls. Talk over her, leave her in silence or
              tell her to calm down and it rises. AssemblyAI&apos;s voice reads the stumbles exactly as written.
            </Proof>
            <Proof title="She keeps up with you">
              Measured in a browser run on 3 November 2026: her first words play about 0.3 s after you answer, and she
              starts answering about 0.8 s after you let go of Space. When you cut in, her audio stops at once and her
              caption ends at the last word you heard.
            </Proof>
            <Proof title="The facts come from code">
              The address and phone number are fixed in the scenario and filled in by code, and your read-back is compared
              digit by digit. A small model only phrases answers to questions the scenario did not plan for; any number it
              writes is removed, and if it is slow the caller falls back to a written line.
            </Proof>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="m-0 text-2xl font-semibold">Built on AssemblyAI</h2>
          <ul className="m-0 pl-5 flex flex-col gap-2 text-[17px] text-[#c3c9d1]">
            <li>
              Streaming text-to-speech: one session per call, written stumbles and cut-offs, digits read as written,
              Cancel when you cut in, word timings for the live captions, and a Mexican Spanish voice for line 3.
            </li>
            <li>Universal-3.6 Pro streaming speech-to-text: push-to-talk ends your turn at once, with the scenario&apos;s names as key terms.</li>
            <li>LLM Gateway: answers to unplanned questions, fenced by code.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-2xl font-semibold">Limits</h2>
          <ul className="m-0 pl-5 flex flex-col gap-2 text-[17px] text-ink-muted">
            <li>A training simulation. The callers, addresses and phone numbers are fictional.</li>
            <li>Three scenarios. Scoring checks facts and timing, not tone or protocol wording.</li>
            <li>Push-to-talk, not an open line, so her own voice cannot interrupt you through the speakers.</li>
            <li>English and Spanish only.</li>
          </ul>
        </section>

        <div>
          <Link href="/" className="h-12 px-5 rounded-md bg-accent text-accent-ink font-semibold inline-flex items-center">
            Take a call
          </Link>
        </div>
      </main>
    </div>
  );
}

function Proof({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-5 border-t border-line last:border-b flex flex-col gap-2">
      <h3 className="m-0 text-lg font-semibold">{title}</h3>
      <p className="m-0 text-[17px] leading-relaxed text-[#c3c9d1]">{children}</p>
    </div>
  );
}
