import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { clamp } from "@/utils/utils";
import { Button } from "../ui/Button";
import { ButtonGroup } from "../ui/ButtonGroup";
import { Input } from "../ui/Input";

type FooterNumberSettingProps = {
  title: string;
  unit?: string;
  value: number;
  setValue: (x: number) => void;
  onDecrement?: (x: number) => number;
  onIncrement?: (x: number) => number;
  postProcess?: (x: number) => number;
  min?: number;
  max?: number;
  className?: string;
};

export default function FooterNumberSetting({
  title,
  value,
  setValue,
  unit,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  onDecrement = x => x - 1,
  onIncrement = x => x + 1,
  postProcess = x => x,
  className,
}: FooterNumberSettingProps) {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const commit = (raw: number) => {
    const processed = postProcess(clamp(raw, min, max));
    setValue(processed);
    setInputValue(String(processed));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    const num = Number(inputValue);
    if (!Number.isNaN(num))
      commit(num);
    else setInputValue(String(value));
  };

  return (
    <div className="flex gap-3 items-center">
      <div className="select-none font-light tracking-widest">
        {title}
      </div>

      <ButtonGroup aria-label="Snapping Controls">
        <Button variant="outline" size="icon-xs" onClick={() => commit(onDecrement(value))}>
          -
        </Button>

        <div className="relative">
          <Input
            type="number"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                handleBlur();
            }}
            className={`w-14 h-6 text-center rounded-none border-x-0 border border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
          />

          {unit
            ? (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs opacity-50 pointer-events-none">
                  {unit}
                </span>
              )
            : <></>}
        </div>

        <Button variant="outline" size="icon-xs" onClick={() => commit(onIncrement(value))}>
          +
        </Button>
      </ButtonGroup>
    </div>
  );
}
