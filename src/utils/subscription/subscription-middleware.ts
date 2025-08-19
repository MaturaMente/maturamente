import { auth } from "@/lib/auth";
import {
  hasSubjectAccess,
  getSubscriptionStatus,
} from "@/utils/subscription-utils";
import { redirect } from "next/navigation";

export async function requireActiveSubscription() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const subscriptionStatus = await getSubscriptionStatus(session.user.id);

  if (!subscriptionStatus?.isActive) {
    redirect("/pricing");
  }

  return { session, subscriptionStatus };
}

export async function requireSubjectAccess(subjectId: string) {
  const { session } = await requireActiveSubscription();

  if (!session.user?.id) {
    redirect("/api/auth/signin");
  }

  const hasAccess = await hasSubjectAccess(session.user.id, subjectId);

  if (!hasAccess) {
    redirect("/dashboard?error=no-subject-access");
  }

  return session;
}

export async function checkSubjectAccess(subjectId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  return hasSubjectAccess(session.user.id, subjectId);
}

export async function getAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user!;
}
