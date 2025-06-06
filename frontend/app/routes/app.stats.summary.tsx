import { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { getSession, getUserIdChecked } from "~/sessions";

type DataType = {
  error_rate: number;
  wpm: number;
  typing_length: number;
  title: string;
  lang: string;
};
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = getUserIdChecked(session);
  const resp = await fetch(`${process.env.BE_URL}/${userId}/stats`);
  if (!resp.status) {
    console.log(resp.body);
    throw new Error("Ah fuck.");
  }
  const data: DataType[] = await resp.json();

  const wpm = data.map((v) => v.wpm).reduce((pv, v) => pv + v) / data.length;
  return { data, wpm };
}
export default function Summary() {
  const { data, wpm } = useLoaderData<typeof loader>();
  return (
    <div className="mx-auto w-2/3 items-center">
      <div>You don't suck too bad {wpm} wpm!</div>
      <Table data={data} />
    </div>
  );
}

function Table({ data }: { data: DataType[] }) {
  return (
    <div className="mx-auto w-full items-center">
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-left text-sm text-gray-500 rtl:text-right dark:text-gray-400">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Language</th>
              <th className="px-6 py-3">Error Rate</th>
              <th className="px-6 py-3">Length</th>
              <th className="px-6 py-3">WPM</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => {
              return (
                <tr className="border-b odd:bg-white even:bg-gray-50 dark:border-gray-700 odd:dark:bg-gray-900 even:dark:bg-gray-800">
                  <td className="px-6 py-3">{d.title}</td>
                  <td className="px-6 py-3">{d.lang}</td>
                  <td className="px-6 py-3">{d.error_rate}</td>
                  <td className="px-6 py-3">{d.typing_length}</td>
                  <td className="px-6 py-3">{d.wpm}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
