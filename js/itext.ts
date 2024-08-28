const no_col = "text-gray-200";
const right_col = "text-gray-400";
const wrong_col = "bg-red-800 text-gray-200 rounded";
const next_col = "bg-violet-800 text-gray-200 rounded";

class TextEntry {
  private n: number;
  constructor(
    public html: HTMLElement,
    public timer: Timer,
  ) {
    this.n = 0;
    this.html = html;
    this.timer = timer;
    this.spanify();
    colorSpan(this.html, this.html.children[0], next_col);
  }

  /**
   * update_state
   */
  update_state = (ev: KeyboardEvent) => {
    ev.preventDefault();
    this.update_forward(ev);
  };
  update_forward = (ev: KeyboardEvent) => {
    let color: string;
    let current_char = this.html.children[this.n].innerHTML;
    if (ev.key == current_char) {
      color = right_col;
    } else {
      color = wrong_col;
    }
    colorSpan(this.html, this.html.children[this.n], color);
    this.n++;
    if (this.n >= this.html.children.length) {
      document.removeEventListener("keydown", this.update_state);
      this.timer.stop();
      return;
    }
    colorSpan(this.html, this.html.children[this.n], next_col);
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
  private delta: number;
  private start_time: number;
  private interval_id: number;
  constructor() {}
  tick = () => {
    this.cur_time = new Date().getTime();
    this.delta = this.cur_time - this.start_time;
    var minutes = Math.floor((this.delta % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((this.delta % (1000 * 60)) / 1000);
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
    return this.delta;
  };
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
var text_entry = new TextEntry(p, timer);
document.addEventListener("keypress", text_entry.timer.timer, { once: true });
document.addEventListener("keypress", text_entry.update_state);
document.addEventListener("keydown", text_entry.update_backward);
