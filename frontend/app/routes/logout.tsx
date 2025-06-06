import { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { commitSession, getSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  session.unset("userId");
  return redirect("/", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}
