import { useDebugStore } from "../../debug/debugStore.ts";
import { explainMatch } from "../../debug/matchInspector.ts";

export function DebugPanel() {
  const { debugMode, history, showAllValidMoves, toggleShowAllValidMoves, clearHistory } = useDebugStore();

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
