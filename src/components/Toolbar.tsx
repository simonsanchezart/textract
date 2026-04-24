import type { ReactNode } from "react";
import * as React from "react";

type ToolbarActionProps = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: number;
  onClick?: () => void | Promise<void>;
};

export function ToolbarAction({ Icon, onClick, size = 6 }: ToolbarActionProps) {
  return <Icon className={`size-${size} button-icon`} onClick={onClick} />;
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex text-center items-center absolute top-0 left-0 bg-dark-main-darker p-2 rounded-br-xl gap-2">
      {children}
    </div>
  );
}
