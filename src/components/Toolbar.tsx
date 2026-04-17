import React, { ReactNode } from "react";

interface ToolbarActionProps {
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    size?: number;
    onClick?: () => void | Promise<void>;
}

export const ToolbarAction = ({ Icon, onClick, size = 6 }: ToolbarActionProps) => {
    return <Icon className={`size-${size} button-icon`} onClick={onClick} />;
};

export const Toolbar = ({ children }: { children: ReactNode }) => {
    return (
        <div className="flex text-center items-center absolute bottom-0 left-0 bg-dark-main-darker p-2 rounded-tr-2xl gap-2">
            {children}
        </div>
    );
};
