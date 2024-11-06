import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { defer } from "@remix-run/node";
import { Suspense, useState } from "react";
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
  const endpoint = `${be_url}/text`;

  const promise = fetch(endpoint).then((resp) => {
    return resp.json();
  });
  return defer({ promise });
}

function TypingZone() {
  const { promise } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [complete, setComplete] = useState(false);

  return (
    <div className="w-full lg:max-w-35 mx-auto text-3xl h-full items-center">
      <Suspense
        fallback={<div className="w-full bg-white">hi before she loads</div>}
      >
        <Await resolve={promise}>
          {(promise) => {
            if (!complete) {
              return (
                <Typing
                  text={promise.text}
                  fetcher={fetcher}
                  setComplete={setComplete}
                >
                  {" "}
                </Typing>
              );
            } else {
              return (
                <button
                  onClick={() => {
                    setComplete(false);
                  }}
                >
                  Reset
                </button>
              );
            }
          }}
        </Await>
      </Suspense>
    </div>
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
const be_url = "http://localhost:8080";
