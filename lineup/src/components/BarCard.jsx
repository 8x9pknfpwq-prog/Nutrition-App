import { Star, MapPin, BadgeCheck } from 'lucide-react';
import WaitBadge from './WaitBadge.jsx';
import Avatar from './Avatar.jsx';
import { timeAgo } from '../lib/wait.js';
import { displayWait, busynessLabel } from '../lib/busyness.js';

// A bar row in the bottom sheet. Tapping it opens the check-in sheet.
export default function BarCard({ bar, onClick }) {
  const friend = bar.checkins?.[0];
  const wait = displayWait(bar);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card active:scale-[0.99] transition-transform"
    >
      {/* Photo placeholder */}
      <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-stone-200 to-stone-300">
        <MapPin size={20} className="text-stone-400" />
        {friend && (
          <div className="absolute -bottom-1 -right-1">
            <Avatar initial={friend.avatarInitial} seed={friend.username} size={24} ring />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1 truncate text-[15px] font-semibold text-ink">
            <span className="truncate">{bar.name}</span>
            {bar.verified && (
              <BadgeCheck size={14} className="shrink-0 text-wait-green" aria-label="Verified on Google Maps" />
            )}
          </h3>
          <WaitBadge waitMin={wait.waitMin} est={!wait.isLive && !wait.closed} closed={wait.closed} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-0.5">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {bar.rating ? bar.rating.toFixed(1) : 'New'}
          </span>
          <span>·</span>
          <span>{bar.distance} mi</span>
          <span>·</span>
          <span>
            {wait.closed
              ? 'Closed now'
              : wait.isLive
              ? bar.reportCount === 1
                ? '1 report'
                : `${bar.reportCount} reports`
              : `${busynessLabel(wait.level)} now`}
          </span>
        </div>
        {friend ? (
          <p className="mt-1 truncate text-xs font-medium text-ink/80">
            {friend.username} checked in here · {timeAgo(friend.at)}
          </p>
        ) : (
          <p className="mt-1 truncate text-xs text-gray-400">{bar.address}</p>
        )}
      </div>
    </button>
  );
}
