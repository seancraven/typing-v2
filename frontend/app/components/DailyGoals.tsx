import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { TypeData, GoalData } from "~/typeApi";
import { Button } from "./ui/button";

export default function DailyGoals({
  data,
  goals,
}: {
  data: TypeData[];
  goals: GoalData;
}) {
  const totalTimeS = data.reduce((acc, cur) => acc + cur.typing_length, 0);
  const totalWpm =
    data.reduce((acc, cur) => acc + cur.wpm, 0) / Math.max(data.length, 1);
  const totalTimeMinutes = (totalTimeS / 60).toFixed(0);
  const completion = (totalTimeS / goals.time_spent) * 100;
  const totalErrorRate =
    data.reduce((acc, cur) => acc + cur.error_rate, 0) /
    Math.max(data.length, 1);
  let accuracy = (1 - totalErrorRate) * 100;
  if (data.length === 0) {
    accuracy = 0;
  }
  const [editMode, setEditMode] = useState(false);
  if (!editMode) {
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
              <span>
                {totalTimeMinutes}/{(goals.time_spent / 60).toFixed(0)} minutes
              </span>
            </div>
            <CompletionBar completion={completion} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Typing Speed</span>
              <span>
                {totalWpm.toFixed(0)}/{goals.wpm.toFixed(0)} WPM
              </span>
            </div>
            <CompletionBar completion={(totalWpm / goals.wpm) * 100} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Accuracy</span>
              <span>
                {accuracy.toFixed(0)}%/{goals.accuracy.toFixed(0)}%
              </span>
            </div>
            <CompletionBar completion={(accuracy / goals.accuracy) * 100} />
          </div>
          <Button
            onClick={() => {
              setEditMode(true);
            }}
          >
            Edit
          </Button>
        </CardContent>
      </Card>
    );
  }
  return <DailyGoalsEditable goalsState={goals} setEditMode={setEditMode} />;
}

function CompletionBar({ completion }: { completion: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-secondary">
      <div
        style={{ width: `${Math.max(Math.min(completion, 100), 0)}%` }}
        className={`h-2 rounded-full ${completion < 100 ? "bg-primary" : "bg-chart-2"}`}
      ></div>
    </div>
  );
}

function DailyGoalsEditable({
  goalsState,
  setEditMode,
}: {
  goalsState: GoalData;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const fetcher = useFetcher();
  useEffect(() => {
    if (fetcher.data !== undefined) {
      setEditMode(false);
    }
  }, [fetcher]);
  return (
    <fetcher.Form
      method="POST"
      action="/api/goals"
      encType="multipart/form-data"
    >
      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
          <CardDescription>Set your goals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Practice Time</span>
              <Input
                className="ml-auto w-16 justify-end"
                type="number"
                name="practice_time_min"
                defaultValue={(goalsState.time_spent / 60).toFixed(0)}
                min={0}
              />
              <span className="w-16">minutes</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Typing Speed</span>
              <Input
                className="ml-auto w-16 justify-end"
                type="number"
                name="wpm"
                defaultValue={goalsState.wpm}
                min={0}
              />{" "}
              <span className="w-16">WPM</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Accuracy</span>
              <Input
                className="ml-auto w-16 justify-end"
                type="number"
                name="accuracy"
                defaultValue={goalsState.accuracy}
                min={0}
                max={100}
              />{" "}
              <span className="w-16 pl-1">%</span>
            </div>
          </div>
          <Button>Save</Button>
          {fetcher.data?.error}
        </CardContent>
      </Card>
    </fetcher.Form>
  );
}
