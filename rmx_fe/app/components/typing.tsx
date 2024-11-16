import { FetcherWithComponents, useParams } from "@remix-run/react";
import { KeyboardEvent, useEffect, useState } from "react";

export default function Typing(props: {
  text: string;
  fetcher: FetcherWithComponents<null>;
  setComplete: (arg0: boolean) => void;
}) {
  const text = props.text.slice(0, 150);
  const fetcher = props.fetcher;

  const spanned = spanify(text);
  // Initalize text state
  // Intialize errors.
  const errors: string[] = [];
  for (let i = 0; i < text.length; i++) {
    errors.push("");
  }
  const new_span = spanned.map((_, i) => {
    return updateSpecialSpan(text, errors, -1, i);
  });
  // Shared state.
  const [spanState, setSpanState] = useState(new_span);
  const [timerState, setTimerState] = useState("");
  const [Pos, setPos] = useState(0);
  const [errorState, setErrorState] = useState(errors);
  const [timerCallbackState, setTimerCallbackState] = useState<NodeJS.Timer>();
  const [keypressHistory, setKeypressHistory] = useState<[string, number][]>(
    []
  );

  const keypressCallback = (event: KeyboardEvent) => {
    handleBackSpaceKeypress(
      event,
      text,
      spanState,
      setSpanState,
      Pos,
      setPos,
      errorState,
      setErrorState,
      keypressHistory,
      setKeypressHistory
    );
  };
  useEffect(() => {
    window.addEventListener("keydown", keypressCallback);
    return () => {
      window.removeEventListener("keydown", keypressCallback);
    };
  }, [Pos]);

  // timer start hook.
  useEffect(() => {
    if (keypressHistory.length == 1) {
      const interval_id = setInterval(
        () => setTimerState(niceTimeSince(keypressHistory[0][1])),
        100
      );
      setTimerCallbackState(interval_id);
    }
  }, [keypressHistory]);
  // timer stop hook.
  useEffect(() => {
    if (Pos >= text.length) {
      if (!timerCallbackState) {
        throw new Error("");
      }
      clearInterval(timerCallbackState);
      console.log(keypressHistory);
      fetcher.submit(
        { keypressHistory },
        { method: "POST", encType: "application/json" }
      );
      props.setComplete(true);
    }
  }, [Pos]);
  const prog = Math.max(Math.min((Pos * 100) / text.length, 100), 0);
  return (
    <div className="w-full">
      <div className="flex min-h-[500px] items-center justify-center">
        <div
          className="text-gray-200 items-center leading-relaxed inline-block align-middle"
          id="input_text"
        >
          <pre>{spanState}</pre>
        </div>
      </div>
      <div
        id="timer"
        className="container mx-auto flex justify-center text-gray-200 min-h-[44px]"
      >
        {timerState}
      </div>
      <div className="relative w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="h-2.5 rounded-full bg-primary-800"
          style={{
            width: `${prog}%`,
          }}
        ></div>
      </div>
    </div>
  );
}
/* Turn text into spans contianing a single char */
function spanify(text: string) {
  const new_text: React.JSX.Element[] = [];
  let char: string;
  let mut: boolean;
  for (let i = 0; i < text.length; i++) {
    char = text[i];
    [char, mut] = specialCharChar(char);
    new_text.push(
      <span key={i} className={mut ? no_col : no_col_mut}>
        {char}
      </span>
    );
  }
  return new_text;
}
function specialCharChar(char: string): [string, boolean] {
  if (char == " ") {
    return ["\u00B7", false];
  }
  if (char == "\n") {
    return ["\u00B6\n", false];
  }
  if (char == "\t") {
    return ["\u2192 ", false];
  }
  return [char, true];
}

function niceTimeSince(start_time: number): string {
  const cur_time = new Date().getTime();
  const delta_ms = cur_time - start_time;

  let minutes = Math.floor((delta_ms % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((delta_ms % (1000 * 60)) / 1000);
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  return minutes + ":" + seconds;
}

/* Need to implement a function to update the spans based on each keypress. */
function handleBackSpaceKeypress(
  event: KeyboardEvent,
  text: string,
  spanState: JSX.Element[],
  setSpansState: (arg0: JSX.Element[]) => void,
  pos: number,
  setPos: (arg0: number) => void,
  errorState: string[],
  setErrorState: (arg0: string[]) => void,
  keypressHistory: [string, number][],
  setKeypressHistory: (arg0: [string, number][]) => void
) {
  if (event.key == "Backspace") {
    console.log("Backspace");
    const new_list = [];
    const newErrorState = errorState.map((ov, i) => {
      if (pos - 1 == i) {
        return "";
      }
      return ov;
    });
    for (let i = 0; i < text.length; i++) {
      new_list.push(updateSpecialSpan(text, newErrorState, pos - 2, i));
    }
    setPos(pos - 1);
    setErrorState(newErrorState);
    setSpansState(new_list);
  }
  if (event.key.length == 1 || event.key == "Enter" || event.key == "Tab") {
    const new_list = [];
    const newErrorState = errorState.map((ov, i) => {
      if (pos == i) {
        switch (text[pos]) {
          case "\n": {
            if (event.key != "Enter") {
              return "\n";
            }
            break;
          }
          case "\t": {
            if (event.key != "Tab") {
              return "\t";
            }
            break;
          }
          default: {
            if (event.key != text[pos]) {
              return text[pos];
            }
          }
        }
      }
      return ov;
    });
    for (let i = 0; i < text.length; i++) {
      new_list.push(updateSpecialSpan(text, newErrorState, pos, i));
    }
    setKeypressHistory([...keypressHistory, [event.key, Date.now()]]);
    setErrorState(newErrorState);
    setSpansState(new_list);
    setPos(pos + 1);
  }
  event.preventDefault();
}

function updateSpecialSpan(
  text: string,
  errors: string[],
  cur_index: number,
  i: number
) {
  const [n_char, no_mut] = specialCharChar(text[i]);
  if (i == cur_index + 1) {
    return (
      <span key={i} className={no_mut ? next_col : next_col_mut}>
        {n_char}
      </span>
    );
  }
  if (i > cur_index + 1) {
    return (
      <span key={i} className={no_mut ? no_col : no_col_mut}>
        {n_char}
      </span>
    );
  }
  let col = no_mut ? right_col : right_col_mut;
  if (errors[i] != "") {
    col = no_mut ? wrong_col : wrong_col_mut;
  }
  return (
    <span key={i} className={col}>
      {n_char}
    </span>
  );
}
export function CatchBoundary() {
  const caught = useParams();
  return (
    <div>
      <h1>Caught</h1>
      <p>Status: {caught.status}</p>
      <pre>
        <code>{JSON.stringify(caught.data, null, 2)}</code>
      </pre>
    </div>
  );
}
// No colour
const no_col = "text-gray-200";
const no_col_mut = "text-gray-800";
// Right color
const right_col = "text-gray-400";
const right_col_mut = "text-gray-800";
// Wrong color
const wrong_col = "bg-red-800 text-gray-200 rounded";
const wrong_col_mut = "bg-red-800 text-gray-500 rounded";
// Next Color
const next_col = "bg-primary-800 text-gray-200 rounded";
const next_col_mut = "bg-primary-800 text-gray-500 rounded";
