import { Button } from "./Button";

export interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export function NumericKeypad({ value, onChange, maxLength = 8 }: NumericKeypadProps) {
  function press(key: string) {
    if (key === "clear") {
      onChange("");
    } else if (key === "back") {
      onChange(value.slice(0, -1));
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  }

  return (
    <div className="pos-keypad">
      {KEYS.map((key) => (
        <Button
          key={key}
          type="button"
          variant="secondary"
          size="lg"
          className="pos-keypad__key"
          onClick={() => press(key)}
        >
          {key === "clear" ? "C" : key === "back" ? "⌫" : key}
        </Button>
      ))}
    </div>
  );
}
