import { useState, useEffect } from "react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import { TypeData } from "~/typeApi";

export const description = "A line chart with dots";

const chartConfig = {
  desktop: {
    label: "wpm",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export default function LineGraph({ data }: { data: TypeData[] }) {
  let yMax = Math.max(...data.map((d) => d.wpm));
  // Accuracy upper bound is 100
  yMax = Math.max(yMax + 10, 110);
  const dataTransformed = data.map((d) => ({
    wpm: d.wpm,
    accuracy: (1 - d.error_rate) * 100,
  }));

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
        {/* <CardDescription>January - June 2024</CardDescription> */}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-96 w-full">
          <LineChart
            accessibilityLayer
            data={dataTransformed}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <Legend />
            <CartesianGrid vertical={false} />
            <XAxis tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, yMax]}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="wpm"
              type="natural"
              strokeWidth={2}
              stroke="hsl(var(--primary))"
              activeDot={{
                r: 6,
              }}
            />
            <Line
              dataKey="accuracy"
              type="natural"
              strokeWidth={2}
              stroke="hsl(var(--chart-2))"
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
