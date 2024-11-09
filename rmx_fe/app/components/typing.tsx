import { FetcherWithComponents, useParams } from "@remix-run/react";
import { KeyboardEvent, useEffect, useState } from "react";

export default function Typing(props: {
  text: string;
  fetcher: FetcherWithComponents<null>;
  setComplete: (arg0: boolean) => void;
}) {
  const text = props.text;
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
  const [spanState, setSpanState] = useState(new_span);
  const [timerState, setTimerState] = useState("");
  const [Pos, setPos] = useState(0);
  const [errorState, setErrorState] = useState(errors);
  const [timerCallbackState, setTimerCallbackState] = useState<NodeJS.Timer>();
  const [keypressHistory, setKeypressHistory] = useState<[string, number][]>(
    []
  );

  const keyboardCallback = (event) => {
    event.preventDefault();
    handleKeypress(
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
    window.addEventListener("keydown", keyboardCallback);
    return () => {
      window.removeEventListener("keydown", keyboardCallback);
    };
  }, [spanState, Pos]);

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
  }, [Pos, fetcher, keypressHistory, text.length, timerCallbackState]);
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
        <progress
          id="progressbar"
          className="w-full h-2.5 rounded-full absolute right-0"
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
function handleKeypress(
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
    return;
  }
  if (event.altKey || event.ctrlKey || event.shiftKey) {
    return;
  }
  const new_list = [];
  const newErrorState = errorState.map((ov, i) => {
    if (pos == i) {
      if (!keypressIsChar(event, text[pos])) {
        return text[pos];
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

function keypressIsChar(event: KeyboardEvent, char: string) {
  return (
    event.key == char || (event.shiftKey && event.key.toUpperCase() == char)
  );
}

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
