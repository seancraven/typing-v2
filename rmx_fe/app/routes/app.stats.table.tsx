import { LoaderFunctionArgs } from "@remix-run/node";
import { getSession, getUserIdChecked } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookies"));
  const userId = getUserIdChecked(session);
  const resp = await fetch(`${process.env.BE_URL}/`);

  return null;
}
export default function Table() {
  return (
    <table>
      <tr>
        <th>Hi</th>
        <th>hi</th>
      </tr>
    </table>
  );
}
