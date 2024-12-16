export default function Journey({
  nameProgress,
}: {
  nameProgress: { topic: string; progress: number }[];
}) {
  return (
    <div className="container flex w-full max-w-4xl items-center p-6">
      <div className="mx-auto grid h-20 w-full grid-cols-4 gap-4">
        {nameProgress.map((item, index) => (
          <div
            key={index}
            className="w-min-64 mx-auto flex h-full w-full flex-col space-y-2 px-2"
          >
            <div className="mt-auto flex justify-end text-sm">
              <span className="mt-auto justify-end font-medium text-gray-700">
                {item.topic}
              </span>
              <span className="ml-auto justify-end text-gray-500">
                {item.progress.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-in-out"
                style={{ width: `${item.progress.toFixed(1)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
