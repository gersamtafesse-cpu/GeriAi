import { memo, useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { ChatSession } from '../types/chat';
import type { Translations } from '../data/translations';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  t: Translations;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClearAll: () => void;
  onCloseDesktop: () => void;
  onCloseMobile: () => void;
  onOpenAboutCreator: () => void;
}

type DateGroup = 'today' | 'yesterday' | 'week' | 'older';

function getDateGroup(timestamp: number, startOfToday: number): DateGroup {
  const oneDay = 24 * 60 * 60 * 1000;

  if (timestamp >= startOfToday) return 'today';
  if (timestamp >= startOfToday - oneDay) return 'yesterday';
  if (timestamp >= startOfToday - 7 * oneDay) return 'week';
  return 'older';
}

export const Sidebar = memo(function Sidebar({
  chats,
  activeChatId,
  isDesktopOpen,
  isMobileOpen,
  t,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClearAll,
  onCloseDesktop,
  onCloseMobile,
  onOpenAboutCreator,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isMobileOpen, onCloseMobile]);

  const { filteredChats, grouped } = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const filtered = trimmedQuery
      ? chats.filter(
          (chat) =>
            chat.title.toLowerCase().includes(trimmedQuery) ||
            chat.messages.some((m) => m.content.toLowerCase().includes(trimmedQuery))
        )
      : chats;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const groups: Record<DateGroup, ChatSession[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    for (const chat of filtered) {
      groups[getDateGroup(chat.updatedAt, startOfToday)].push(chat);
    }

    return { filteredChats: filtered, grouped: groups };
  }, [chats, searchQuery]);

  const groupOrder: DateGroup[] = ['today', 'yesterday', 'week', 'older'];

  const renderSidebarBody = (isMobile: boolean) => (
    <div className="flex h-full flex-col bg-slate-100/95 text-slate-900 dark:bg-zinc-900/95 dark:text-zinc-100">
      {/* Brand + Collapse Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-3.5 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo className="h-7 w-7 shrink-0" />
          <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            {t.brandName}
          </span>
        </div>

        <button
          type="button"
          onClick={isMobile ? onCloseMobile : onCloseDesktop}
          aria-label={t.closeSidebar}
          title={t.closeSidebar}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-75 hover:bg-slate-200/80 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {isMobile ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* New Chat Button + Search */}
      <div className="space-y-2.5 p-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            if (isMobile) onCloseMobile();
          }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors duration-75 hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">{t.newChat}</span>
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchHistory}
            aria-label={t.searchHistory}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-8 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-teal-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t.cancel}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat History List */}
      <div className="geriai-scroll flex-1 overflow-y-auto px-2.5 pb-3">
        {chats.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
            {t.noHistory}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
            {t.noSearchResults}
          </div>
        ) : (
          <div className="space-y-4">
            {groupOrder.map((groupKey) => {
              const items = grouped[groupKey];
              if (items.length === 0) return null;

              return (
                <div key={groupKey}>
                  <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 dark:text-zinc-400">
                    {t.groups[groupKey]}
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((chat) => {
                      const isActive = chat.id === activeChatId;
                      return (
                        <li key={chat.id} className="group relative flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectChat(chat.id);
                              if (isMobile) onCloseMobile();
                            }}
                            className={`flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 pr-9 text-left text-xs transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                              isActive
                                ? 'bg-white font-semibold text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                                : 'font-medium text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                            }`}
                          >
                            <MessageSquare
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive
                                  ? 'text-teal-700 dark:text-teal-400'
                                  : 'text-slate-400 dark:text-zinc-500'
                              }`}
                            />
                            <span className="truncate">{chat.title || t.untitledChat}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            aria-label={t.deleteChat}
                            title={t.deleteChat}
                            className={`absolute right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-opacity duration-75 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-red-600 dark:text-zinc-500 dark:hover:bg-red-950/60 dark:hover:text-red-400 ${
                              isActive
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar Footer: Clear History + About Creator */}
      <div className="shrink-0 space-y-1.5 border-t border-slate-200 p-3 dark:border-zinc-800">
        {chats.length > 0 && (
          confirmClear ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                {t.confirmClear}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {t.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors duration-75 hover:bg-slate-200/70 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.clearHistory}</span>
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => {
            onOpenAboutCreator();
            if (isMobile) onCloseMobile();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 transition-colors duration-75 hover:border-teal-600/40 hover:bg-white hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-teal-500/40 dark:hover:bg-zinc-800 dark:hover:text-teal-300"
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{t.aboutCreator}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      {isDesktopOpen && (
        <aside className="hidden h-full w-[272px] shrink-0 border-r border-slate-200 md:block dark:border-zinc-800">
          {renderSidebarBody(false)}
        </aside>
      )}

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[280px] max-w-[85vw] border-r border-slate-200 shadow-xl dark:border-zinc-800">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
});
