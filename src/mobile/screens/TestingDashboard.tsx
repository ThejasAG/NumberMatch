import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell.tsx";
import { BotRunner, ProgressState } from "../../testing/botRunner.ts";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export function TestingDashboard() {
  const [botType, setBotType] = useState<"Greedy" | "Smart" | "Human-like" | "Compare" | "Stress">("Smart");
  const [simCount, setSimCount] = useState<number>(100);
  const [levelMode, setLevelMode] = useState<"Single" | "Range" | "All">("All");
  const [singleLevel, setSingleLevel] = useState<number>(1);
  const [levelRangeStart, setLevelRangeStart] = useState<number>(1);
  const [levelRangeEnd, setLevelRangeEnd] = useState<number>(10);
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  
  // Dashboard Results State
  const [runner, setRunner] = useState<BotRunner | null>(null);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const getTargetLevels = () => {
    if (levelMode === "Single") return [singleLevel];
    if (levelMode === "All") return Array.from({length: 11}, (_, i) => i + 1);
    
    const arr = [];
    for (let i = levelRangeStart; i <= levelRangeEnd; i++) arr.push(i);
    return arr;
  };

  const handleRun = async () => {
    setIsRunning(true);
    setProgress(null);
    setRunner(null);
    
    const newRunner = new BotRunner();
    const levels = getTargetLevels();
    
    if (botType === "Compare") {
      await newRunner.runComparative(simCount, levels, setProgress);
    } else if (botType === "Stress") {
      // 10000 limit warning: stress mode runs a large preset
      await newRunner.runBatch("Smart", simCount, levels, setProgress);
    } else {
      await newRunner.runBatch(botType, simCount, levels, setProgress);
    }
    
    setRunner(newRunner);
    setIsRunning(false);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("bot-report.pdf");
  };

  const exportJSON = () => {
    if (!runner) return;
    const data = runner.getReportGenerator().generateJSON();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bot-report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!runner) return;
    const data = runner.getReportGenerator().generateCSV();
    const blob = new Blob([data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bot-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderDashboard = () => {
    if (!runner) return null;
    
    const analytics = runner.getAnalytics();
    const global = analytics.getGlobalAnalytics();
    const sawtooth = analytics.validateSawtoothDifficulty();
    const history = runner.getDatabase().getAllResults();
    
    const recentHistory = [...history].reverse().slice(0, 100);

    // Chart Data Preparation
    const levels = Array.from(new Set(history.map(r => r.level))).sort((a,b) => a - b);
    const chartData = levels.map(l => {
      const stats = analytics.getLevelAnalytics(l);
      return {
        level: `L${l}`,
        completionRate: Math.round(stats.completionRate * 100),
        avgTime: Math.round(stats.averageCompletionTime),
        avgAddRows: parseFloat(stats.averageAddRows.toFixed(2)),
        avgScore: Math.round(stats.averageScore)
      };
    });

    const valL1 = analytics.getLevelAnalytics(1);
    const valL3 = analytics.getLevelAnalytics(3);
    const valL5 = analytics.getLevelAnalytics(5);
    const valL10 = analytics.getLevelAnalytics(10);

    return (
      <div className="dashboard-results" ref={reportRef} style={{ padding: "1rem", backgroundColor: "#fff", color: "#000" }}>
        <h2>Simulation Results</h2>
        
        <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          <div className="metric-card">
            <h4>Global Metrics</h4>
            <p>Total Simulations: {global.totalSimulations}</p>
            <p>Overall Win Rate: {(global.overallCompletionRate * 100).toFixed(2)}%</p>
            <p>Avg Completion Time: {global.overallAverageCompletionTime.toFixed(1)}s</p>
            <p>Avg Add Rows: {global.overallAverageAddRows.toFixed(2)}</p>
            <p>Avg Score: {global.overallAverageScore.toFixed(0)}</p>
            <div className="card metrics-card global-metrics">
              <h3>Global Analytics</h3>
              <div className="metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">Total Sims</span>
                  <span className="metric-value">{global.totalSimulations}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Avg Diversity</span>
                  <span className="metric-value">{global.overallAverageDiversityScore.toFixed(1)}%</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Avg Pair Diversity</span>
                  <span className="metric-value">{global.overallAveragePairDiversityScore.toFixed(1)}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Most Common Digits</span>
                  <span className="metric-value">{global.overallMostCommonGeneratedNumbers.join(', ')}</span>
                </div>
              </div>
            </div>
            <h4>Sawtooth Validation</h4>
            <p>Result: <strong style={{ color: sawtooth.passed ? "green" : "red" }}>{sawtooth.passed ? "PASS" : "FAIL"}</strong></p>
            <p style={{ fontSize: "0.85em" }}>{sawtooth.message}</p>
          </div>
        </div>

        <h3>Level Validation (Target Requirements)</h3>
        <table style={{ width: "100%", textAlign: "left", marginBottom: "2rem", borderCollapse: "collapse", fontSize: "0.95em" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ccc" }}>
              <th>Level</th>
              <th>Avg Add Rows</th>
              <th>Target Add Rows</th>
              <th>Avg Reachable</th>
              <th>Projected Win</th>
              <th>Critical Stuck</th>
              <th>Target Stuck</th>
              <th>Avg Diversity</th>
              <th>Target Diversity</th>
              <th>Pair Diversity</th>
              <th>Success Rate</th>
              <th>Avg Time</th>
              <th>Target Time</th>
              <th>Win Rate</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>{valL1.averageAddRows.toFixed(2)}</td>
              <td>≈ 1</td>
              <td>{valL1.averageReachableMatchScore?.toFixed(1)}</td>
              <td>{valL1.averageProjectedWinScore?.toFixed(1)}%</td>
              <td>{(valL1.criticalStuckRate * 100).toFixed(1)}%</td>
              <td>&lt; 1%</td>
              <td>{valL1.averageDiversityScore?.toFixed(1)}%</td>
              <td>60-70%</td>
              <td>{valL1.averagePairDiversityScore?.toFixed(1)}</td>
              <td>{(valL1.averageAddRowSuccessRate * 100).toFixed(1)}%</td>
              <td>{valL1.averageCompletionTime.toFixed(1)}s</td>
              <td>45s</td>
              <td>{(valL1.completionRate * 100).toFixed(1)}%</td>
              <td style={{ color: valL1.completionRate >= 0.90 && valL1.averageAddRows < 2 && (valL1.averageReachableMatchScore || 0) >= 4 && valL1.criticalStuckRate < 0.01 ? "green" : "red" }}>
                {valL1.completionRate >= 0.90 && valL1.averageAddRows < 2 && (valL1.averageReachableMatchScore || 0) >= 4 && valL1.criticalStuckRate < 0.01 ? "PASS" : "FAIL"}
              </td>
            </tr>
            <tr>
              <td>3</td>
              <td>{valL3.averageAddRows.toFixed(2)}</td>
              <td>2-3</td>
              <td>{valL3.averageReachableMatchScore?.toFixed(1)}</td>
              <td>{valL3.averageProjectedWinScore?.toFixed(1)}%</td>
              <td>{(valL3.criticalStuckRate * 100).toFixed(1)}%</td>
              <td>&lt; 2%</td>
              <td>{valL3.averageDiversityScore?.toFixed(1)}%</td>
              <td>55-65%</td>
              <td>{valL3.averagePairDiversityScore?.toFixed(1)}</td>
              <td>{(valL3.averageAddRowSuccessRate * 100).toFixed(1)}%</td>
              <td>{valL3.averageCompletionTime.toFixed(1)}s</td>
              <td>90s</td>
              <td>{(valL3.completionRate * 100).toFixed(1)}%</td>
              <td style={{ color: valL3.averageReachableMatchScore >= 3 && valL3.criticalStuckRate < 0.02 ? "green" : "red" }}>
                {valL3.averageReachableMatchScore >= 3 && valL3.criticalStuckRate < 0.02 ? "PASS" : "FAIL"}
              </td>
            </tr>
            <tr>
              <td>5</td>
              <td>{valL5.averageAddRows.toFixed(2)}</td>
              <td>2-3</td>
              <td>{valL5.averageReachableMatchScore?.toFixed(1)}</td>
              <td>{valL5.averageProjectedWinScore?.toFixed(1)}%</td>
              <td>{(valL5.criticalStuckRate * 100).toFixed(1)}%</td>
              <td>&lt; 5%</td>
              <td>{valL5.averageDiversityScore?.toFixed(1)}%</td>
              <td>45-60%</td>
              <td>{valL5.averagePairDiversityScore?.toFixed(1)}</td>
              <td>{(valL5.averageAddRowSuccessRate * 100).toFixed(1)}%</td>
              <td>{valL5.averageCompletionTime.toFixed(1)}s</td>
              <td>150s</td>
              <td>{(valL5.completionRate * 100).toFixed(1)}%</td>
              <td style={{ color: valL5.averageReachableMatchScore >= 2 && valL5.criticalStuckRate < 0.05 ? "green" : "red" }}>
                {valL5.averageReachableMatchScore >= 2 && valL5.criticalStuckRate < 0.05 ? "PASS" : "FAIL"}
              </td>
            </tr>
            <tr>
              <td>10</td>
              <td>{valL10.averageAddRows.toFixed(2)}</td>
              <td>4-6</td>
              <td>{valL10.averageReachableMatchScore?.toFixed(1)}</td>
              <td>{valL10.averageProjectedWinScore?.toFixed(1)}%</td>
              <td>{(valL10.criticalStuckRate * 100).toFixed(1)}%</td>
              <td>&lt; 15%</td>
              <td>{valL10.averageDiversityScore?.toFixed(1)}%</td>
              <td>30-50%</td>
              <td>{valL10.averagePairDiversityScore?.toFixed(1)}</td>
              <td>{(valL10.averageAddRowSuccessRate * 100).toFixed(1)}%</td>
              <td>{valL10.averageCompletionTime.toFixed(1)}s</td>
              <td>-</td>
              <td>{(valL10.completionRate * 100).toFixed(1)}%</td>
              <td style={{ color: valL10.averageReachableMatchScore >= 1 && valL10.criticalStuckRate < 0.15 ? "green" : "red" }}>
                {valL10.averageReachableMatchScore >= 1 && valL10.criticalStuckRate < 0.15 ? "PASS" : "FAIL"}
              </td>
            </tr>
          </tbody>
        </table>

        <h3>Charts</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
          <div style={{ height: 300 }}>
            <h4 style={{ textAlign: "center" }}>Completion Rate (%)</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis domain={[0, 100]} />
                <RechartsTooltip />
                <Bar dataKey="completionRate" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 300 }}>
            <h4 style={{ textAlign: "center" }}>Avg Completion Time (s)</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="avgTime" stroke="#2196f3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 300 }}>
            <h4 style={{ textAlign: "center" }}>Avg Add Rows Used</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="avgAddRows" fill="#ff9800" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 300 }}>
            <h4 style={{ textAlign: "center" }}>Avg Score</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="avgScore" stroke="#9c27b0" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <h3>Simulation History (Latest 100)</h3>
        <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, backgroundColor: "#f9f9f9" }}>
              <tr>
                <th>Run ID</th>
                <th>Level</th>
                <th>Bot</th>
                <th>Time (s)</th>
                <th>Add Rows</th>
                <th>Score</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.map(r => (
                <tr key={r.simulationId} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{r.simulationId}</td>
                  <td>{r.level}</td>
                  <td>{r.botType}</td>
                  <td>{r.completionTimeSeconds}</td>
                  <td>{r.addRowsUsed}</td>
                  <td>{r.score}</td>
                  <td style={{ color: r.completed ? "green" : "red" }}>{r.completed ? "PASS" : "FAIL"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <AppShell title="Testing Dashboard">
      <div className="settings-panel" style={{ overflowY: "auto", padding: "1rem", backgroundColor: "#1e1e1e", color: "white" }}>
        <Link to="/" style={{ color: "#4caf50", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}>&larr; Back to Home</Link>
        
        <h2>Bot Framework Configuration</h2>
        
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label>Bot Type</label>
            <select value={botType} onChange={e => setBotType(e.target.value as any)} disabled={isRunning} style={{ display: "block", marginTop: "0.5rem", padding: "0.5rem" }}>
              <option value="Greedy">Greedy Bot</option>
              <option value="Smart">Smart Bot</option>
              <option value="Human-like">Human-like Bot</option>
              <option value="Compare">Comparative Mode</option>
              <option value="Stress">Stress Test</option>
            </select>
          </div>
          <div>
            <label>Simulations / Level</label>
            <select value={simCount} onChange={e => setSimCount(parseInt(e.target.value))} disabled={isRunning} style={{ display: "block", marginTop: "0.5rem", padding: "0.5rem" }}>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={5000}>5000</option>
              <option value={10000}>10000</option>
            </select>
          </div>
          <div>
            <label>Level Mode</label>
            <select value={levelMode} onChange={e => setLevelMode(e.target.value as any)} disabled={isRunning} style={{ display: "block", marginTop: "0.5rem", padding: "0.5rem" }}>
              <option value="Single">Single Level</option>
              <option value="Range">Level Range</option>
              <option value="All">All Levels</option>
            </select>
          </div>
        </div>

        {levelMode === "Single" && (
          <div style={{ marginBottom: "1rem" }}>
            <label>Target Level:</label>
            <input type="number" min={1} max={11} value={singleLevel} onChange={e => setSingleLevel(parseInt(e.target.value))} disabled={isRunning} style={{ marginLeft: "0.5rem", width: "60px" }} />
          </div>
        )}

        {levelMode === "Range" && (
          <div style={{ marginBottom: "1rem" }}>
            <label>Start Level:</label>
            <input type="number" min={1} max={11} value={levelRangeStart} onChange={e => setLevelRangeStart(parseInt(e.target.value))} disabled={isRunning} style={{ marginLeft: "0.5rem", marginRight: "1rem", width: "60px" }} />
            <label>End Level:</label>
            <input type="number" min={1} max={11} value={levelRangeEnd} onChange={e => setLevelRangeEnd(parseInt(e.target.value))} disabled={isRunning} style={{ marginLeft: "0.5rem", width: "60px" }} />
          </div>
        )}

        <button 
          onClick={handleRun} 
          disabled={isRunning}
          style={{ padding: "0.75rem 2rem", fontSize: "1.1em", backgroundColor: isRunning ? "#555" : "#4caf50", color: "white", border: "none", borderRadius: "4px", cursor: isRunning ? "not-allowed" : "pointer" }}
        >
          {isRunning ? "Running..." : "Run Test Suite"}
        </button>

        {isRunning && progress && (
          <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#333", borderRadius: "8px" }}>
            <h3>Live Progress</h3>
            <div style={{ width: "100%", backgroundColor: "#555", height: "20px", borderRadius: "10px", overflow: "hidden", marginBottom: "1rem" }}>
              <div style={{ width: `${(progress.current / progress.total) * 100}%`, backgroundColor: "#4caf50", height: "100%", transition: "width 0.1s" }} />
            </div>
            <p>Simulation {progress.current} of {progress.total} ({(progress.current / progress.total * 100).toFixed(1)}%)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", fontSize: "0.9em", color: "#aaa" }}>
              <div>Avg Win Rate: {(progress.completionRate * 100).toFixed(1)}%</div>
              <div>Avg Time: {progress.avgTime.toFixed(1)}s</div>
              <div>Avg Add Rows: {progress.avgAddRows.toFixed(2)}</div>
              <div>Avg Score: {progress.avgScore.toFixed(0)}</div>
            </div>
          </div>
        )}

        {!isRunning && runner && (
          <div style={{ marginTop: "2rem" }}>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <button onClick={exportPDF} style={{ padding: "0.5rem 1rem", backgroundColor: "#e91e63", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Export PDF</button>
              <button onClick={exportJSON} style={{ padding: "0.5rem 1rem", backgroundColor: "#2196f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Export JSON</button>
              <button onClick={exportCSV} style={{ padding: "0.5rem 1rem", backgroundColor: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Export CSV</button>
            </div>
            
            {renderDashboard()}
          </div>
        )}
      </div>
    </AppShell>
  );
}
