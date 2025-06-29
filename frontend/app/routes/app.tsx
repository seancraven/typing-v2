import { LoaderFunctionArgs, Outlet } from "react-router";
import { getUserIdChecked, getCookieSession } from "~/sessions";

export async function loader({ request }: LoaderFunctionArgs) {
  getUserIdChecked(await getCookieSession(request));
  return null;
}

export default function Home() {
  return <Outlet />;
}
