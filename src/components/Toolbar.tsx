import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/Tooltip";

type ToolbarActionProps = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: number;
  tooltip?: string;
  disabled?: boolean;
  /** Visually highlights the action, e.g. for a toggled-on mode. */
  active?: boolean;
  onClick?: () => void | Promise<void>;
};

export function ToolbarAction({ Icon, onClick, disabled = false, active = false, tooltip, size = 6 }: ToolbarActionProps) {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <Icon
          className={`size-${size} ${disabled ? "opacity-20 pointer-events-none" : "button-icon"
          } ${active ? "text-primary" : ""}`}
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
