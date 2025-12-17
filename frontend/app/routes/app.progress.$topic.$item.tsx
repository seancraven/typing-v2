import {
  useFetcher,
  useLoaderData,
  useNavigate,
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "react-router";
import { getSession, getUserIdChecked } from "~/sessions";
import { KeyboardEvent, useEffect, useState } from "react";

const VIEW_LINE_COUNT = 10;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = getUserIdChecked(session);
  if (!params.topic || !params.item) {
    return redirect("/app/random");
  }
  if (params.topic) session.set("topic", params.topic);
  if (params.item) session.set("item", params.item);
  const endpoint = `${process.env.BE_URL}/${userId}/${params.topic}/${params.item}`;
  const typingTest: {
    text: string;
    start_index: number;
    end_index: number;
    topic_id: number;
    done: boolean;
    topic: string;
    progress: number;
  } = await fetch(endpoint).then((r) =>
    r.status == 200 ? r.json() : { text: "text" },
  );
  const firstNewLine = typingTest.text.indexOf("\n");
  typingTest.text = typingTest.text.slice(firstNewLine + 1);
  return { typingTest, userId };
}

export async function action({ request }: ActionFunctionArgs) {
  const json = (await request.json()) as UserData;
  console.log("Typing results json", json);
  const resp = await fetch(`${process.env.BE_URL}/${json.user_id}/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
  if (!resp.ok) {
    console.log("Failed to post data", resp);
  }
  return null;
}
type UserData = {
  user_id: string;
  error_chars: [string, number][];
  topic_id: number;
  end_idx: number;
  start_idx: number;
  wpm: number;
  finished: boolean;
  type_time_ms: number;
};
export default function TypingTest() {
  const { typingTest, userId } = useLoaderData<typeof loader>();
  const nav = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const typingKey = `${typingTest.topic_id}:${typingTest.start_index}`;
  const postResults = (timeMiliSec: number, errors: string[]) => {
    const errorMap: Map<string, number> = new Map();
    for (let i = 0; i < errors.length; i++) {
      if (errors[i] == "") continue;
      errorMap.set(errors[i], (errorMap.get(errors[i]) ?? 0) + 1);
    }
    const s = timeMiliSec / 1000;
    const charPerSec = (typingTest.end_index - typingTest.start_index) / s;
    const wpm = (charPerSec / 5) * 60;
    const typingData: UserData = {
      user_id: userId,
      end_idx: typingTest.end_index,
      type_time_ms: timeMiliSec,
      error_chars: Array.from(errorMap.entries()),
      topic_id: typingTest.topic_id,
      start_idx: typingTest.start_index,
      wpm: wpm,
      finished: typingTest.done,
    };
    fetcher.submit(typingData, { method: "POST", encType: "application/json" });
  };

  return (
    <Typing
      key={typingKey}
      text={typingTest.text}
      postDataHandler={postResults}
      loggedIn={Boolean(userId)}
      nextHandler={() => {
        if (typingTest.done) {
          nav(`/app/progress/random`);
        }
        nav(`/app/progress/${typingTest.topic_id}/${typingTest.end_index}`, {
          flushSync: true,
        });
      }}
    />
  );
}

type TypingSpanState = {
  spans: JSX.Element[];
  position: number;
  lineWidth: number;
  error: string[];
  keypressHistory: [string, number][];
  maxViewIndex: number | undefined;
  minViewIndex: number;
};
function newDefaultSpanState(text: string, lineWidth: number): TypingSpanState {
  const errors: string[] = new Array(text.length).fill("");
  const spanned: JSX.Element[] = new Array(text.length);
  let lastNl = 0;
  const newLines = [];
  for (let i = 0; i < text.length; i++) {
    [spanned[i], lastNl] = updateSpecialSpan(text, lineWidth, "", 0, lastNl, i);
    if (lastNl == i) {
      newLines.push(i);
    }
  }
  newLines.push(text.length);
  const maxViewIndex = newLines.at(VIEW_LINE_COUNT);
  const defaultSpanState = {
    spans: spanned,
    position: 0,
    lineWidth: lineWidth,
    error: errors,
    keypressHistory: [],
    minViewIndex: 0,
    maxViewIndex: maxViewIndex,
  };
  return defaultSpanState;
}
export function Typing(props: {
  text: string;
  postDataHandler: (arg0: number, arg1: string[]) => void;
  loggedIn: boolean;
  nextHandler: () => void;
}) {
  const text = props.text;
  const postDataHandler = props.postDataHandler;
  // Shared state.
  const [lineWidth, setLineWidth] = useState(60);
  //
  const defaultSpanState = newDefaultSpanState(text, lineWidth);
  const [typingState, setTypingState] =
    useState<TypingSpanState>(defaultSpanState);
  //
  const [complete, setComplete] = useState(false);
  const [enabled, setEnabled] = useState(props.loggedIn);
  const [timerState, setTimerState] = useState("00:00");
  const [timerCallbackState, setTimerCallbackState] = useState<NodeJS.Timer>();
  const resetHandler = () => {
    setEnabled(true);
    setComplete(false);
    setTypingState(defaultSpanState);
    setTimerState("00:00");
    setTimerCallbackState(undefined);
  };
  const nextHandler = () => {
    setEnabled(true);
    return props.nextHandler();
  };
  const keypressCallback = (event: KeyboardEvent) =>
    handleKeypress(event, text, typingState, setTypingState, enabled, () =>
      setEnabled(false),
    );
  useKeypressListener(keypressCallback, [typingState.position, enabled]);
  // timer start hook.
  useEffect(() => {
    if (typingState.keypressHistory.length == 1) {
      const interval_id = setInterval(
        () => setTimerState(niceTimeSince(typingState.keypressHistory[0][1])),
        100,
      );
      setTimerCallbackState(interval_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingState.keypressHistory.length]);
  // timer stop hook.
  useEffect(() => {
    if (typingState.position >= text.length) {
      if (!timerCallbackState) {
        throw new Error("");
      }
      clearInterval(timerCallbackState);
      postDataHandler(
        typingState.keypressHistory.at(-1)[1] -
          typingState.keypressHistory[0][1],
        typingState.error,
      );
      setComplete(true);
      setEnabled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingState.position]);
  const prog = Math.max(
    Math.min((typingState.position * 100) / text.length, 100),
    0,
  );

  return (
    <div
      className="h-full w-full items-center justify-center rounded bg-primary/5"
      id="typing"
    >
      {enabled ? null : (
        <div className="absolute left-1/2 top-1/2 z-10 h-full w-full -translate-x-1/2 -translate-y-1/2">
          <div className="h-full w-full backdrop-blur-lg backdrop-filter">
            {complete ? (
              <Restart handleNext={nextHandler} handleRestart={resetHandler} />
            ) : (
              <Pause handleResume={() => setEnabled(true)} />
            )}
          </div>
        </div>
      )}
      <div className="container -z-0 mx-auto h-full w-full items-center justify-center p-10 text-3xl">
        <pre className="items-start whitespace-pre-line text-start transition-all duration-300 ease-in-out">
          {typingState.spans.slice(
            typingState.minViewIndex,
            typingState.maxViewIndex && typingState.maxViewIndex + 1,
          )}
        </pre>
        <div
          id="timer"
          className="container mx-auto flex min-h-[44px] justify-center"
        >
          {enabled ? timerState : "Paused"}
        </div>
        <div className="container mx-auto h-2.5 max-w-[800px] justify-center rounded-full bg-muted-foreground">
          <div
            className="h-2.5 justify-start rounded-full bg-primary"
            style={{
              width: `${prog}%`,
            }}
          ></div>
        </div>
      </div>
      <div className="pb-10"></div>
    </div>
  );
}
function specialCharChar(char: string): [string, boolean] {
  if (char == " ") {
    // Space
    return ["\u00B7", false];
  }
  if (char == "\n") {
    // Newline
    return ["\u00B6\n", false];
  }
  if (char == "\t") {
    // Tab
    return ["\u2192 ", false];
  }
  return [char, true];
}

function niceTimeSince(start_time: number): string {
  const cur_time = new Date().getTime();
  const delta_ms = cur_time - start_time;

  const minutes = Math.floor((delta_ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((delta_ms % (1000 * 60)) / 1000);
  let str_min = String(minutes);
  let str_sec = String(seconds);

  if (seconds < 10) {
    str_sec = "0" + str_sec;
  }
  if (minutes < 10) {
    str_min = "0" + str_min;
  }
  return str_min + ":" + str_sec;
}
function useKeypressListener(
  handler: (arg0: KeyboardEvent) => void,
  triggers: unknown[],
) {
  useEffect(() => {
    const eventListener = (event) => handler(event);
    document.addEventListener("keydown", eventListener);
    return () => document.removeEventListener("keydown", eventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, triggers);
}

function handleKeypress(
  event: KeyboardEvent,
  text: string,
  state: TypingSpanState,
  setState: (arg0: TypingSpanState) => void,
  enabled: boolean,
  handlePause: () => void,
) {
  if (!enabled) {
    return;
  }
  if (event.key == "Escape") {
    handlePause();
    return;
  }
  if (
    event.key == "Backspace" ||
    event.key.length == 1 ||
    event.key == "Enter" ||
    event.key == "Tab"
  ) {
    let delta = 1;
    // Manage Errors
    if (event.key === "Backspace") {
      state.error[Math.max(state.position, 0)] = "";
      delta = -1;
    } else if (
      event.key === "Tab" &&
      text.slice(state.position, state.position + 4) === "    "
    ) {
      for (let i = state.position; i < state.position + 4; i++) {
        state.error[i] = calculateErrorCharacter(text[i], " ");
      }
      delta = 4;
    } else {
      state.error[state.position] = calculateErrorCharacter(
        text[state.position],
        event.key,
      );
    }
    // Manage Spans
    let lastNl = 0;
    const newLines = [];
    for (let i = 0; i < text.length; i++) {
      [state.spans[i], lastNl] = updateSpecialSpan(
        text,
        state.lineWidth,
        state.error[i],
        Math.min(Math.max(state.position + delta, 0), text.length),
        lastNl,
        i,
      );
      if (i == lastNl) {
        newLines.push(i);
      }
    }
    newLines.push(text.length);
    // Manage Window
    for (let i = 0; i < newLines.length; i++) {
      // I think the better way to encode this is
      // a constant number of newlines in the view
      // Then the question is just start + end.
      if (newLines[i] > state.position) {
        const padding = 3;
        const start_index = Math.max(i - padding, 0);
        const end_index = start_index + VIEW_LINE_COUNT;
        state.maxViewIndex = newLines.at(end_index);

        // If you go past the end of the array stop moving the window.
        if (state.maxViewIndex !== undefined) {
          let start_pos = newLines.at(start_index);
          if (start_pos && start_pos != 0) {
            start_pos += 1;
          }
          state.minViewIndex = start_pos ? start_pos : 0;
        }
        break;
      }
    }
    // Update State
    setState({
      ...state,
      minViewIndex: state.minViewIndex,
      maxViewIndex: state.maxViewIndex,
      keypressHistory: [...state.keypressHistory, [event.key, Date.now()]],
      position: Math.min(Math.max(state.position + delta, 0), text.length),
    });
  }
  event.preventDefault();
}

function calculateErrorCharacter(targetChar: string, key: string) {
  // Handle special characters where the keypress is incorrect
  if (targetChar == "\n") {
    if (key != "Enter") {
      return "\n";
    }
  } else if (targetChar == "\t") {
    if (key != "Tab") {
      return "\t";
    }
  } else if (key != targetChar) {
    return targetChar;
  }
  // If the key is correct, return an empty string
  return "";
}
function Pause({ handleResume }: { handleResume: () => void }) {
  useEffect(() => {
    const el = (e: KeyboardEvent) => {
      if (e.key == "Enter" || e.key == " ") {
        e.preventDefault();
        handleResume();
      }
    };
    window.addEventListener("keydown", el);
    return () => window.removeEventListener("keydown", el);
  });
  return (
    <div className="container mx-auto flex h-2/3 w-full items-center justify-center">
      <button
        className="flex items-center rounded-xl fill-primary stroke-primary font-bold hover:bg-primary hover:fill-black hover:stroke-black"
        onClick={handleResume}
      >
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            width="100px"
          >
            <title>Resume</title>
            <path
              d="M35 25 L35 75 L75 50 Z"
              strokeLinejoin="round"
              strokeWidth="8"
            />
          </svg>
        </div>
        <div className="mx-auto flex pr-4">{"<Enter>/<Space>"}</div>
      </button>
    </div>
  );
}

function Restart({
  handleNext,
  handleRestart,
}: {
  handleNext: () => void;
  handleRestart: () => void;
}) {
  useEffect(() => {
    const el = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key == "Escape") {
        handleRestart();
      }
      if (e.key == "Enter") {
        handleNext();
      }
    };
    window.addEventListener("keydown", el);
    return () => window.removeEventListener("keydown", el);
  });
  return (
    <div className="container mx-auto flex h-2/3 w-1/2 items-center justify-center">
      <div className="flex px-5">
        <button
          className="container flex items-center rounded-xl fill-primary stroke-primary font-bold hover:bg-primary hover:fill-black hover:stroke-black"
          onClick={handleRestart}
        >
          <div>
            <svg
              width="200px"
              viewBox="-7.5 0 32 32"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>restart</title>
              <path d="M15.88 13.84c-1.68-3.48-5.44-5.24-9.040-4.6l0.96-1.8c0.24-0.4 0.080-0.92-0.32-1.12-0.4-0.24-0.92-0.080-1.12 0.32l-1.96 3.64c0 0-0.44 0.72 0.24 1.040l3.64 1.96c0.12 0.080 0.28 0.12 0.4 0.12 0.28 0 0.6-0.16 0.72-0.44 0.24-0.4 0.080-0.92-0.32-1.12l-1.88-1.040c2.84-0.48 5.8 0.96 7.12 3.68 1.6 3.32 0.2 7.32-3.12 8.88-1.6 0.76-3.4 0.88-5.080 0.28s-3.040-1.8-3.8-3.4c-0.76-1.6-0.88-3.4-0.28-5.080 0.16-0.44-0.080-0.92-0.52-1.080-0.4-0.080-0.88 0.16-1.040 0.6-0.72 2.12-0.6 4.36 0.36 6.36s2.64 3.52 4.76 4.28c0.92 0.32 1.84 0.48 2.76 0.48 1.24 0 2.48-0.28 3.6-0.84 4.16-2 5.92-7 3.92-11.12z"></path>
            </svg>
          </div>
          <div className="mx-auto flex pr-4">{"<Esc>"}</div>
        </button>
      </div>
      <div>
        <button
          className="flex items-center rounded-xl fill-transparent stroke-primary font-bold hover:bg-primary hover:fill-primary hover:stroke-black"
          onClick={handleNext}
        >
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500"
              width="200px"
            >
              <title>Next</title>
              <path
                d="M369.736 169.538L188.615 45.573c-8.171-5.586-18.775-6.201-27.532-1.57c-8.771 4.617-14.25 13.713-14.25 23.608v49.878l-105.051-71.9C33.611 40 23.007 39.386 14.251 44.002C5.477 48.636 0 57.731 0 67.627v244.879c0 9.942 5.511 19.053 14.327 23.654c8.803 4.617 19.422 3.955 27.594-1.709l104.912-72.73v50.769c0 9.941 5.51 19.053 14.313 23.67c8.817 4.6 19.451 3.938 27.607-1.725L369.86 208.872c6.447-4.477 10.294-11.85 10.265-19.698c-0.015-7.865-3.91-15.205-10.389-19.636z"
                strokeWidth="40"
                transform="translate(60, 60)"
              />
            </svg>
          </div>
          <div className="flex pr-4">{"<Enter>"}</div>
        </button>
      </div>
    </div>
  );
}
function updateSpecialSpan(
  text: string,
  lineWidth: number,
  span_error: string,
  next_index: number,
  lastNewline: number,
  i: number,
): [JSX.Element, number] {
  let [n_char, no_mut] = specialCharChar(text[i]);
  if (text[i] == "\n") {
    lastNewline = i;
  } else if (i - lastNewline >= lineWidth && isWhitespace(text[i])) {
    n_char += "\n";
    lastNewline = i;
  }
  if (i == next_index) {
    return [
      <span key={i} className={no_mut ? next_col : next_col_mut}>
        {n_char}
      </span>,
      lastNewline,
    ];
  }
  if (i > next_index) {
    return [
      <span key={i} className={no_mut ? no_col : no_col_mut}>
        {n_char}
      </span>,
      lastNewline,
    ];
  }
  let col = no_mut ? right_col : right_col_mut;
  if (span_error != "") {
    col = no_mut ? wrong_col : wrong_col_mut;
  }
  return [
    <span key={i} className={col}>
      {n_char}
    </span>,
    lastNewline,
  ];
}
function isWhitespace(char: string) {
  return char == " " || char == "\n" || char == "\t";
}
// No colour
const no_col = "";
const no_col_mut = "text-muted-foreground";
// Right color
const right_col = "text-muted-foreground";
const right_col_mut = "text-muted-foreground";
// Wrong color
const wrong_col = "bg-red-800 rounded";
const wrong_col_mut = "bg-red-800 rounded";
// Next Color
const next_col = "bg-primary rounded";
const next_col_mut = "bg-primary rounded";
