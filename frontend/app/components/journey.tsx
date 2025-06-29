import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";

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
  nameProgress = nameProgress.filter((v) => v.progress !== 1);
  nameProgress = nameProgress.slice(0, 5);
  const navigate = useNavigate();
  return (
    <div className="mx-auto pb-6 pt-6">
      <div className="xlg:grid-cols-6 mx-auto grid gap-4 sm:grid-cols-1 md:grid-cols-4 lg:grid-cols-5">
        {nameProgress.map((item, index) => (
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/app/progress/${item.topic_id}/${item.final_idx}`)
            }
            key={index}
            className={`min-h-20 w-full flex-col space-y-2 p-4 ${index == 0 && "hidden sm:block"} ${index == 1 && "hidden md:block"} ${index == 2 && "hidden lg:block"} ${index == 3 && "xlg:block hidden"}`}
            title={item.topic}
          >
            <div className="w-full rounded-md">
              <div className="mb-2 flex items-center justify-between text-sm">
                <div className="line-clamp-2 flex-1 text-left font-medium">
                  {item.topic}
                </div>
                <div className="ml-2 text-right">
                  {(item.progress * 100).toFixed(0)}%
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
                  style={{ width: `${(item.progress * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => navigate(`/app/random`)}
          className="min-h-20 w-full flex-col justify-center p-4"
        >
          <div className="w-full rounded-md">
            <div className="flex items-center justify-center text-sm">
              <span className="text-center font-medium">New Random Topic</span>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}
