"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, AlertTriangle, TrendingUp, Euro, DollarSign, Bot } from "lucide-react";

interface BudgetBalanceData {
  hasAccess: boolean;
  remainingBudgetEur: number;
  allocatedBudgetEur: number;
  usedBudgetUsd: number;
  usedBudgetEur: number;
  estimatedRemainingTokens: number;
}

export default function AIBudgetCard() {
  const [budgetBalance, setBudgetBalance] = useState<BudgetBalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgetBalance();
    
    // Refresh budget data every 30 seconds
    const interval = setInterval(fetchBudgetBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBudgetBalance = async () => {
    try {
      const response = await fetch("/api/user/ai-budget");
      if (response.ok) {
        const data = await response.json();
        setBudgetBalance(data);
      }
    } catch (error) {
      console.error("Error fetching budget balance:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Budget AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!budgetBalance?.hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Budget AI
          </CardTitle>
          <CardDescription>
            Abbonati per ottenere il tuo budget AI mensile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nessun abbonamento attivo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const remainingPercentage = budgetBalance.allocatedBudgetEur > 0 
    ? (budgetBalance.remainingBudgetEur / budgetBalance.allocatedBudgetEur) * 100 
    : 100;
  const isLowOnBudget = remainingPercentage < 20;
  const isCriticallyLow = remainingPercentage < 5;

  // Format large numbers for display
  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    } else if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toLocaleString();
  };

  const formatBudget = (amount: number, currency: 'EUR' | 'USD' = 'EUR') => {
    const symbol = currency === 'EUR' ? '€' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Calculate estimated conversations remaining
  const avgCostPerConversation = 0.001; // Approximately $0.001 per conversation
  const avgCostPerConversationEur = avgCostPerConversation * 0.94; // Convert to EUR
  const estimatedConversations = Math.floor(budgetBalance.remainingBudgetEur / avgCostPerConversationEur);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Crediti PIT
          </span>
          {isCriticallyLow ? (
            <Badge variant="destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Critico
            </Badge>
          ) : isLowOnBudget ? (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              In esaurimento
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-500 text-green-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              Disponibile
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          I tuoi crediti rimanenti per Pit questo mese
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress 
            value={Math.min(100, remainingPercentage)} 
            className={`h-2 ${
              isCriticallyLow 
                ? '[&>div]:bg-red-500' 
                : isLowOnBudget 
                ? '[&>div]:bg-orange-500' 
                : '[&>div]:bg-primary'
            }`}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}