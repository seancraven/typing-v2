import { LoaderFunction } from "react-router";

export const loader: LoaderFunction = async () => {
  const out = await fetch(`${process.env.BACKEND_URL}/health/status`);
  return { health: "Healthy", backend: out.status };
};
