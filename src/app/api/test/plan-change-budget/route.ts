import { NextRequest, NextResponse } from "next/server";
import { addBudgetToCurrentPeriod, calculateMonthlyAIBudget } from "@/utils/ai-budget/budget-management";

export async function POST(request: NextRequest) {
  try {
    const { userId, currentPrice, newPrice, changeType } = await request.json();

    if (!userId || !currentPrice || !newPrice || !changeType) {
      return NextResponse.json({
        error: "Missing required fields: userId, currentPrice, newPrice, changeType"
      }, { status: 400 });
    }

    console.log("Testing plan change budget logic:", {
      userId,
      currentPrice,
      newPrice,
      changeType
    });

    if (changeType === "upgrade" && newPrice > currentPrice) {
      // Calculate additional budget for upgrade
      const additionalBudgetEur = (newPrice - currentPrice) * 0.25;
      
      console.log("Processing upgrade:", {
        priceDifference: newPrice - currentPrice,
        additionalBudgetEur
      });

      // Add budget to current period
      const result = await addBudgetToCurrentPeriod(userId, additionalBudgetEur);
      
      return NextResponse.json({
        success: true,
        changeType: "upgrade",
        additionalBudgetEur,
        result,
        message: "Additional budget added to current period"
      });

    } else if (changeType === "downgrade") {
      // For downgrades, just calculate what the next period budget will be
      const newMonthlyBudget = calculateMonthlyAIBudget(newPrice);
      
      return NextResponse.json({
        success: true,
        changeType: "downgrade", 
        currentPeriodAction: "no_change",
        nextPeriodBudget: newMonthlyBudget,
        message: "Current period budget unchanged. New budget will apply next billing cycle."
      });

    } else {
      return NextResponse.json({
        success: false,
        message: "No change needed or invalid change type"
      });
    }

  } catch (error) {
    console.error("Plan change budget test error:", error);
    return NextResponse.json(
      { error: "Test failed", details: error },
      { status: 500 }
    );
  }
}
