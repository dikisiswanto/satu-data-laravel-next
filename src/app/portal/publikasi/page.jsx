import { redirect } from "next/navigation";
export const metadata = {
  title: "Antrean publikasi",
  robots: { index: false, follow: false },
};
export default function PublicationQueuePage() {
  redirect("/portal/review");
}
