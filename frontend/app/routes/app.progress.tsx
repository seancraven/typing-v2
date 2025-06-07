import { Outlet, useLoaderData } from "react-router";
import { LoaderFunctionArgs } from "react-router";
import { getSession, getUserIdChecked } from "~/sessions";
import Journey from "~/components/journey";
import { useEffect, useRef } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = getUserIdChecked(session);
  const endpoint = `${process.env.BE_URL}/${userId}/progress`;
  const resp = await fetch(endpoint);
  if (resp.status != 200) {
    throw new Error("Whelp seomthing went wrong: " + resp.body);
  }
  const json = resp.json();
  return json;
}

export default function TypingTest() {
  const progJson: {
    lang: string;
    progress: number;
    final_idx: number;
    topic_id: number;
    title: string;
  }[] = useLoaderData();
  const ref = useRef(null);
  useEffect(() => {
    document
      .getElementById("progress")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  });

  return (
    <div
      className="flex min-h-screen w-full justify-center"
      id="progress"
      ref={ref}
    >
      <div className="mx-auto h-full justify-center text-3xl">
        <div className="mx-auto items-center justify-center">
          <div className="mx-auto flex items-center">
            <Journey
              nameProgress={progJson.map(
                ({ final_idx, progress, topic_id, lang, title }) => {
                  return {
                    topic: `${lang[0].toLocaleUpperCase()}${lang.slice(1)}: ${title}`,
                    progress,
                    final_idx,
                    topic_id,
                  };
                },
              )}
            />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
