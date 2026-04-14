import { Vec2 } from "@/types/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const getMiddle = (v: Vec2[]) => {
    const average = v.reduce((a, b) => {
        return { x: a.x + b.x, y: a.y + b.y };
    });

    average.x /= v.length;
    average.y /= v.length;
    return average;
};
