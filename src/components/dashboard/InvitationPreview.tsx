import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { previewMomentOf, type GalleryItem } from "@/lib/dashboard";
import {
  createDefaultDesign,
  normalizeDesign,
  visiblePages,
  type DesignPage,
} from "@/lib/design";
import { contentFromInvitation, draftFromTemplate } from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function StaticDesign({
  page,
  imageUrls,
  rtl,
  className,
}: {
  page: DesignPage | null;
  imageUrls: Record<string, string>;
  rtl: boolean;
  className?: string;
}) {
  if (!page) return null;
  return (
    <DesignStage className={cn("w-full bg-[var(--paper-light)]", className)}>
      {() => (
        <DesignPageView
          page={page}
          time={previewMomentOf(page)}
          imageUrls={imageUrls}
          guestName={null}
          rtl={rtl}
          reducedMotion
          scrollActivationTime={0}
        />
      )}
    </DesignStage>
  );
}

/**
 * The real saved design, rendered exactly as the studio and the public page
 * render it. The card's visual identity — palette, type, ornament, artwork and
 * images — comes from the invitation itself, never from stock imagery.
 */
export function InvitationPreview({
  invitation,
  className,
}: {
  invitation: GalleryItem;
  className?: string;
}) {
  const content = useMemo(() => contentFromInvitation(invitation), [invitation]);
  const page = useMemo(() => {
    if (!invitation.design) return null;
    return visiblePages(normalizeDesign(invitation.design, content))[0] ?? null;
  }, [content, invitation.design]);

  // Invitations saved before the canvas exist only as content. They still get
  // their own real card rather than a placeholder.
  if (!page) {
    return (
      <div className={cn("w-full", className)}>
        <InvitationCanvas content={content} />
      </div>
    );
  }

  return (
    <StaticDesign
      page={page}
      imageUrls={invitation.designImageUrls ?? {}}
      rtl={Boolean(content.rtl)}
      className={className}
    />
  );
}

/** A design from the collection, for the create flow and the empty atelier. */
export function TemplatePreview({
  templateId,
  className,
}: {
  templateId: string;
  className?: string;
}) {
  const content = useMemo(() => draftFromTemplate(templateId), [templateId]);
  const page = useMemo(
    () => visiblePages(createDefaultDesign(content))[0] ?? null,
    [content],
  );
  return (
    <StaticDesign
      page={page}
      imageUrls={{}}
      rtl={Boolean(content.rtl)}
      className={className}
    />
  );
}

/** The blank starting point, shown with the same renderer as every other card. */
export function BlankPreview({
  content,
  className,
}: {
  content: ReturnType<typeof draftFromTemplate>;
  className?: string;
}) {
  const page = useMemo(
    () => visiblePages(createDefaultDesign(content))[0] ?? null,
    [content],
  );
  return (
    <StaticDesign
      page={page}
      imageUrls={{}}
      rtl={Boolean(content.rtl)}
      className={className}
    />
  );
}
