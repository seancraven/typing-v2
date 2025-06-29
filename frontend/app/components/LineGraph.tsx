import { useState, useEffect } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
  const yMin = Math.min(...data.map((d) => d.wpm));
  const yMax = Math.max(...data.map((d) => d.wpm));

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Words per minute</CardTitle>
        {/* <CardDescription>January - June 2024</CardDescription> */}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-96 w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              min={yMin}
              max={yMax}
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
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
