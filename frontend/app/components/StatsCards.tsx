import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { TypeData } from "~/typeApi";

export default function StatsCards({ data }: { data: TypeData[] }) {
  const averageWpm =
    data.reduce((acc, cur) => acc + cur.wpm, 0) / Math.max(data.length, 1);
  const formattedWpm = averageWpm.toFixed(2);
  const errorRate =
    data.reduce((acc, cur) => acc + cur.error_rate, 0) /
    Math.max(data.length, 1);
  const totalSessions = data.length;
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{formattedWpm}</CardTitle>
          <CardDescription>Average WPM</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-primary">+12% from last week</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{errorRate.toFixed(2)}%</CardTitle>
          <CardDescription>ErrorRate</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-primary">+3% from last week</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{totalSessions}</CardTitle>
          <CardDescription>Total Sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">3 this week</p>
        </CardContent>
      </Card>
    </div>
  );
}
