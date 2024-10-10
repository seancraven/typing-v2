import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { defer } from "@remix-run/node";
import { Suspense } from "react";
import { Await, useFetcher, useLoaderData, useParams } from "@remix-run/react";
import Typing from "~/components/typing";

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
export async function loader() {
  let endpoint = `${be_url}/text`;

  let promise: Promise<any> = fetch(endpoint).then((resp) => {
    return resp.json();
  });
  return defer({ promise });
}

function TypingZone() {
  let { promise } = useLoaderData<typeof loader>();
  let fetcher = useFetcher<typeof action>();

  return (
    <div className="w-full lg:max-w-35 mx-auto text-3xl h-full items-center">
      <Suspense
        fallback={<div className="w-full bg-white">hi before she loads</div>}
      >
        <Await resolve={promise}>
          {(promise) => {
            return <Typing text={promise.text} fetcher={fetcher}></Typing>;
          }}
        </Await>
      </Suspense>
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
export async function action({ request }: ActionFunctionArgs) {
  console.log("Hit the loader");
  console.log(request);
  const json = await request.json();
  fetch("http://localhost:8080/json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
  return null;
}
const no_col = "text-gray-200";
const right_col = "text-gray-400";
const wrong_col = "bg-red-800 text-gray-200 rounded";
const next_col = "bg-violet-800 text-gray-200 rounded";
const be_url = "http://localhost:8080";
