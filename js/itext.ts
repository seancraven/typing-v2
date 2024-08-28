const be_uri = "http://localhost:3000";
const no_col = "text-gray-200";
const right_col = "text-gray-400";
const wrong_col = "bg-red-800 text-gray-200 rounded";
const next_col = "bg-violet-800 text-gray-200 rounded";

class TextEntryHandler {
  private n: number;
  private data: TypeData;

  constructor(
    public html: HTMLElement,
    public timer: Timer,
  ) {
    this.n = 0;
    this.html = html;
    this.timer = timer;
    this.data = new TypeData("test");
    this.spanify();
    colorSpan(this.html, this.html.children[0], next_col);
  }

  update_forward = (ev: KeyboardEvent) => {
    ev.preventDefault();
    let color: string;
    let current_char = this.html.children[this.n].innerHTML;
    if (ev.key == current_char) {
      color = right_col;
    } else {
      color = wrong_col;
      this.data.error_chars[ev.key] += 1;
    }
    colorSpan(this.html, this.html.children[this.n], color);
    this.n++;
    if (this.n >= this.html.children.length) {
      document.removeEventListener("keydown", this.update_forward);
      let timer = document.getElementById("timer");
      if (!!timer) {
        let wpm = Math.floor(
          this.html.children.length / 5 / (this.timer.delta_ms / (1000 * 60)),
        );
        console.log(wpm);
        timer.innerHTML = "WPM: " + String(wpm);
      }
      this.timer.stop();
      this.data.type_time_s = this.timer.delta_ms;
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
          resp.ok ? resp.text() : resp.status + " :" + resp.statusText,
        );
      });

      return;
    }
    colorSpan(this.html, this.html.children[this.n], next_col);
  };
  update_bar = (ev: KeyboardEvent) => {
    var bar = document.getElementById("progressbar");
    if (!!bar) {
      bar.style.width =
        String(Math.floor((this.n / this.html.children.length) * 100)) + "%";
    }
  };
  update_backward = (ev: KeyboardEvent) => {
    if (ev.key != "Backspace") {
      return;
    }
    if (this.n == 0) {
      return;
    }
    colorSpan(this.html, this.html.children[this.n], no_col);
    this.html.children[this.n];
    console.log(this.n);
    this.n--;
    colorSpan(this.html, this.html.children[this.n], next_col);
  };
  spanify = () => {
    var new_text = new Array();
    var char: string;
    for (let i = 0; i < this.html.innerHTML.length; i++) {
      char = this.html.innerHTML[i];
      new_text.push(`<span class=${no_col}>` + char + "</span>");
    }
    this.html.innerHTML = new_text.join("");
  };
}
class Timer {
  private cur_time: number;
  public delta_ms: number;
  private start_time: number;
  private interval_id: number;
  constructor() {}
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
  public type_time_s: number;
  public error_chars: Map<string, number>;
  public finished: boolean;
  constructor(public username: string) {
    this.error_chars = new Map();
    this.finished = false;
    this.type_time_s = 0;
    this.username = username;
  }
}

function colorSpan(parent: Element, span: Element, color: string) {
  let char = span.innerHTML;

  let new_span = document.createElement("span");
  new_span.className = color;
  new_span.innerHTML = char;
  parent.replaceChild(new_span, span);
}
var p = document.getElementById("input_text");
if (!p) {
  console.log("Doesn't exist");
  throw new Error("fucked");
} else {
  var doc = p;
}
console.log("Found input text");
var n = 0;
var timer = new Timer();
var text_entry = new TextEntryHandler(p, timer);
document.addEventListener("keypress", text_entry.timer.timer, { once: true });
document.addEventListener("keypress", text_entry.update_forward);
document.addEventListener("keypress", text_entry.update_bar);
document.addEventListener("keydown", text_entry.update_backward);
