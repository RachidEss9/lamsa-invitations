import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { Motif } from "@/components/invitation/Motif";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import {
  BUILTIN_ASSETS,
  BUILTIN_ASSET_CATEGORIES,
  type BuiltinAsset,
} from "@/lib/assets";
import { PAGE_LAYOUTS } from "@/lib/layouts";
import { REVEAL_PRESETS, type RevealPreset } from "@/lib/reveals";
import { BUILTIN_STYLES, type BuiltinStyle } from "@/lib/styles";
import { FONT_LIBRARY, fontById, fontFamilyFor } from "@/lib/fonts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
