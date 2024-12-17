import {
  useFetcher,
  useLoaderData,
  FetcherWithComponents,
  useParams,
  useNavigate,
  Outlet,
} from "@remix-run/react";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { getSession, getUserIdChecked } from "~/sessions";
import { KeyboardEvent, useEffect, useState } from "react";

const LINE_WIDTH = 60;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = getUserIdChecked(session);
  if (!params.topic || !params.item) {
    return redirect("/app/random");
  }
  if (params.topic) session.set("topic", params.topic);
  if (params.item) session.set("item", params.item);
  const endpoint = `${process.env.BE_URL}/${userId}/${params.topic}/${params.item}`;
  const promise: {
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
  return { promise, userId };
}

export async function action({ request }: ActionFunctionArgs) {
  const json = await request.json();
  const resp = await fetch(`${process.env.BE_URL}/user/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
  console.log(resp);
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
  const { promise, userId } = useLoaderData<typeof loader>();
  const nav = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const typingKey = `${promise.topic_id}:${promise.start_index}`;
  const postResults = (timeMiliSec: number, errors: string[]) => {
    const errorMap: Map<string, number> = new Map();
    for (let i = 0; i < errors.length; i++) {
      if (errors[i] == "") continue;
      errorMap.set(errors[i], (errorMap.get(errors[i]) ?? 0) + 1);
    }
    const s = timeMiliSec / 1000;
    const charPerSec = (promise.end_index - promise.start_index) / s;
    const wpm = charPerSec / (60 * 5);
    const typingData: UserData = {
      user_id: userId,
      end_idx: promise.end_index,
      type_time_ms: timeMiliSec,
      error_chars: Array.from(errorMap.entries()),
      topic_id: promise.topic_id,
      start_idx: promise.start_index,
      wpm: wpm,
      finished: promise.done,
    };
    fetcher.submit(typingData, { method: "POST", encType: "application/json" });
  };

  return (
    <Typing
      key={typingKey}
      text={promise.text}
      postDataHandler={postResults}
      loggedIn={Boolean(userId)}
      nextHandler={() => {
        if (promise.done) {
          nav(`/app/progress/random`, { replace: true });
        }
        nav(`/app/progress/${promise.topic_id}/${promise.end_index}`, {
          replace: true,
        });
      }}
    />
  );
}

type TypingSpanState = {
  spans: JSX.Element[];
  position: number;
  error: string[];
  keypressHistory: [string, number][];
};
export function Typing(props: {
  text: string;
  postDataHandler: (arg0: number, arg1: string[]) => void;
  loggedIn: boolean;
  nextHandler: () => void;
}) {
  const text = props.text;
  const postDataHandler = props.postDataHandler;
  const errors: string[] = new Array(text.length).fill("");
  const spanned = new Array(text.length);
  let lastNl = 0;
  for (let i = 0; i < text.length; i++) {
    [spanned[i], lastNl] = updateSpecialSpan(text, "", 0, lastNl, i);
  }
  const defaultSpanState = {
    spans: spanned,
    position: 0,
    error: errors,
    keypressHistory: [],
  };
  const [typingState, setTypingState] =
    useState<TypingSpanState>(defaultSpanState);
  // Shared state.
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
        typingState.keypressHistory[0][1] -
          typingState.keypressHistory.at(-1)[1],
        errors,
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
    <div className="relative h-full w-full">
      {enabled ? null : (
        <div className="absolute left-1/2 top-1/2 z-10 h-full w-screen -translate-x-1/2 -translate-y-1/2">
          <div className="h-[130%] w-full backdrop-blur-lg backdrop-filter">
            {complete ? (
              <Restart handleNext={nextHandler} handleRestart={resetHandler} />
            ) : (
              <Pause handleResume={() => setEnabled(true)} />
            )}
          </div>
        </div>
      )}
      <div className="-z-0 h-full min-h-[400px] w-full items-center">
        <div className="relative mx-auto min-h-[500px] w-full items-center justify-center pt-32 leading-relaxed text-gray-200">
          <pre className="absolute left-1/2 top-4 min-w-[800px] -translate-x-1/2 items-center justify-center whitespace-pre-line">
            {typingState.spans}
          </pre>
        </div>
        <div
          id="timer"
          className="container mx-auto flex min-h-[44px] justify-center text-gray-200"
        >
          {enabled ? timerState : "Paused"}
        </div>
        <div className="container mx-auto h-2.5 max-w-[800px] justify-center rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-2.5 rounded-full bg-primary-800"
            style={{
              width: `${prog}%`,
            }}
          ></div>
        </div>
      </div>
      <div className="flex h-full"></div>
    </div>
  );
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
  if (event.key == "Backspace") {
    state.error[Math.max(state.position, 0)] = "";

    let lastNl = 0;
    for (let i = 0; i < text.length; i++) {
      [state.spans[i], lastNl] = updateSpecialSpan(
        text,
        state.error[i],
        Math.max(state.position - 1, 0),
        lastNl,
        i,
      );
    }
    setState({
      ...state,
      position: Math.max(state.position - 1, 0),
    });
  }
  if (event.key.length == 1 || event.key == "Enter" || event.key == "Tab") {
    state.error[state.position] = keypressCorrect(
      text[state.position],
      event.key,
    );
    let lastNl = 0;
    for (let i = 0; i < text.length; i++) {
      [state.spans[i], lastNl] = updateSpecialSpan(
        text,
        state.error[i],
        state.position + 1,
        lastNl,
        i,
      );
    }
    setState({
      ...state,
      keypressHistory: [...state.keypressHistory, [event.key, Date.now()]],
      position: state.position + 1,
    });
  }
  event.preventDefault();
}

function keypressCorrect(targetChar: string, key: string) {
  switch (targetChar) {
    case "\n": {
      if (key != "Enter") {
        return "\n";
      }
      break;
    }
    case "\t": {
      if (key != "Tab") {
        return "\t";
      }
      break;
    }
    default: {
      if (key != targetChar) {
        return targetChar;
      }
      break;
    }
  }
  return "";
}
function Pause({ handleResume }: { handleResume: () => void }) {
  useEffect(() => {
    const el = (e: KeyboardEvent) => {
      if (e.key == "Enter" || e.key == " ") {
        handleResume();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", el);
    return () => window.removeEventListener("keydown", el);
  });
  return (
    <div className="container mx-auto flex h-2/3 w-full items-center justify-center">
      <button
        className="flex items-center rounded-xl fill-primary-500 stroke-primary-500 font-bold text-gray-600 hover:bg-primary-600 hover:fill-black hover:stroke-black hover:text-black"
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
      if (e.key == "Escape") {
        handleRestart();
      }
      if (e.key == "Enter") {
        handleNext();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", el);
    return () => window.removeEventListener("keydown", el);
  });
  return (
    <div className="container mx-auto flex h-2/3 w-1/2 items-center justify-center">
      <div className="flex px-5">
        <button
          className="container flex items-center rounded-xl fill-primary-500 stroke-primary-500 font-bold text-gray-600 hover:bg-primary-600 hover:fill-black hover:stroke-black hover:text-black"
          onClick={handleRestart}
          onKeyDown={(e) => {}}
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
          className="flex items-center rounded-xl fill-transparent stroke-primary-500 font-bold text-gray-600 hover:bg-primary-600 hover:fill-primary-600 hover:stroke-black hover:text-black"
          onClick={handleNext}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              handleNext();
            }
          }}
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
  span_error: string,
  next_index: number,
  lastNewline: number,
  i: number,
): [JSX.Element, number] {
  let [n_char, no_mut] = specialCharChar(text[i]);
  if (text[i] == "\n") {
    lastNewline = i;
  } else if (i - lastNewline >= LINE_WIDTH && isWhitespace(text[i])) {
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
const no_col = "dark:text-gray-200 text-gray-800";
const no_col_mut = "dark:text-gray-800 text-gray-200";
// Right color
const right_col = "dark:text-gray-400 text-gray-600";
const right_col_mut = "dark:text-gray-800 text-gray-200";
// Wrong color
const wrong_col = "bg-red-800 text-gray-200 rounded";
const wrong_col_mut = "bg-red-800 text-gray-500 rounded";
// Next Color
const next_col = "bg-primary-800 text-gray-200 rounded";
const next_col_mut = "bg-primary-800 text-gray-500 rounded";
