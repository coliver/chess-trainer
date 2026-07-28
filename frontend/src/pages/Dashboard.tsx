import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

import DailyDrillIcon from "../components/DailyDrillIcon";
import BoardPreview from "../components/openings/BoardPreview";
import OpeningCombo from "../components/openings/OpeningCombo";
import DashboardTile from "../components/openings/DashboardTile";

import { Button } from "../components/Button";
import { RandomQuote } from "../components/RandomQuote";
import RecommendedLineIcon from "../components/RecommendedLineIcon";
import ProgressIcon from "../components/ProgressIcon";
import ClassicsIcon from "../components/ClassicsIcon";
import TrainingIcon from "../components/TrainingIcon";

export type Opening = {
  name: string;
  eco: string;
  description?: string;
  uci_moves?: string | null;
  epd?: string | null;
};

export const Dashboard = () => {
  const navigate = useNavigate();

  const [openings, setOpenings] = useState<Opening[]>([]);
  const [selectedOpeningName, setSelectedOpeningName] = useState<string | null>(
    null,
  );
  const [selectedOpeningDescription, setSelectedOpeningDescription] =
    useState("");

  const [query, setQuery] = useState("");
  const [isComboOpen, setIsComboOpen] = useState(false);

  useEffect(() => {
    api
      .get("/openings")
      .then((res) => {
        const list: Opening[] = res.data ?? [];
        setOpenings(list);

        const first = list[0];
        setSelectedOpeningName(first?.name ?? null);
        setSelectedOpeningDescription(first?.description ?? "");

        setQuery(""); // ✅ don’t pre-fill query (prevents filtering to 1 option)
        setIsComboOpen(false); // or true if your test expects it open immediately
      })
      .catch((e) => console.error("Error loading openings:", e));
  }, []);

  const filteredOpenings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return openings;

    return openings.filter((o) => {
      const full = `${o.eco} — ${o.name}`.toLowerCase();
      return (
        full.includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.eco.toLowerCase().includes(q)
      );
    });
  }, [openings, query]);

  const pickOpeningByIndex = (idx: number) => {
    const picked = filteredOpenings[idx];
    if (!picked) return;

    setSelectedOpeningName(picked.name);
    setSelectedOpeningDescription(picked.description ?? "");
    setQuery(`${picked.eco} — ${picked.name}`);
    setIsComboOpen(false);
  };

  const startSession = async (openingName: string | null) => {
    try {
      const response = await api.post("/training-sessions", { openingName });
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session. Check your connection or token.");
    }
  };

  const username = localStorage.getItem("username");
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const base =
      hour < 12
        ? "Good morning ☀️"
        : hour < 18
          ? "Good afternoon 🌤️"
          : "Good evening 🌙";
    const who = username ? `, ${username}` : "";
    return `${base}${who}`;
  }, [username]);

  return (
    <main className="page">
      <div className="card">
        <div className="tile-title" role="heading">
          {greeting}
        </div>
        <div className="tile-subtitle">Ready to practice your lines?</div>

        <div className="dashboard-layout">
          <DashboardTile
            className="tile-start"
            icon={<TrainingIcon />}
            title="Training"
            subtitle={
              <span className="tile-subtitle italics">
                <RandomQuote />
              </span>
            }
            customBody={
              <div>
                <div className="tile-spacer" />
                <OpeningCombo
                  rootLabel="Search openings"
                  query={query}
                  setQuery={setQuery}
                  isOpen={isComboOpen}
                  setIsOpen={setIsComboOpen}
                  options={filteredOpenings}
                  selectedOpeningName={selectedOpeningName}
                  onPick={pickOpeningByIndex}
                />

                {selectedOpeningDescription ? (
                  <p className="opening-description">
                    {selectedOpeningDescription}
                  </p>
                ) : (
                  <p className="opening-description opening-description--empty" />
                )}

                <div className="margin12">
                  <BoardPreview
                    openings={openings}
                    selectedOpeningName={selectedOpeningName}
                  />
                </div>

                <Button
                  className="tile-action"
                  onClick={() => startSession(selectedOpeningName)}
                  type="button"
                >
                  Start {selectedOpeningName}
                </Button>
              </div>
            }
          />

          <DashboardTile
            className="tile-1"
            icon={<DailyDrillIcon />}
            title="Daily Drill"
            subtitle="A focused tactical challenge just for today."
            cta={
              <Button className="tile-action" onClick={() => {}} type="button">
                Start Daily Drill
              </Button>
            }
          />

          <DashboardTile
            className="tile-2"
            icon={<RecommendedLineIcon />}
            title="Recommended Line"
            subtitle="Study prompt picked for you"
            cta={
              <Button className="tile-action" onClick={() => {}} type="button">
                Start Recommended Line
              </Button>
            }
          />

          <DashboardTile
            className="tile-3"
            icon={<ClassicsIcon />}
            title="Classics Practice"
            subtitle="Re-learn the classics"
            cta={
              <Button className="tile-action" onClick={() => {}} type="button">
                Start Classics
              </Button>
            }
          />

          <DashboardTile
            className="dashboard-tile tile-right"
            icon={<ProgressIcon />}
            title="Progress"
            customBody={
              <div>
                <div className="skills-gauge">
                  <div className="progress-value">82%</div>
                  <div className="progress-label">Accuracy</div>
                  <div className="progress-micro">Best so far: last 7 days</div>
                </div>

                <div className="tile-spacer" />

                <div className="streak-row">
                  <div className="streak-value">12 days</div>
                  <div className="streak-label">Current Streak</div>
                  <div className="streak-micro">Best: 23 days</div>
                </div>

                <div className="tile-spacer" />

                <div className="next-review">
                  <div className="next-review-title">Next Review</div>
                  <div className="next-review-item">
                    <span className="next-review-name">
                      Sicilian Defense: Najdorf Variation
                    </span>
                    <span className="next-review-in">in 1 day</span>
                  </div>
                  <div className="tile-spacer" />

                  <button
                    className="tile-action tile-action--ghost"
                    type="button"
                    onClick={() => navigate("/reviews")}
                  >
                    View All Reviews →
                  </button>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </main>
  );
};
