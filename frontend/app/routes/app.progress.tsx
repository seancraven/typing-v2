import { Outlet, useLoaderData, LoaderFunctionArgs } from "react-router";
import { getCookieSession, getUserIdChecked } from "~/sessions";
import Journey from "~/components/journey";
import { useEffect, useRef } from "react";
import { MaxProgressData } from "~/typeApi";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = getUserIdChecked(await getCookieSession(request));
  const endpoint = `${process.env.BE_URL}/${userId}/progress`;
  const resp = await fetch(endpoint);
  if (resp.status != 200) {
    throw new Error("Whelp seomthing went wrong: " + resp.body);
  }
  const json = resp.json() as Promise<MaxProgressData[]>;
  return json;
}

export default function TypingTest() {
  const progJson = useLoaderData<typeof loader>();
  const ref = useRef(null);
  useEffect(() => {
    document
      .getElementById("progress")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  });

  return (
    <div className="mx-auto h-full w-full max-w-7xl" id="progress" ref={ref}>
      <div className="w-full text-3xl">
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
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
}
