import React from "react";

const no_col = "text-gray-200";
const right_col = "text-gray-400";
const wrong_col = "bg-red-800 text-gray-200 rounded";
const next_col = "bg-violet-800 text-gray-200 rounded";
const be_uri = "http://localhost:3000";

export class TextEntryHandler {
  private n: number;
  private data: TypeData;

  constructor(public elements: React.JSX.Element[], public timer: Timer) {
    this.n = 0;
    this.elements = elements;
    this.timer = timer;
    this.data = new TypeData("test");
    this.spanify();
    colorSpan(this.elements, this.elements[0], next_col);
  }

  update_forward = (ev: KeyboardEvent) => {
    ev.preventDefault();
    let color: string;
    let current_char = this.elements.children[this.n].innerHTML;
    if (ev.key == current_char) {
      color = right_col;
    } else {
      color = wrong_col;
      this.data.error_chars.set(
        ev.key,
        this.data.error_chars.get(ev.key) ?? 0 + 1
      );
    }
    colorSpan(this.elements, this.elements.children[this.n], color);
    this.n++;
    if (this.n >= this.elements.children.length) {
      document.removeEventListener("keydown", this.update_forward);
      let timer = document.getElementById("timer");
      if (!!timer) {
        let wpm = Math.floor(
          this.elements.children.length /
            5 /
            (this.timer.delta_ms / (1000 * 60))
        );
        console.log(wpm);
        timer.innerHTML = "WPM: " + String(wpm);
      }
      this.timer.stop();
      this.data.type_time_ms = this.timer.delta_ms;
      this.data.finished = true;
      this.data.username = "test";
      fetch(`${be_uri}/user/data`, {
        method: "POST",
        body: JSON.stringify(this.data),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      }).then((resp) => {
        console.log(
          "Typing data response: ",
          resp.ok ? resp.text() : resp.status + " :" + resp.statusText
        );
      });

      return;
    }
    colorSpan(this.elements, this.elements.children[this.n], next_col);
  };
  update_bar = (ev: KeyboardEvent) => {
    var bar = document.getElementById("progressbar");
    if (!!bar) {
      bar.style.width =
        String(Math.floor((this.n / this.elements.children.length) * 100)) +
        "%";
    }
  };
  update_backward = (ev: KeyboardEvent) => {
    if (ev.key != "Backspace") {
      return;
    }
    if (this.n == 0) {
      return;
    }
    colorSpan(this.elements, this.elements.children[this.n], no_col);
    this.elements.children[this.n];
    console.log(this.n);
    this.n--;
    colorSpan(this.elements, this.elements.children[this.n], next_col);
  };
  spanify = () => {
    var new_text = new Array();
    var char: string;
    this.elements.innerHTML = this.elements.innerHTML.trim();
    console.log(this.elements.innerHTML);
    for (let i = 0; i < this.elements.innerHTML.length; i++) {
      char = this.elements.innerHTML[i];
      new_text.push(`<span class=${no_col}>` + char + "</span>");
    }
    this.elements.innerHTML = new_text.join("");
  };
}
export class Timer {
  private cur_time: number | null;
  public delta_ms: number;
  private start_time: number;
  private interval_id: number;
  constructor() {
    this.cur_time = null;
    this.delta_ms = 0;
    this.start_time = -1;
    this.interval_id = -1;
  }
  tick = () => {
    this.cur_time = new Date().getTime();
    this.delta_ms = this.cur_time - this.start_time;
    var minutes = Math.floor((this.delta_ms % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((this.delta_ms % (1000 * 60)) / 1000);
    var doc = document.getElementById("timer");
    if (!!doc) {
      doc.innerHTML = "Elapsed Time: " + minutes + ":" + seconds;
    } else {
      console.log("Oh no I cant find element: timer");
    }
  };
  timer = (ev: KeyboardEvent) => {
    this.start_time = new Date().getTime();
    this.interval_id = setInterval(this.tick);
  };
  stop = () => {
    clearInterval(this.interval_id);
    return this.delta_ms;
  };
}
class TypeData {
  public type_time_ms: number;
  public error_chars: Map<string, number>;
  public finished: boolean;
  constructor(public username: string) {
    this.error_chars = new Map<string, number>();
    this.finished = false;
    this.type_time_ms = 0;
    this.username = username;
  }
}

function colorSpan(span: React.JSX., color: string) {
  let char = span.innerHTML;
  return new_span;
}
