import React, { useState } from 'react';
import { Play, RotateCcw, BarChart3, Activity, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { PredictionResult, SimulationSummary } from '../types';
import { callNIM } from '../services/geminiService';

interface MonteCarloSimProps {
  predictionResult: PredictionResult;
}

export const MonteCarloSim: React.FC<MonteCarloSimProps> = ({ predictionResult }) => {
  const [simCount, setSimCount] = useState<number>(5000);
  const [simulation, setSimulation] = useState<SimulationSummary | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // NIM AI State
  const [nimModel, setNimModel] = useState<string>('minimaxai/minimax-m3');
  const [nimData, setNimData] = useState<any | null>(null);
  const [isNimLoading, setIsNimLoading] = useState<boolean>(false);

  const handleRunNIM = async () => {
    setIsNimLoading(true);
    try {
      const matchData = {
        homeTeam: predictionResult.homeTeamName,
        awayTeam: predictionResult.awayTeamName,
        homeExpectedGoals: predictionResult.homeExpectedGoals,
        awayExpectedGoals: predictionResult.awayExpectedGoals,
        over25Prob: predictionResult.over25Prob,
        bttsProb: predictionResult.bttsProb,
      };

      const ruleProb = {
        homeWinProb: predictionResult.homeWinProb,
        drawProb: predictionResult.drawProb,
        awayWinProb: predictionResult.awayWinProb,
      };

      const result = await callNIM(matchData, ruleProb, nimModel);
      if (result) {
        setNimData(result);
      }
    } catch (err) {
      console.error('NIM call error:', err);
    } finally {
      setIsNimLoading(false);
    }
  };

  const runSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      let homeWins = 0;
      let draws = 0;
      let awayWins = 0;
      let totalHomeGoals = 0;
      let totalAwayGoals = 0;

      const scoreCounts: Record<string, number> = {};
      const goalFreq: Record<number, number> = {};

      const lambda = predictionResult.homeExpectedGoals;
      const mu = predictionResult.awayExpectedGoals;

      // Sample Poisson variable
      const samplePoisson = (mean: number) => {
        let L = Math.exp(-mean);
        let k = 0;
        let p = 1;
        do {
          k++;
          p *= Math.random();
        } while (p > L);
        return k - 1;
      };

      for (let i = 0; i < simCount; i++) {
        const hG = samplePoisson(lambda);
        const aG = samplePoisson(mu);

        totalHomeGoals += hG;
        totalAwayGoals += aG;

        if (hG > aG) homeWins++;
        else if (hG === aG) draws++;
        else awayWins++;

        const scoreKey = `${hG}-${aG}`;
        scoreCounts[scoreKey] = (scoreCounts[scoreKey] || 0) + 1;

        const totalGoals = hG + aG;
        goalFreq[totalGoals] = (goalFreq[totalGoals] || 0) + 1;
      }

      let topScore = '1-1';
      let maxScoreCount = 0;
      Object.entries(scoreCounts).forEach(([sc, count]) => {
        if (count > maxScoreCount) {
          maxScoreCount = count;
          topScore = sc;
        }
      });

      const goalDistribution = [0, 1, 2, 3, 4, 5, 6].map((g) => ({
        goals: g,
        count: goalFreq[g] || 0,
      }));

      setSimulation({
        simulationsRun: simCount,
        homeWins,
        draws,
        awayWins,
        homeWinPercent: (homeWins / simCount) * 100,
        drawPercent: (draws / simCount) * 100,
        awayWinPercent: (awayWins / simCount) * 100,
        avgHomeGoals: totalHomeGoals / simCount,
        avgAwayGoals: totalAwayGoals / simCount,
        mostFrequentScore: topScore,
        goalDistribution,
      });

      setIsRunning(false);
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
            Monte Carlo Match Simulator
          </h3>
          <p className="text-xs text-slate-400">
            Simulate thousands of match iterations using Poisson xG lambda parameters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 font-bold">NIM Model:</span>
            <select
              id="select-nim-model"
              value={nimModel}
              onChange={(e) => setNimModel(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded text-xs font-mono font-bold text-violet-300 px-2.5 py-1.5 focus:outline-none focus:border-violet-500"
            >
              <option value="minimaxai/minimax-m3">minimaxai/minimax-m3</option>
              <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 font-bold">Simulations:</span>
            <select
              id="select-sim-count"
              value={simCount}
              onChange={(e) => setSimCount(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded text-xs font-mono font-bold text-slate-200 px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value={1000}>1,000 runs</option>
              <option value={5000}>5,000 runs</option>
              <option value={10000}>10,000 runs</option>
              <option value={25000}>25,000 runs</option>
            </select>
          </div>

          <button
            id="btn-run-nim-adjust"
            onClick={handleRunNIM}
            disabled={isNimLoading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isNimLoading ? 'animate-spin' : ''}`} />
            <span>{isNimLoading ? 'RUNNING NIM AI...' : 'AI PROBABILITY ADJUSTMENT'}</span>
          </button>

          <button
            id="btn-run-simulation"
            onClick={runSimulation}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Simulating...' : 'RUN SIMULATION'}</span>
          </button>
        </div>
      </div>

      {/* NVIDIA NIM / AI Probability Adjustment Panel */}
      {nimData && (
        <div className="bg-slate-900 border border-violet-500/30 rounded-xl p-5 shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">
                NVIDIA NIM / AI Probability Adjustment Output
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {nimData.ai_engine && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-900/40 text-violet-300 border border-violet-500/30">
                  {nimData.ai_engine}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-700">
                CONFIDENCE: {nimData.confidence || 'HIGH'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-500 block mb-1">AI PROJECTION</span>
              <span className="text-sm font-bold text-emerald-400 block">{nimData.prediction}</span>
              <span className="text-[11px] text-slate-400">Score: {nimData.score}</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-500 block mb-1">ADJUSTED 1X2 PROBS</span>
              <div className="flex justify-between font-bold">
                <span className="text-emerald-400">H: {((nimData.homeWinProb || 0) * 100).toFixed(0)}%</span>
                <span className="text-amber-400">D: {((nimData.drawProb || 0) * 100).toFixed(0)}%</span>
                <span className="text-cyan-400">A: {((nimData.awayWinProb || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-500 block mb-1">GOAL MARKETS</span>
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">O2.5: {((nimData.over25 || 0) * 100).toFixed(0)}%</span>
                <span className="text-slate-300">BTTS: {((nimData.btts || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-500 block mb-1">BASELINE VS AI SHIFT</span>
              <span className="text-slate-300 block">
                Home Shift: {(((nimData.homeWinProb || 0) - predictionResult.homeWinProb) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {nimData.key_factors && nimData.key_factors.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 font-bold block mb-2">Key AI Identified Match Factors:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {nimData.key_factors.map((factor: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {simulation ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Simulation Outcome Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Simulated 1X2 Convergence ({simulation.simulationsRun.toLocaleString()} Runs)
            </h4>

            <div className="space-y-4 font-mono">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-bold">
                    {predictionResult.homeTeamName} Wins ({simulation.homeWins})
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {simulation.homeWinPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${simulation.homeWinPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  Analytical Dixon-Coles model: {(predictionResult.homeWinProb * 100).toFixed(1)}%
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-bold">Draws ({simulation.draws})</span>
                  <span className="text-amber-400 font-bold">
                    {simulation.drawPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${simulation.drawPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  Analytical Dixon-Coles model: {(predictionResult.drawProb * 100).toFixed(1)}%
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-cyan-400 font-bold">
                    {predictionResult.awayTeamName} Wins ({simulation.awayWins})
                  </span>
                  <span className="text-cyan-400 font-bold">
                    {simulation.awayWinPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded overflow-hidden">
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${simulation.awayWinPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  Analytical Dixon-Coles model: {(predictionResult.awayWinProb * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Average Metrics & Goal Frequency */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Simulated Goal Outputs
            </h4>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Avg Home Goals</span>
                <span className="text-base font-bold text-emerald-400">
                  {simulation.avgHomeGoals.toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Avg Away Goals</span>
                <span className="text-base font-bold text-cyan-400">
                  {simulation.avgAwayGoals.toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Top Score</span>
                <span className="text-base font-bold text-violet-400">
                  {simulation.mostFrequentScore}
                </span>
              </div>
            </div>

            {/* Histogram of Total Goals */}
            <div className="mt-4">
              <span className="text-[11px] font-mono text-slate-400 block mb-2">
                Total Goals Distribution (Frequency Histogram)
              </span>
              <div className="flex items-end gap-1.5 h-28 pt-2 border-b border-slate-800 font-mono text-[10px]">
                {simulation.goalDistribution.map((g) => {
                  const maxCount = Math.max(...simulation.goalDistribution.map((gd) => gd.count));
                  const pct = maxCount > 0 ? (g.count / maxCount) * 100 : 0;
                  return (
                    <div key={g.goals} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-slate-400 text-[9px]">
                        {((g.count / simulation.simulationsRun) * 100).toFixed(0)}%
                      </span>
                      <div
                        className="w-full bg-cyan-500/80 rounded-t transition-all"
                        style={{ height: `${pct}%` }}
                      />
                      <span className="text-slate-500 font-bold">{g.goals}G</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-mono text-slate-300 font-bold">
            Click 'RUN SIMULATION' to trigger Monte Carlo match modeling.
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Simulates stochastic goal events for both teams and tracks convergence against Dixon-Coles mathematical expectations.
          </p>
        </div>
      )}
    </div>
  );
};
