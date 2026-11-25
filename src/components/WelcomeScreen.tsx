import { memo } from 'react';
import { Code2, Compass, ImagePlus, Sparkles } from 'lucide-react';
import type { Translations } from '../data/translations';
import { BrandLogo } from './BrandLogo';

interface WelcomeScreenProps {
  t: Translations;
  onSelectStarter: (prompt: string, isImage?: boolean) => void;
}

function StarterIcon({ id, isImage }: { id: string; isImage?: boolean }) {
  if (isImage || id.includes('image')) {
    return <ImagePlus className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />;
  }
  if (id.includes('code')) {
    return <Code2 className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />;
  }
  if (id.includes('business')) {
    return <Compass className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />;
  }
  return <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />;
}

export const WelcomeScreen = memo(function WelcomeScreen({
  t,
  onSelectStarter,
}: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 rounded-2xl border border-slate-200/85 bg-white/95 p-3.5 shadow-sm dark:border-zinc-800/85 dark:bg-zinc-900/95">
        <BrandLogo className="h-10 w-10" />
      </div>

      <h1 className="max-w-xl text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-zinc-50">
        {t.welcomeTitle}
      </h1>

      <p className="mt-3 max-w-md text-base font-normal leading-relaxed text-slate-600 sm:text-lg dark:text-zinc-300">
        {t.welcomeSubtitle}
      </p>

      {/* Quick Starter Suggestion Chips */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        {t.starterChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelectStarter(chip.prompt, chip.isImage)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs transition-colors duration-75 hover:border-teal-600/40 hover:bg-white hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-800/90 dark:bg-zinc-900/95 dark:text-zinc-200 dark:hover:border-teal-500/40 dark:hover:bg-zinc-800 dark:hover:text-teal-300"
          >
            <StarterIcon id={chip.id} isImage={chip.isImage} />
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
