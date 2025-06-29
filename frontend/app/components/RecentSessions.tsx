import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import TypeTable from "~/components/TypeTable";
import { TypeData } from "~/typeApi";

export default function RecentSessions({ data }: { data: TypeData[] }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Recent Sessions</CardTitle>
        <CardDescription>Your latest typing practice results</CardDescription>
      </CardHeader>
      <CardContent>
        <TypeTable data={data} />
      </CardContent>
    </Card>
  );
}
