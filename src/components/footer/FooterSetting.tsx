import type { ChangeEvent } from "react";
import { useState } from "react";
import { clamp } from "@/utils/utils";
import { Button } from "../ui/Button";
import { ButtonGroup } from "../ui/ButtonGroup";
import { Input } from "../ui/Input";

type FooterSettingProps = {
  title: string;
  unit?: string;
  value: number;
  setValue: (x: number) => void;
  min?: number;
  max?: number;
  increment?: number;
};

export default function FooterNumberSetting(props: FooterSettingProps) {
  const { title, value, setValue, unit, min = Number.MIN_VALUE, max = Number.MAX_VALUE, increment = 1 } = props;
  const [prevValue, setPrevValue] = useState(value);
  const [inputValue, setInputValue] = useState(String(value));

  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(String(value));
  }

  const handleSetValue = (targetValue: number) => {
    const clampedNumber = clamp(targetValue, min, max);
    setInputValue(String(clampedNumber));
    setValue(clampedNumber);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const x = e.target.value;
    if (x === "") {
      setInputValue("");
      return;
    }

    const num = Number(x);
    if (!Number.isNaN(num)) {
      handleSetValue(num);
    }
  };

  const handleBlur = () => {
    if (inputValue === "") {
      setInputValue(String(value));
    }
  };

  return (
    <div className="flex gap-3 items-center">
      <div className="select-none font-light tracking-widest text-">
        {title}
      </div>

      <ButtonGroup aria-label="Snapping Controls">
        <Button variant="outline" size="icon-xs" onClick={() => handleSetValue(value - increment)}>
          -
        </Button>

        <div className="relative">
          <Input
            type="number"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-14 h-6 text-center rounded-none border-x-0 border border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          {unit
            ? (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs opacity-50 pointer-events-none">
                  {unit}
                </span>
              )
            : <></>}
        </div>

        <Button variant="outline" size="icon-xs" onClick={() => handleSetValue(value + increment)}>
          +
        </Button>

      </ButtonGroup>
    </div>
  );
}
