// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { useNavigate } from "react-router-dom";
import api from "../api";
import classicsUrl from "../assets/classics.svg";
import upRightArrowUrl from "../assets/up-right-arrow.svg";
import targetUrl from "../assets/target.svg";
import branchUrl from "../assets/branch.svg";
import { KnightSchoolIcon } from "../components/KnightSchoolIcon";

type Opening = { name: string; eco: string };

export const Dashboard = () => {
  const navigate = useNavigate();

  const [openings, setOpenings] = useState<Opening[]>([]);
  const [selectedOpeningName, setSelectedOpeningName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    api
      .get("/openings")
      .then((res) => {
        setOpenings(res.data);
        setSelectedOpeningName(res.data?.[0]?.name ?? null);
      })
      .catch((e) => {
        console.error("Error loading openings:", e);
      });
  }, []);

  const startSession = async (openingName: string | null) => {
    try {
      const response = await api.post("/training-sessions", {
        openingName,
      });
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session. Check your connection or token.");
    }
  };

  function getTimeGreeting(name?: string | null) {
    const hour = new Date().getHours();

    const base =
      hour < 12
        ? "Good morning ☀️"
        : hour < 18
          ? "Good afternoon 🌤️"
          : "Good evening 🌙";

    const who = name ? `, ${name}` : "";

    return `${base}${who}`;
  }

  const username = localStorage.getItem("username");
  const greeting = getTimeGreeting(username);

  const iconWidth = "64px";
  const iconHeight = "64px";

  return (
    <main className="page">
      <div className="card">
        <h1 className="title">{greeting}</h1>
        <p className="subtitle">Ready to practice your lines?</p>

        {/* Grid layout inside the card */}
        <div className="dashboard-layout">
          {/* Left row 1: one unit (Start Training) */}
          <div className="dashboard-tile tile-start">
            <div className="tile-start-text">
              <div><KnightSchoolIcon width={"150px"} height={"150px"} /></div>
              <div className="tile-title">Training</div>
              <div className="tile-subtitle">Every day a little better.</div>
            </div>
            <div className="select-wrap">
              <select
                value={selectedOpeningName ?? ""}
                onChange={(e) => setSelectedOpeningName(e.target.value || null)}
              >
                {openings.map((o) => (
                  <option key={`${o.eco}-${o.name}`} value={o.name}>
                    {o.eco} — {o.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              className="tile-action"
              onClick={() => startSession(selectedOpeningName)}
              type="button"
            >
              Start
            </Button>
          </div>

          {/* Left row 2: 3 columns */}
          <div className="dashboard-tile tile-1">
            <div className="tile-header-row">
              <div className="tile-icon-inline" aria-hidden="true">
                <img
                  src={targetUrl}
                  alt="Target with arrow"
                  width={iconWidth}
                  height={iconHeight}
                />
              </div>
              <div>
                <div className="tile-title">Daily Drill</div>
                <div className="tile-subtitle">
                  A focused tactical challenge just for today.
                </div>
              </div>
            </div>

            <Button className="tile-action" onClick={() => {}} type="button">
              Start
            </Button>
          </div>
          <div className="dashboard-tile tile-2">
            <div className="tile-header-row">
              <div className="tile-icon-inline" aria-hidden="true">
                <img
                  src={branchUrl}
                  alt="Recommended line"
                  width={iconWidth}
                  height={iconHeight}
                />
              </div>
              <div>
                <div className="tile-title">Recommended Line</div>
                <div className="tile-subtitle">Study prompt picked for you</div>
              </div>
            </div>

            <Button className="tile-action" onClick={() => {}} type="button">
              Start
            </Button>
          </div>

          <div className="dashboard-tile tile-3">
            <div className="tile-header-row">
              <div className="tile-icon-inline" aria-hidden="true">
                <img
                  src={classicsUrl}
                  alt="Recommended line"
                  width={iconWidth}
                  height={iconHeight}
                />
              </div>
              <div>
                <div className="tile-title">Classics Practice</div>
                <div className="tile-subtitle">Re-learn the classics</div>
              </div>
            </div>

            <Button className="tile-action" onClick={() => {}} type="button">
              Start
            </Button>
          </div>

          {/* Right: tall 2-row card */}
          <div className="dashboard-tile dashboard-tile--tall tile-right">
            <div className="tile-header">
              <div className="tile-icon tile-icon--right">
                <img
                  src={upRightArrowUrl}
                  alt="Recommended line"
                  width={28}
                  height={28}
                />
              </div>

              <div>
                <div className="tile-title tile-title--compact">Progress</div>
                <div className="tile-subtitle">Keep sharpening your skills</div>
              </div>
            </div>

            <div className="progress-row">
              <div className="progress-metric">
                <div className="progress-value">82%</div>
                <div className="progress-label">Accuracy</div>
              </div>

              <div className="progress-metric">
                <div className="progress-value">82%</div>
                <div className="progress-label">WPM</div>
              </div>
            </div>

            <div className="progress-hint">Keep going! Almost there today.</div>

            <div className="tile-spacer" />

            <button className="tile-action tile-action--ghost" type="button">
              View All Reviews →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
