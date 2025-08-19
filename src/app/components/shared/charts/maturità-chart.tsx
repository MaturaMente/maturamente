"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyActivity } from "@/types/statisticsTypes";

interface MaturitàChartProps {
  monthlyActivity: MonthlyActivity[];
  subjectColor: string;
}

type ChartType = "bar" | "line";

// Consistent color definitions
const SIMULATIONS_COLOR = "#3b82f6"; // blue-500
const THEORY_COLOR = "#f59e0b"; // amber-500
const EXERCISES_COLOR = "#10b981"; // emerald-500

export function MaturitàChart({
  monthlyActivity,
  subjectColor = "#3b82f6",
}: MaturitàChartProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // Common breakpoint for 'md'
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup event listener on component unmount
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const processedActivity = isMobile
    ? monthlyActivity.slice(-3)
    : monthlyActivity;

  const isEmpty = processedActivity.every(
    (m) =>
      m.simulations === 0 &&
      m.topics === 0 &&
      m.subtopics === 0 &&
      m.exercises === 0
  );

  const chartData = processedActivity.map((month) => ({
    month: month.month,
    simulazioni: month.simulations,
    teoria: month.topics + month.subtopics,
    esercizi: month.exercises,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-1">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const commonXAxisProps = {
    dataKey: "month",
    className: "text-xs fill-muted-foreground",
    tick: { fontSize: 12, dy: 5 },
    axisLine: { stroke: "hsl(var(--border))" },
    tickLine: { stroke: "hsl(var(--border))" },
  };

  const commonYAxisProps = {
    className: "text-xs fill-muted-foreground",
    tick: { fontSize: 12, dx: -5 },
    axisLine: { stroke: "hsl(var(--border))" },
    tickLine: { stroke: "hsl(var(--border))" },
    domain: [0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.1), 5)] as [
      number,
      (dataMax: number) => number
    ],
    allowDecimals: false,
  };

  const RechartsBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 0,
          left: 0,
          bottom: 5,
        }}
        barGap={4}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-muted/50"
          vertical={false}
        />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f3f3" }} />
        <Bar
          dataKey="simulazioni"
          name="Simulazioni"
          fill={SIMULATIONS_COLOR}
          radius={[4, 4, 0, 0]}
          barSize={24}
        />
        <Bar
          dataKey="teoria"
          name="Teoria"
          fill={THEORY_COLOR}
          radius={[4, 4, 0, 0]}
          barSize={24}
        />
        <Bar
          dataKey="esercizi"
          name="Esercizi"
          fill={EXERCISES_COLOR}
          radius={[4, 4, 0, 0]}
          barSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const RechartsLineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 0,
          left: 0,
          bottom: 5,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-muted/50"
          vertical={false}
        />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="simulazioni"
          name="Simulazioni"
          stroke={SIMULATIONS_COLOR}
          strokeWidth={2.5}
          dot={{
            fill: SIMULATIONS_COLOR,
            strokeWidth: 0,
            r: 3,
          }}
          activeDot={{
            r: 6,
            stroke: SIMULATIONS_COLOR,
            strokeWidth: 2,
            fill: SIMULATIONS_COLOR,
          }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="teoria"
          name="Teoria"
          stroke={THEORY_COLOR}
          strokeWidth={2.5}
          dot={{
            fill: THEORY_COLOR,
            strokeWidth: 0,
            r: 3,
          }}
          activeDot={{
            r: 6,
            stroke: THEORY_COLOR,
            strokeWidth: 2,
            fill: THEORY_COLOR,
          }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="esercizi"
          name="Esercizi"
          stroke={EXERCISES_COLOR}
          strokeWidth={2.5}
          dot={{
            fill: EXERCISES_COLOR,
            strokeWidth: 0,
            r: 3,
          }}
          activeDot={{
            r: 6,
            stroke: EXERCISES_COLOR,
            strokeWidth: 2,
            fill: EXERCISES_COLOR,
          }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex md:flex-row flex-col items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Clock
                className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0"
                style={{ color: subjectColor }}
              />
              <span className="truncate">Statistiche mensili</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Riepilogo delle attività negli ultimi {isMobile ? "3" : "6"} mesi
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant={chartType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("bar")}
              className={`text-xs w-full md:w-auto ${
                chartType === "bar" ? "text-white" : "text-foreground"
              }`}
              style={
                chartType === "bar" ? { backgroundColor: subjectColor } : {}
              }
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Barre
            </Button>
            <Button
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("line")}
              className={`text-xs w-full md:w-auto ${
                chartType === "line" ? "text-white" : "text-foreground"
              }`}
              style={
                chartType === "line" ? { backgroundColor: subjectColor } : {}
              }
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Linea
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        {isEmpty ? (
          <div className="text-center text-muted-foreground my-12 h-[300px] flex items-center justify-center">
            Nessuna attività negli ultimi {isMobile ? "3" : "6"} mesi
          </div>
        ) : (
          <div className="mt-4 container ">
            {chartType === "bar" ? <RechartsBarChart /> : <RechartsLineChart />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
