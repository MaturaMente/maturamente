import React from "react";
import type { DashboardStudyTimeData } from "@/types/dashboardTypes";

interface StudyTimeChartProps {
  studyTimeData: DashboardStudyTimeData;
}

export function StudyTimeChart({ studyTimeData }: StudyTimeChartProps) {
  // Get the maximum value for scaling
  const maxMinutes = Math.max(
    ...studyTimeData.weeklyData.map((day) => day.hours * 60 + day.minutes),
    1 // Ensure we don't divide by zero
  );

  // Create a complete week array with default values
  const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const completeWeekData = weekDays.map((day) => {
    const existingData = studyTimeData.weeklyData.find((d) => d.day === day);
    return {
      day,
      hours: existingData?.hours || 0,
      minutes: existingData?.minutes || 0,
    };
  });

  return (
    <div className="space-y-4">
      {/* Total time display */}
      <div className="text-center">
        <div className="text-2xl font-bold">
          {studyTimeData.totalHours}h {studyTimeData.totalMinutes}m
        </div>
        <div className="text-sm text-muted-foreground">Questa settimana</div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between gap-1 h-16">
        {completeWeekData.map((dayData, index) => {
          const totalMinutes = dayData.hours * 60 + dayData.minutes;
          const heightPercentage = (totalMinutes / maxMinutes) * 100;

          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className="w-2 bg-primary rounded-sm transition-all duration-300"
                style={{
                  height: `${Math.max(4, heightPercentage)}%`,
                  opacity: totalMinutes > 0 ? 1 : 0.3,
                }}
              />
              <span className="text-xs text-muted-foreground">
                {dayData.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
