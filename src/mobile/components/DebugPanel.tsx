import { useDebugStore } from "../../debug/debugStore.ts";
import { explainMatch } from "../../debug/matchInspector.ts";

export function DebugPanel() {
  const { debugMode, history, showAllValidMoves, toggleShowAllValidMoves, clearHistory, lastHint, lastHintCandidatesCount, lastAddRowMetrics } = useDebugStore();

  if (!debugMode) return null;

  const latest = history.length > 0 ? history[0] : null;

  return (
    <section className="debug-panel">
      <div className="debug-header">
        <h3>Match Inspector</h3>
        <label>
          <input 
            type="checkbox" 
            checked={showAllValidMoves} 
            onChange={toggleShowAllValidMoves} 
          />
          Show All Valid Moves
        </label>
      </div>

      {latest ? (
        <div className="debug-latest">
          <h4>Last Inspection</h4>
          <pre>{explainMatch(latest)}</pre>
          
          <details>
            <summary>Evaluation Tree</summary>
            <ul>
              {latest.evaluationTree.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </details>

          <details>
            <summary>Raw Data</summary>
            <pre>{JSON.stringify(latest, null, 2)}</pre>
          </details>
        </div>
      ) : (
        <p>No matches inspected yet. Select two cells.</p>
      )}

      {lastHint && (
        <div className="debug-latest" style={{ marginTop: '12px' }}>
          <h4>Last Hint Generated</h4>
          <p>Candidates: <strong>{lastHintCandidatesCount}</strong></p>
          <p>Score: <strong>{lastHint.score}</strong></p>
          <p>Reason: <strong>{lastHint.reason}</strong></p>
          <p>Pair: ({lastHint.pair.a.row},{lastHint.pair.a.col}) & ({lastHint.pair.b.row},{lastHint.pair.b.col})</p>
        </div>
      )}

      {lastAddRowMetrics && (
        <div className="debug-latest" style={{ marginTop: '12px' }}>
          <h4>Last Add Row Check</h4>
          <p>Valid Pairs: <strong>{lastAddRowMetrics.validPairsCount}</strong></p>
          <p>Remaining Numbers: <strong>{lastAddRowMetrics.remainingNumbers}</strong></p>
          <p>Status: <strong style={{ color: lastAddRowMetrics.blocked ? 'red' : 'green' }}>
            {lastAddRowMetrics.blocked ? 'Blocked' : 'Allowed'}
          </strong></p>
          {lastAddRowMetrics.blocked && (
            <p>Reason: <strong>{lastAddRowMetrics.blockReason}</strong></p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="debug-history">
          <h4>History ({history.length}) <button onClick={clearHistory}>Clear</button></h4>
          <ul>
            {history.map((item, i) => (
              <li key={i} className={item.finalResult ? "success" : "failure"}>
                <strong>{new Date(item.timestamp).toLocaleTimeString()}</strong>: 
                ({item.cellA.row},{item.cellA.col}) & ({item.cellB.row},{item.cellB.col}) - 
                {item.finalResult ? " VALID" : " INVALID"}
                <br/>
                <small>{item.failureReasons.length > 0 ? item.failureReasons.join(", ") : item.successReasons[0]}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
