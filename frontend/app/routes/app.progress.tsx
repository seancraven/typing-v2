import { Outlet, useLoaderData, useRouteError } from "react-router";
import { LoaderFunctionArgs } from "react-router";
import { getSession, getUserIdChecked } from "~/sessions";
import Journey from "~/components/journey";

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

  return (
    <div className="relative h-full w-full justify-center" id="progress">
      <div className="mx-auto h-full w-full items-center text-3xl">
        <div className="w-min-[800px] w-max-[1600px] mx-auto grid h-[200px] w-2/3 grid-cols-1 items-center">
          <div className="col-span-1 mx-auto w-[800px]">
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
          <div className="col-span-1 flex">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
