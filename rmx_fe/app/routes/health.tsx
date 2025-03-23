import { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  const out = await fetch(`${process.env.BACKEND_URL}/health/status`);
  return { health: "Healthy", backend: out.status };
};
