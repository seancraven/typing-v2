import { LoaderFunctionArgs } from "react-router";
import { getCookieSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  console.debug("api loader called");
  const session = await getCookieSession(request);
  const userId = session.get("userId");
  const userName = session.get("userName");

  return { userId, userName };
}
