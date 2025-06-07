import { Outlet } from "react-router";

export function loader() {}

export default function Stats() {
  return (
    <div className="text-gray-800 dark:text-gray-200">
      <Outlet />
    </div>
  );
}
