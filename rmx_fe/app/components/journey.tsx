import { Link } from "@remix-run/react";

export default function Journey({
  nameProgress,
}: {
  nameProgress: {
    topic_id: number;
    progress: number;
    topic: string;
    final_idx: number;
  }[];
}) {
  nameProgress.sort((a, b) => {
    if (a.progress > b.progress) {
      return -1;
    } else if (a.progress == b.progress) {
      return 0;
    } else {
      return 1;
    }
  });
  nameProgress = nameProgress.slice(0, 4);
  return (
    <div className="container flex w-full max-w-4xl items-center p-6">
      <div className="mx-auto grid h-20 w-full grid-cols-4 gap-4">
        {nameProgress.map((item, index) => (
          <Link
            to={`/app/progress/${item.topic_id}/${item.final_idx}#progress`}
            key={index}
            className="w-min-64 mx-auto flex h-full w-full flex-col space-y-2 px-2"
          >
            <div className="mt-auto flex justify-end text-sm">
              <span className="mt-auto justify-end font-medium text-gray-800 dark:text-gray-200">
                {item.topic}
              </span>
              <span className="ml-auto justify-end text-gray-800 dark:text-gray-200">
                {(item.progress * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-in-out"
                style={{ width: `${(item.progress * 100).toFixed(1)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
