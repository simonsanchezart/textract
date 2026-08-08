import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/Tooltip";

type ToolbarActionProps = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: number;
  tooltip?: string;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
};

export function ToolbarAction({ Icon, onClick, disabled = false, tooltip, size = 6 }: ToolbarActionProps) {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <Icon
          className={`size-${size} ${disabled ? "opacity-20 pointer-events-none" : "button-icon"
          }`}
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

const POSITION_CLASSES = {
  "top-left": "top-0 left-0 rounded-b-xl",
  "top-right": "top-0 right-0 rounded-b-xl",
} as const;

export function Toolbar({ children, position = "top-left" }: { children: ReactNode; position?: keyof typeof POSITION_CLASSES }) {
  return (
    <div data-no-panel-resize className={`flex text-center items-center absolute bg-dark-main-darker p-2 gap-2 ${POSITION_CLASSES[position]}`}>
      {children}
    </div>
  );
}
