import StatsCards from "~/components/StatsCards";
import QuickStart from "~/components/QuickStart";
import DailyGoals from "~/components/DailyGoals";
import LineGraph from "~/components/LineGraph";
import RecentSessions from "~/components/RecentSessions";
import { getCookieSession, getUserIdChecked } from "~/sessions";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { TypeData, TopicsData } from "~/typeApi";
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
  const langsProm = fetch(`${process.env.BE_URL}/${userId}/lang`).then(
    handleResponse,
  ) as Promise<{ langs: string[]; user_langs: string[] }>;
  const topicProm = fetch(`${process.env.BE_URL}/topics`).then(
    handleResponse,
  ) as Promise<{ topics: TopicsData[] }>;
  const [stats, languageData, topics] = await Promise.all([
    responseProm,
    langsProm,
    topicProm,
  ]);

  return { stats, languageData, userId, topics };
}

export default function Dashboard() {
  const { stats, languageData, userId, topics } =
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
  const languages = languageData.langs.map((lang) => ({
    id: lang,
    name: lang,
    status: languageData.user_langs.includes(lang),
  }));
  const [filterState, setFilterState] = useState<string[]>([]);
  const data = stats.filter((v) => {
    return !filterState.includes(v.lang);
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
            data={languages}
            userId={userId}
            setFilterState={setFilterState}
          />
          <DailyGoals data={data} />
          <QuickStart topicsData={topics.topics} />
        </div>
        <RecentSessions data={data} />
      </div>
    </div>
  );
}
