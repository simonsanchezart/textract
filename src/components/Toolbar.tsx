import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/Tooltip";

type ToolbarActionProps = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: number;
  tooltip?: string;
  disabled?: boolean;
  /**
   * Marks this action as a stateful toggle (e.g. a mode switch), not a
   * momentary action like Load/Convert. Pass `true`/`false` for its current
   * state — when active it's highlighted, when inactive it's dimmed rather
   * than shown at full brightness, so a group of mode toggles makes the
   * current mode visually obvious. Omit entirely for plain action buttons.
   */
  active?: boolean;
  onClick?: () => void | Promise<void>;
};

export function ToolbarAction({ Icon, onClick, disabled = false, active, tooltip, size = 6 }: ToolbarActionProps) {
  const isToggle = active !== undefined;

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <Icon
          // `!opacity-*`/`!text-*` (Tailwind's important-modifier) are required here:
          // .button-icon already bakes in its own opacity-50/hover:opacity-100, which
          // otherwise wins the cascade over a plain (non-important) utility and made
          // the active/inactive states barely distinguishable.
          className={`size-${size} ${disabled ? "opacity-20 pointer-events-none" : "button-icon"
          } ${isToggle ? (active ? "!opacity-100 !text-primary" : "!opacity-30") : ""}`}
          onClick={disabled ? undefined : onClick}
        />
      </TooltipTrigger>

      {tooltip
        && (
          <TooltipContent side="bottom">
            <span>{tooltip}</span>
          </TooltipContent>
        )}
    </Tooltip>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex text-center items-center absolute top-0 left-0 bg-dark-main-darker p-2 rounded-b-xl gap-2">
      {children}
    </div>
  );
}
