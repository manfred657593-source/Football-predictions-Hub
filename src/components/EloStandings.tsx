import React, { useState } from 'react';
import { Sliders, Shield, TrendingUp, Award, Plus, Edit2, Check } from 'lucide-react';
import { Team } from '../types';
import { EloTrendIndicator } from './EloTrendIndicator';
import { StreakBadge } from './StreakBadge';

interface EloStandingsProps {
  teams: Team[];
  homeAdvantage: number;
  setHomeAdvantage: (val: number) => void;
  rho: number;
  setRho: (val: number) => void;
  formWeight: number;
  setFormWeight: (val: number) => void;
  onUpdateTeam?: (team: Team) => void;
  onAddTeam?: (team: Team) => void;
}

export const EloStandings: React.FC<EloStandingsProps> = ({
  teams,
  homeAdvantage,
  setHomeAdvantage,
  rho,
  setRho,
  formWeight,
  setFormWeight,
  onUpdateTeam,
  onAddTeam,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editElo, setEditElo] = useState<number>(1800);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newLeague, setNewLeague] = useState('Premier League');
  const [newElo, setNewElo] = useState(1750);
  const [newHomeAtk, setNewHomeAtk] = useState(1.4);
  const [newHomeDef, setNewHomeDef] = useState(1.0);
  const [newAwayAtk, setNewAwayAtk] = useState(1.2);
  const [newAwayDef, setNewAwayDef] = useState(1.1);

  const sortedTeams = [...teams].sort((a, b) => b.elo - a.elo);

  const handleSaveElo = (team: Team) => {
    if (onUpdateTeam) {
      onUpdateTeam({ ...team, elo: editElo });
    }
    setEditingId(null);
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;
    const created: Team = {
      id: `custom_team_${Date.now()}`,
      name: newTeamName,
      league: newLeague,
      elo: newElo,
      attackStrength: Number(((newHomeAtk + newAwayAtk) / 2).toFixed(2)),
      defenseStrength: Number(((newHomeDef + newAwayDef) / 2).toFixed(2)),
      homeAttack: newHomeAtk,
      homeDefense: newHomeDef,
      awayAttack: newAwayAtk,
      awayDefense: newAwayDef,
      recentForm: ['W', 'D', 'W', 'W', 'L'],
      xGPerGame: Number(((newHomeAtk + newAwayAtk) / 2).toFixed(2)),
    };
    if (onAddTeam) {
      onAddTeam(created);
    }
    setNewTeamName('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Parameter Tuning Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
              Dixon-Coles & Elo Hyperparameter Tuning
            </h3>
          </div>

          {onAddTeam && (
            <button
              id="btn-add-new-team"
              onClick={() => setShowAddModal(!showAddModal)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD NEW TEAM</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          {/* Home Advantage Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Home Advantage Factor</span>
              <span className="text-emerald-400 font-bold">{homeAdvantage.toFixed(2)}x</span>
            </div>
            <input
              id="slider-home-advantage"
              type="range"
              min="1.0"
              max="1.5"
              step="0.02"
              value={homeAdvantage}
              onChange={(e) => setHomeAdvantage(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Multiplier applied to home expected goals ($\lambda$)
            </p>
          </div>

          {/* Dixon Coles Rho Correlation Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Dixon-Coles Rho ($\rho$)</span>
              <span className="text-amber-400 font-bold">{rho.toFixed(2)}</span>
            </div>
            <input
              id="slider-rho"
              type="range"
              min="-0.20"
              max="0.05"
              step="0.01"
              value={rho}
              onChange={(e) => setRho(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Low-score dependence adjustment (0-0, 1-0, 0-1, 1-1)
            </p>
          </div>

          {/* Form Weight Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Recent Form Momentum Weight</span>
              <span className="text-cyan-400 font-bold">{(formWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              id="slider-form-weight"
              type="range"
              min="0.0"
              max="0.30"
              step="0.05"
              value={formWeight}
              onChange={(e) => setFormWeight(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Impact of last 5 matches on expected goal outputs
            </p>
          </div>
        </div>
      </div>

      {/* Add Team Modal / Drawer */}
      {showAddModal && (
        <form
          onSubmit={handleAddTeamSubmit}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 font-mono text-xs"
        >
          <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs">
            Add Custom Team to Active Database
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Sporting CP"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">League</label>
              <input
                type="text"
                value={newLeague}
                onChange={(e) => setNewLeague(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Elo Rating</label>
              <input
                type="number"
                value={newElo}
                onChange={(e) => setNewElo(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Home Atk / Def</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={newHomeAtk}
                  onChange={(e) => setNewHomeAtk(Number(e.target.value))}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-200"
                />
                <input
                  type="number"
                  step="0.1"
                  value={newHomeDef}
                  onChange={(e) => setNewHomeDef(Number(e.target.value))}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Away Atk / Def</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={newAwayAtk}
                  onChange={(e) => setNewAwayAtk(Number(e.target.value))}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-200"
                />
                <input
                  type="number"
                  step="0.1"
                  value={newAwayDef}
                  onChange={(e) => setNewAwayDef(Number(e.target.value))}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-200"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded cursor-pointer"
              >
                SAVE TEAM
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Team Elo Ratings & Statistical Parameters Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          League Team Parameters & Elo Ratings
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950 text-left">
                <th className="p-3">Rank & Team</th>
                <th className="p-3 text-center">League</th>
                <th className="p-3 text-center">Elo Rating</th>
                <th className="p-3 text-center">Home Atk / Def</th>
                <th className="p-3 text-center">Away Atk / Def</th>
                <th className="p-3 text-center">xG / Game</th>
                <th className="p-3 text-center">Form</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, idx) => (
                <tr
                  key={team.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3 font-bold text-slate-200 flex items-center gap-2">
                    <span className="text-slate-500 text-[11px] w-4">{idx + 1}.</span>
                    <span>{team.name}</span>
                  </td>
                  <td className="p-3 text-center text-slate-400 text-[11px]">
                    {team.league}
                  </td>
                  <td className="p-3 text-center font-bold text-emerald-400">
                    {editingId === team.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={editElo}
                          onChange={(e) => setEditElo(Number(e.target.value))}
                          className="bg-slate-950 border border-slate-700 text-emerald-400 font-bold rounded px-1.5 py-0.5 w-16 text-center"
                        />
                        <button
                          onClick={() => handleSaveElo(team)}
                          className="p-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <EloTrendIndicator team={team} size="sm" />
                        {onUpdateTeam && (
                          <button
                            onClick={() => {
                              setEditingId(team.id);
                              setEditElo(team.elo);
                            }}
                            className="text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
                            title="Edit Elo"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center text-slate-300">
                    {team.homeAttack.toFixed(2)} / {team.homeDefense.toFixed(2)}
                  </td>
                  <td className="p-3 text-center text-slate-300">
                    {team.awayAttack.toFixed(2)} / {team.awayDefense.toFixed(2)}
                  </td>
                  <td className="p-3 text-center font-bold text-cyan-400">
                    {team.xGPerGame.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center justify-center gap-1">
                        {team.recentForm.map((f, i) => (
                          <span
                            key={i}
                            className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                              f === 'W'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : f === 'D'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                      <StreakBadge form={team.recentForm} size="xs" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

