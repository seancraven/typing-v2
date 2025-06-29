import { LoaderFunctionArgs, redirect } from "react-router";
import { commitSession, getSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  session.unset("userId");
  session.unset("userName");
  return redirect("/", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}
