import { Link } from "react-router";

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
    <div className="mx-auto flex items-center p-6">
      <div className="xlg:grid-cols-5 mx-auto grid h-20 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {nameProgress.map((item, index) => (
          <Link
            to={`/app/progress/${item.topic_id}/${item.final_idx}#progress`}
            key={index}
            className={`h-full w-full flex-col space-y-2 px-2 ${index == 1 && "hidden md:block"} ${index == 2 && "hidden lg:block"} ${index == 3 && "xlg:block hidden"}`}
          >
            <div className="mt-auto w-[180px] rounded-md bg-gray-200 px-2 py-2 dark:bg-gray-800">
              <div className="flex justify-end text-sm">
                <span className="mt-auto h-10 justify-start font-medium text-gray-800 dark:text-gray-200">
                  {item.topic}
                </span>
                <span className="ml-auto justify-end text-gray-800 dark:text-gray-200">
                  {(item.progress * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-900">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-in-out"
                  style={{ width: `${(item.progress * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
        <Link
          to={`/app/random#progress`}
          className="h-full w-full flex-col space-y-2 px-2"
        >
          <div className="mt-auto w-[180px] rounded-md bg-gray-200 px-2 py-2 dark:bg-gray-800">
            <div className="flex items-center justify-center text-sm">
              <span className="h-12 items-center justify-center font-medium text-gray-800 dark:text-gray-200">
                New Random topic
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
