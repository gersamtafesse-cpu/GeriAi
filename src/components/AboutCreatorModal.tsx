import { memo, useEffect } from 'react';
import { GraduationCap, Quote, School, X } from 'lucide-react';
import type { Language } from '../types/chat';
import type { Translations } from '../data/translations';
import { BrandLogo } from './BrandLogo';

interface AboutCreatorModalProps {
  isOpen: boolean;
  uiLanguage: Language;
  t: Translations;
  onClose: () => void;
}

export const AboutCreatorModal = memo(function AboutCreatorModal({
  isOpen,
  uiLanguage,
  t,
  onClose,
}: AboutCreatorModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeBio = uiLanguage === 'am' ? t.creatorBioAm : t.creatorBioEn;
  const storyHeading =
    uiLanguage === 'am' ? t.creatorAmharicLabel : t.creatorEnglishLabel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-creator-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/55"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="h-6 w-6 shrink-0" />
            <h2
              id="about-creator-title"
              className="text-base font-bold tracking-tight text-slate-900 dark:text-zinc-50"
            >
              {t.creatorModalTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeModal}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile Body */}
        <div className="geriai-scroll flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {/* Identity Summary */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-lg font-bold tracking-tight text-white dark:bg-teal-600">
              GT
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
                {t.creatorNameLabel}
              </p>
              <h3 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-50">
                {t.creatorName}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-600 tabular-nums dark:text-zinc-400">
                <GraduationCap className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />
                <span>{t.creatorRole}</span>
              </p>
            </div>
          </div>

          {/* Structured Key-Value Profile Metadata */}
          <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-zinc-800">
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                {t.creatorAgeLabel}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums dark:text-zinc-100">
                {t.creatorAgeValue}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                {t.creatorEducationLabel}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums dark:text-zinc-100">
                {t.creatorEducationValue}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                {t.creatorSchoolLabel}
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-100">
                <School className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
                <span>{t.creatorSchoolValue}</span>
              </dd>
            </div>
          </dl>

          {/* Inspiring Founder Story (in active UI language) */}
          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              {storyHeading}
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-zinc-200">
              {activeBio}
            </p>
          </div>

          {/* Motivating Quote Highlight */}
          <div className="mt-4 rounded-xl border border-teal-600/20 bg-teal-50/70 px-4 py-3 dark:border-teal-500/25 dark:bg-teal-950/35">
            <div className="flex items-start gap-2.5">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
              <p className="text-xs font-medium leading-relaxed text-teal-950 dark:text-teal-100">
                {t.creatorQuote}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50/70 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
});
