import { InvitationJourney } from "@/components/invitation/InvitationJourney";
import type { DesignDocument } from "@/lib/design";

interface SequentialInvitationProps {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  names?: string;
  rtl?: boolean;
  reducedMotion: boolean;
  active: boolean;
  accent?: string;
  ink?: string;
  className?: string;
}

/**
 * The public invitation. All progression lives in `InvitationJourney`, shared
 * with the studio's guest preview so both render the same experience.
 */
export function SequentialInvitation({
  design,
  imageUrls,
  guestName,
  names,
  rtl,
  reducedMotion,
  active,
  accent = "#710014",
  ink = "#161616",
  className,
}: SequentialInvitationProps) {
  return (
    <InvitationJourney
      design={design}
      imageUrls={imageUrls}
      guestName={guestName}
      names={names}
      rtl={rtl}
      reducedMotion={reducedMotion}
      active={active}
      accent={accent}
      ink={ink}
      className={className}
    />
  );
}
