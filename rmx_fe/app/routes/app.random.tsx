import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { getSession, commitSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId") ?? null;
  if (!userId) {
    session.unset("userId");
    return redirect("/login", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
  const resp = await fetch(`${process.env.BE_URL}/random`);
  const project = await resp.json();

  return redirect(`/app/${project.project_id}/0`);
}
