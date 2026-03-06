import BubbleUniverse from "@/components/BubbleUniverse";

interface PageProps {
  searchParams?: {
    limit?: string;
  };
}

export default async function Home({ searchParams }: PageProps) {
  const parsedLimit = Number(searchParams?.limit ?? "80");
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 10), 200) : 80;

  return <BubbleUniverse initialLimit={limit} />;
}
