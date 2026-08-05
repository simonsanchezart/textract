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
          className={`size-${size} ${disabled ? "opacity-20 pointer-events-none" : "button-icon"
          } ${isToggle ? (active ? "text-primary" : "opacity-40") : ""}`}
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
