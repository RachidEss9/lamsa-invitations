import { useEffect, useRef, useState } from "react";
import { personalize, type ClosingSettings } from "@/lib/design";

interface ClosingStageProps {
  /** The invitation's closing section, when it has one. */
  closing?: ClosingSettings;
  accent?: string;
  guestName?: string | null;
  names?: string;
  /** Replays the forwarding flourish. */
  onReplay?: () => void;
}

/**
 * The closing flourish the guest sees after the final section. When a
 * closing belongs to the invitation it animates the first name, hands over to
 * the party details, and pauses on a live "forward to a friend" flourish that
 * scribbles the invitation on to paper behind the recipient's name.
 */
export function ClosingStage({
  closing,
  accent = "#5b4a3a",
  guestName,
  names,
  onReplay,
}: ClosingStageProps) {
  const [playCount, setPlayCount] = useState(0);
  const lastPlay = useRef(0);
  const id = playCount;

  useEffect(() => {
    if (!closing?.enabled || !onReplay) return;
    const now = performance.now();
    if (now - lastPlay.current < 900) return;
    lastPlay.current = now;
    setPlayCount((c) => c + 1);
    onReplay();
  }, [closing, onReplay, id]);

  const showClosing = closing?.enabled ?? false;
  return showClosing ? (
    <section className="absolute inset-0 flex flex-col justify-center items-center px-8 text-center">
      <p
        className="text-2xl font-cursive tracking-wide opacity-90"
        style={{ color: accent }}
      >
        {personalize(names ?? "", guestName ?? "")}
      </p>
      <p
        className="mt-2 text-sm tracking-widest uppercase opacity-80"
        style={{ color: accent }}
      >
        {closing!.message}
      </p>

      {/* Forwards flourish: the invitation materialises on paper behind the
          guest's name, then each tap of the flourish re-runs the "receive"
          animation. */}
      <div
        className="mt-8 flex items-center gap-3 text-sm tracking-wider uppercase"
        style={{ color: accent }}
      >
        <ArrowDot left />
        Forward to a friend
      </div>
    </section>
  ) : null;
}

function ArrowDot({ left }: { left?: boolean }) {
  const base = `h-4 w-4 shrink-0 rounded-full ${left ? "ml-1" : "mr-1"}`;
  return <span className={base} />;
}
