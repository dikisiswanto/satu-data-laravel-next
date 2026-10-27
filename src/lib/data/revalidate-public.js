import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

function expireTag(tag) {
  revalidateTag(tag, { expire: 0 });
}

export function invalidatePublicDatasetCache() {
  expireTag("public-datasets");
  expireTag("public-portal-stats");
  expireTag("public-organizations");
  revalidatePath("/", "page");
  revalidatePath("/dataset", "page");
  revalidatePath("/dataset/[slug]", "page");
  revalidatePath("/organisasi", "page");
  revalidatePath("/organisasi/[slug]", "page");
}

export function invalidatePublicIndicatorCache() {
  expireTag("public-indicators");
  expireTag("public-portal-stats");
  revalidatePath("/", "page");
  revalidatePath("/statistik", "page");
}

export function invalidatePublicOrganizationCache() {
  expireTag("public-organizations");
  expireTag("public-datasets");
  expireTag("public-indicators");
  expireTag("public-portal-stats");
  revalidatePath("/", "page");
  revalidatePath("/dataset", "page");
  revalidatePath("/statistik", "page");
  revalidatePath("/organisasi", "page");
  revalidatePath("/organisasi/[slug]", "page");
}
