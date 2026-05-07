import type { ReactNode } from "react";

type ToolbarActionProps = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: number;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
};

export function ToolbarAction({ Icon, onClick, disabled = false, size = 6 }: ToolbarActionProps) {
  return (
    <Icon
      className={`size-${size} ${disabled ? "opacity-20 pointer-events-none" : "button-icon"
      }`}
      onClick={disabled ? undefined : onClick}
    />
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex text-center items-center absolute top-0 left-0 bg-dark-main-darker p-2 rounded-b-xl gap-2">
      {children}
    </div>
  );
}
