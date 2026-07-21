import type { VoicingSearchState } from '../hooks/useVoicings';

interface SolverStatusProps {
  state: VoicingSearchState;
}

export function SolverStatus({ state }: SolverStatusProps) {
  if (state.status === 'success' && !state.diagnostics?.truncated) return null;

  const content = state.status === 'idle'
    ? ['Preparing solver', 'The constraint engine is starting.']
    : state.status === 'running'
      ? ['Recalculating constellation', 'The previous result remains visible until this search finishes.']
      : state.status === 'empty'
        ? ['No exact voicing passed', 'Adjust hand constraints, register, or minimum clarity and try again.']
        : state.status === 'error'
          ? ['Solver error', state.error ?? 'The constraint engine could not complete this search.']
          : [
            'Best among evaluated candidates',
            `${state.diagnostics?.evaluatedLeaves ?? 0} leaves were evaluated with bounded DFS; ${state.diagnostics?.candidateCount ?? 0} valid candidates entered the partial ranking.`
          ];

  return (
    <aside className={`solver-status solver-status--${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>
      <strong>{content[0]}</strong>
      <span>{content[1]}</span>
    </aside>
  );
}
