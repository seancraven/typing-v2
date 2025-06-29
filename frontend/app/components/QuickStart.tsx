import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { TopicsData } from "~/typeApi";
import { useState } from "react";
import { useNavigate } from "react-router";

export default function QuickStart({
  topicsData,
}: {
  topicsData: TopicsData[];
}) {
  const navigate = useNavigate();
  const initalTopic = topicsData[0];
  const [topic, setTopic] = useState(initalTopic);
  const [topicIndex, setTopicIndex] = useState(0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Start</CardTitle>
        <CardDescription>Begin a new typing session</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="col-span-1 space-y-2">
          <Label htmlFor="language"> Langague </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start capitalize"
              >
                {topic.lang}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {topicsData.map((topic, i) => (
                <DropdownMenuItem
                  key={i}
                  className="capitalize"
                  onClick={() => setTopic(topic)}
                >
                  {topic.lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="col-span-1 space-y-2">
          <Label htmlFor="topics">Topic</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {topic.topics[topicIndex][1]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {topic.topics.map((topic, i) => (
                <DropdownMenuItem key={i} onClick={() => setTopicIndex(i)}>
                  {topic[1]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          size="lg"
          className="col-span-2"
          onClick={() =>
            navigate(`/app/progress/${topic.topics[topicIndex][0]}/0`)
          }
        >
          Quick Start
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="col-span-2"
          onClick={() => navigate("/app/random")}
        >
          Random Topic
        </Button>
      </CardContent>
    </Card>
  );
}
