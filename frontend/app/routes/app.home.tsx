import StatsCards from "~/components/StatsCards";
import QuickStart from "~/components/QuickStart";
import DailyGoals from "~/components/DailyGoals";
import LineGraph from "~/components/LineGraph";
import RecentSessions from "~/components/RecentSessions";
import { getCookieSession, getUserIdChecked } from "~/sessions";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { TypeData, TopicsData, GoalData } from "~/typeApi";
import { LanguageTable } from "~/components/LanguageTable";
import { useState } from "react";

function handleResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`failed to fetch data from ${response.url}`);
  }
  return response.json();
}
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = getUserIdChecked(await getCookieSession(request));
  const responseProm = fetch(`${process.env.BE_URL}/${userId}/stats`).then(
    handleResponse,
  ) as Promise<TypeData[]>;
  const topicProm = fetch(`${process.env.BE_URL}/topics`).then(
    handleResponse,
  ) as Promise<{ topics: TopicsData[] }>;
  const langsProm = fetch(`${process.env.BE_URL}/langs`).then(
    handleResponse,
  ) as Promise<{ langs: string[] }>;
  const goalsProm = fetch(`${process.env.BE_URL}/${userId}/goals`).then(
    handleResponse,
  ) as Promise<GoalData>;
  const [stats, langs, topics, goals] = await Promise.all([
    responseProm,
    langsProm,
    topicProm,

    goalsProm,
  ]);

  return { stats, userId, topics, goals, langs };
}

export default function Dashboard() {
  const { stats, userId, topics, goals, langs } =
    useLoaderData<typeof loader>();

  // Deduplicate topics
  topics.topics.map((topic) => {
    const newTopics = new Map() as Map<string, number>;
    topic.topics.map((topic) => {
      newTopics.set(topic[1], topic[0]);
    });
    topic.topics = Array.from(newTopics.entries()).map(
      ([key, value]) => [value, key] as [number, string],
    );
  });
  const [filterState, setFilterState] = useState<string[]>([]);
  const data = stats.filter((v) => {
    return filterState.includes(v.lang);
  });

  return (
    <div className="h-full bg-background p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Typing Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track your typing progress and improve your skills
            </p>
          </div>
        </div>

        <StatsCards data={data} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <LineGraph data={data} />
          <LanguageTable
            data={langs.langs.map((lang) => {
              return {
                id: lang,
                name: lang,
                status: true,
              };
            })}
            userId={userId}
            setFilterState={setFilterState}
          />
          <DailyGoals data={data} goals={goals} />
          <QuickStart topicsData={topics.topics} />
        </div>
        <RecentSessions data={data} />
      </div>
    </div>
  );
}
