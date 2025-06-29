import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { TypeData } from "~/typeApi";

export default function DailyGoals({ data }: { data: TypeData[] }) {
  const totalTime = data.reduce((acc, cur) => acc + cur.typing_length, 0);
  const totalWpm =
    data.reduce((acc, cur) => acc + cur.wpm, 0) / Math.max(data.length, 1);
  const goalTime = 30 * 60;
  const totalTimeMinutes = (totalTime / 60).toFixed(0);
  const completion = (totalTime / goalTime) * 100;
  const totalErrorRate =
    data.reduce((acc, cur) => acc + cur.error_rate, 0) /
    Math.max(data.length, 1);
  const accuracy = (1 - totalErrorRate) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals</CardTitle>
        <CardDescription>Track your progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Practice Time</span>
            <span>{totalTimeMinutes}/30 minutes</span>
          </div>
          <CompletionBar completion={completion} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Typing Speed</span>
            <span>{totalWpm.toFixed(0)}/70 WPM</span>
          </div>
          <CompletionBar completion={(totalWpm / 70) * 100} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Accuracy</span>
            <span>{accuracy.toFixed(0)}%/95%</span>
          </div>
          <CompletionBar completion={(accuracy / 95) * 100} />
        </div>
      </CardContent>
    </Card>
  );
}

function CompletionBar({ completion }: { completion: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-secondary">
      <div
        style={{ width: `${Math.max(Math.min(completion, 100), 0)}%` }}
        className={`h-2 rounded-full ${completion < 100 ? "bg-primary" : "bg-green-500"}`}
      ></div>
    </div>
  );
}
