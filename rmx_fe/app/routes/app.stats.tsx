import { Outlet } from "@remix-run/react";

export function loader() {
  return null;
}

export default function Stats() {
  return (
    <div className="text-gray-800 dark:text-gray-200">
      <div>Stats bro!</div>
      <Outlet />
    </div>
  );
}
