import type { MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import React, { useEffect, useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <div className="flex py-10 p-30 justfy-center bg-black">
      <div className="container mx-auto lg:w-5/12 p-4 py-10 min-h-[100px] flex justify-center">
        <TypingZone />
      </div>
    </div>
  );
}
export function loader() {
  return { text: "Your mum is a fat bint" };
}

function TypingZone() {
  let text = useLoaderData<typeof loader>().text;
  let spanned = spanify(text);
  // Initalize text state
  let new_span = spanned.map((_, i) => {
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
  let errors: string[] = [];
  for (let i = 0; i < text.length; i++) {
    errors.push("");
  }

  // Shared state.
  const [spanTextState, setspanTextState] = useState(new_span);
  const [timerState, setTimerState] = useState("");
  const [Pos, setPos] = useState(0);
  const [errorState, setErrorState] = useState(errors);
  const [timerCallbackState, setTimerCallbackState] = useState("");
  const [keypressHistory, setKeypressHistory] = useState([]);

  // timer start hook.
  const start_time = Date.now();
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
    }
  }, [Pos]);

  const backspaceEventListner = (ev: KeyboardEvent) => {
    if (ev.key == "Backspace") {
      console.log("Backspace");
      let new_list = [];
      let newErrorState = errorState.map((ov, i) => {
        if (Pos - 1 == i) {
          return "";
        }
        return ov;
      });
      for (let i = 0; i < text.length; i++) {
        new_list.push(updateSpecialSpan(text, newErrorState, Pos - 2, i));
      }
      setPos(Pos - 1);
      setErrorState(newErrorState);
      setspanTextState(new_list);
      return;
    }
  };
  const keypressEventListner = (ev: KeyboardEvent) => {
    let new_list = [];
    let newErrorState = errorState.map((ov, i) => {
      if (Pos == i) {
        if (ev.key != text[Pos]) {
          return text[Pos];
        }
      }
      return ov;
    });
    for (let i = 0; i < text.length; i++) {
      new_list.push(updateSpecialSpan(text, newErrorState, Pos, i));
    }
    setKeypressHistory([...keypressHistory, [ev.key, Date.now()]]);
    setErrorState(newErrorState);
    setspanTextState(new_list);
    setPos(Pos + 1);
  };
  useEffect(() => {
    document.addEventListener("keypress", keypressEventListner);
    document.addEventListener("keydown", backspaceEventListner);
    return () => {
      document.removeEventListener("keypress", keypressEventListner);
      document.removeEventListener("keydown", backspaceEventListner);
    };
  }, [spanTextState, Pos]);

  return (
    <div className="w-full lg:max-w-35 mx-auto text-3xl h-full items-center">
      <div className="flex min-h-[500px] items-center justify-center">
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
  var new_text: React.JSX.Element[] = new Array();
  var char: string;
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
  let cur_time = new Date().getTime();
  let delta_ms = cur_time - start_time;
  var minutes = Math.floor((delta_ms % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((delta_ms % (1000 * 60)) / 1000);
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds == 0) {
    seconds == "00";
  }
  return minutes + ":" + seconds;
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
  } else {
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
}
const no_col = "text-gray-200";
const right_col = "text-gray-400";
const wrong_col = "bg-red-800 text-gray-200 rounded";
const next_col = "bg-violet-800 text-gray-200 rounded";
const be_uri = "http://localhost:3000";
