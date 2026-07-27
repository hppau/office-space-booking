import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    roomId?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { roomId } = await searchParams;

  const suffix = roomId
    ? `&roomId=${encodeURIComponent(roomId)}`
    : "";

  redirect(`/room-designer?tab=layout${suffix}`);
}