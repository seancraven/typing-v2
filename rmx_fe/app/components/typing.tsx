import { FetcherWithComponents, useParams } from "@remix-run/react";
import { KeyboardEvent, useEffect, useState } from "react";

export default function Typing(props: {
  text: string;
  fetcher: FetcherWithComponents<null>;
}) {
  const text = props.text.slice(0, 30);
  const fetcher = props.fetcher;

  const spanned = spanify(text);
  // Initalize text state
  const new_span = spanned.map((_, i) => {
    if (i == 0) {
      return (
        <span key={i} className={next_col}>
          {text[i]}
        </span>
      );
    }
    return (
      <span key={i} className={no_col}>
        {text[i]}
      </span>
    );
  });
  // Intialize errors.
  const errors: string[] = [];
  for (let i = 0; i < text.length; i++) {
    errors.push("");
  }

  // Shared state.
  const [spanTextState, setspanTextState] = useState(new_span);
  const [timerState, setTimerState] = useState("");
  const [Pos, setPos] = useState(0);
  const [errorState, setErrorState] = useState(errors);
  const [timerCallbackState, setTimerCallbackState] = useState("");
  const [keypressHistory, setKeypressHistory] = useState<any[]>([]);

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
      clearInterval(timerCallbackState);
      console.log(keypressHistory);
      fetcher.submit(
        { keypressHistory },
        { method: "POST", encType: "application/json" }
      );
    }
  }, [Pos]);

  return (
    <div className="w-full">
      <div className="flex min-h-[500px] items-center justify-center">
        <input
          onKeyDown={(e) => {
            handleKeypress(e, setspanTextState);
          }}
        />
        <div
          className="text-gray-200 items-center leading-relaxed inline-block align-middle"
          id="input_text"
        >
          {spanTextState}
        </div>
      </div>
      <div
        id="timer"
        className="container mx-auto flex justify-center text-gray-200 min-h-[44px]"
      >
        {timerState}
      </div>
      <div className="relative w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <progress
          role="progressbar"
          id="progressbar"
          className="w-full  h-2.5 rounded-full absolute right-0"
          max="100"
          value={Math.floor((100 * Pos) / text.length)}
        ></progress>
      </div>
    </div>
  );
}
/* Turn text into spans contianing a single char */
function spanify(text: string) {
  const new_text: React.JSX.Element[] = [];
  let char: string;
  for (let i = 0; i < text.length; i++) {
    char = text[i];
    new_text.push(
      <span key={i} className={no_col}>
        {char}
      </span>
    );
  }
  return new_text;
}

function niceTimeSince(start_time: number): string {
  const cur_time = new Date().getTime();
  const delta_ms = cur_time - start_time;

  const minutes = Math.floor((delta_ms % (1000 * 60 * 60)) / (1000 * 60));
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
function handleKeypress(
  event: KeyboardEvent,
  setSpansState: (arg0: Element[]) => void,
  spanState: Element[]
) {}
function updateSpecialSpan(
  text: string,
  errors: string[],
  cur_index: number,
  i: number
) {
  if (i == cur_index + 1) {
    return (
      <span key={i} className={next_col}>
        {text[i]}
      </span>
    );
  }
  if (i > cur_index + 1) {
    return (
      <span key={i} className={no_col}>
        {text[i]}
      </span>
    );
  }
  let col = right_col;
  if (errors[i] != "") {
    col = wrong_col;
  }
  return (
    <span key={i} className={col}>
      {text[i]}
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
const no_col = "text-gray-200";
const right_col = "text-gray-400";
const wrong_col = "bg-red-800 text-gray-200 rounded";
const next_col = "bg-violet-800 text-gray-200 rounded";
