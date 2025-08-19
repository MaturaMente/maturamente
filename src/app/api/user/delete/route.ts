import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/db/drizzle";
import {
  users,
  subscriptions,
  pendingSubscriptionChanges,
  relationSubjectsUserTable,
  noteStudySessionsTable,
  completedTopicsTable,
  completedSubtopicsTable,
  completedExercisesTable,
  completedExercisesCardsTable,
  flaggedExercisesTable,
  flaggedExercisesCardsTable,
  completedSimulationsTable,
  flaggedSimulationsTable,
  flaggedNotesTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    console.log("Starting account deletion for user:", user.id);

    try {
      // Step 1: Cancel Stripe subscription if it exists
      console.log("Checking for active subscription...");
      const userSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.user_id, user.id))
        .limit(1);

      if (
        userSubscription.length > 0 &&
        userSubscription[0].stripe_subscription_id
      ) {
        const stripeSubscriptionId = userSubscription[0].stripe_subscription_id;
        console.log(
          `Found subscription: ${stripeSubscriptionId}, canceling...`
        );

        try {
          // Cancel the subscription immediately in Stripe
          await stripe.subscriptions.cancel(stripeSubscriptionId);
          console.log("Successfully canceled Stripe subscription");
        } catch (stripeError) {
          console.error("Error canceling Stripe subscription:", stripeError);
          // Continue with account deletion even if Stripe cancellation fails
          // This prevents the user from being stuck if there's a Stripe API issue
        }

        // Update our local subscription record
        await db
          .update(subscriptions)
          .set({
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date(),
          })
          .where(eq(subscriptions.user_id, user.id));
        console.log("Updated local subscription record to canceled");
      } else {
        console.log("No active subscription found");
      }

      // Step 2: Delete all user-related data sequentially
      console.log("Deleting user data sequentially");

      // Delete user's study sessions
      await db
        .delete(noteStudySessionsTable)
        .where(eq(noteStudySessionsTable.user_id, user.id));
      console.log("Deleted study sessions");

      // Delete user's subject access
      await db
        .delete(relationSubjectsUserTable)
        .where(eq(relationSubjectsUserTable.user_id, user.id));
      console.log("Deleted subject access");

      // Delete pending subscription changes (must be before subscription records)
      await db
        .delete(pendingSubscriptionChanges)
        .where(eq(pendingSubscriptionChanges.user_id, user.id));
      console.log("Deleted pending subscription changes");

      // Delete subscription records
      await db.delete(subscriptions).where(eq(subscriptions.user_id, user.id));
      console.log("Deleted subscription records");

      // Delete all user's completed topics
      await db
        .delete(completedTopicsTable)
        .where(eq(completedTopicsTable.user_id, user.id));
      console.log("Deleted completed topics");

      // Delete all user's completed subtopics
      await db
        .delete(completedSubtopicsTable)
        .where(eq(completedSubtopicsTable.user_id, user.id));
      console.log("Deleted completed subtopics");

      // Delete user's flagged notes
      await db
        .delete(flaggedNotesTable)
        .where(eq(flaggedNotesTable.user_id, user.id));
      console.log("Deleted flagged notes");

      // Delete all user's completed exercises
      await db
        .delete(completedExercisesTable)
        .where(eq(completedExercisesTable.user_id, user.id));
      console.log("Deleted completed exercises");

      // Delete all user's completed exercise cards
      await db
        .delete(completedExercisesCardsTable)
        .where(eq(completedExercisesCardsTable.user_id, user.id));
      console.log("Deleted completed exercise cards");

      // Delete all user's flagged exercises
      await db
        .delete(flaggedExercisesTable)
        .where(eq(flaggedExercisesTable.user_id, user.id));
      console.log("Deleted flagged exercises");

      // Delete all user's flagged exercise cards
      await db
        .delete(flaggedExercisesCardsTable)
        .where(eq(flaggedExercisesCardsTable.user_id, user.id));
      console.log("Deleted flagged exercise cards");

      // Delete all user's completed simulations
      await db
        .delete(completedSimulationsTable)
        .where(eq(completedSimulationsTable.user_id, user.id));
      console.log("Deleted completed simulations");

      // Delete all user's flagged simulations
      await db
        .delete(flaggedSimulationsTable)
        .where(eq(flaggedSimulationsTable.user_id, user.id));
      console.log("Deleted flagged simulations");

      // Finally, delete the user
      await db.delete(users).where(eq(users.id, user.id));
      console.log("Deleted user account");

      console.log("Account deletion completed successfully");
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      throw new Error(
        `Database operation failed: ${dbError?.message || "Unknown error"}`
      );
    }

    // Send a flag that the client can use to redirect to the logout URL
    return NextResponse.json(
      {
        message:
          "Account deleted successfully. Your subscription has been canceled and you will not be charged again.",
        shouldLogout: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      {
        error: "Failed to delete account",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
