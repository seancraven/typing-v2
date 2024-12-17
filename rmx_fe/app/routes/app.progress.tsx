import {
  Outlet,
  useFetcher,
  useLoaderData,
  useNavigate,
  useRouteError,
} from "@remix-run/react";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { commitSession, getSession } from "~/sessions";
import Journey from "~/components/journey";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId") ?? null;
  if (!userId) {
    session.unset("userId");
    return redirect("/app/login", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
  const endpoint = `${process.env.BE_URL}/${userId}/progress`;
  const resp = await fetch(endpoint);
  if (resp.status != 200) {
    throw new Error("Whelp seomthing went wrong.");
  }
  const json = resp.json();
  return json;
}

export default function TypingTest() {
  const progJson: {
    lang: string;
    progress: number;
    final_idx: string;
    topic_id: number;
  }[] = useLoaderData();
  const nav = useNavigate();

  return (
    <div className="relative h-full w-full justify-center">
      <div className="mx-auto h-full w-full items-center text-3xl">
        <div className="w-min-[800px] w-max-[1600px] mx-auto grid h-[200px] w-2/3 grid-cols-1 items-center">
          <div className="col-span-1 mx-auto w-[800px]">
            <Journey
              nameProgress={progJson.map(
                ({ final_idx, progress, topic_id, lang }) => {
                  return {
                    topic: `${lang[0].toLocaleUpperCase()}${lang.slice(1)}: ${topic_id}`,
                    progress,
                  };
                },
              )}
            ></Journey>
          </div>
          <div className="col-span-1 flex">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();
  // When NODE_ENV=production:
  // error.message = "Unexpected Server Error"
  // error.stack = undefined
  return <div>{error.message}</div>;
}
