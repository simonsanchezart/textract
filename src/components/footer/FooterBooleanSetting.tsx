import { Toggle } from "../ui/Toggle";

type FooterBooleanSettingProps = {
  name: string;
  value: boolean;
  setValue: (x: boolean) => void;
  className?: string;
};

export default function FooterBooleanSetting({
  name,
  value,
  setValue,
  className,
}: FooterBooleanSettingProps) {
  return (
    <Toggle variant="outline" size="xs" pressed={value} onPressedChange={setValue} className={className}>
      {name}
    </Toggle>
  );
}
