// \frontend\src\pages\Dashboard.tsx
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
  const [selectedOpeningEco, setSelectedOpeningEco] = useState<string | null>(
    null,
  );
  const [selectedOpeningDescription, setSelectedOpeningDescription] =
    useState("");

  const [selectedEco, setSelectedEco] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [isComboOpen, setIsComboOpen] = useState(false);

  useEffect(() => {
    api
      .get("/openings")
      .then((res) => {
        const list: Opening[] = res.data ?? [];
        setOpenings(list);

        setSelectedOpeningName(null);
        setSelectedOpeningEco(null);
        setSelectedOpeningDescription("");
        setSelectedEco(null);

        setQuery("");
        setIsComboOpen(false);
      })
      .catch((e) => console.error("Error loading openings:", e));
  }, []);

  const filteredOpenings = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = openings;

    // filter by exact ECO first
    if (selectedEco) {
      list = list.filter((o) => o.eco === selectedEco);
    }

    // then apply text search (optional)
    if (!q) return list;

    return list.filter((o) => {
      const full = `${o.eco} — ${o.name}`.toLowerCase();
      return (
        full.includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.eco.toLowerCase().includes(q)
      );
    });
  }, [openings, query, selectedEco]);

  const ecoOptions = useMemo(() => {
    return Array.from(
      new Set(openings.map((o) => o.eco).filter(Boolean)),
    ).sort();
  }, [openings]);

  const pickOpeningByIndex = (idx: number) => {
    const picked = filteredOpenings[idx];
    if (!picked) return;

    setSelectedOpeningName(picked.name);
    setSelectedOpeningEco(picked.eco);
    setSelectedOpeningDescription(picked.description ?? "");
    setQuery(`${picked.eco} — ${picked.name}`);
    setIsComboOpen(false);
  };

  const startSession = async (openingEco: string, openingName: string) => {
    try {
      const response = await api.post("/training-sessions", {
        openingEco,
        openingName,
      });
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
            title="Start Training an Opening"
            subtitle={
              <span className="tile-subtitle italics">
                <RandomQuote />
              </span>
            }
            customBody={
              <div>
                <BoardPreview
                  openings={filteredOpenings}
                  selectedOpeningName={selectedOpeningName}
                  size={400}
                />

                <div className="tile-spacer" />

                <div className="eco-picker">
                  <label className="eco-label" htmlFor="eco-select">
                    ECO:
                  </label>

                  <select
                    className="eco-select"
                    id="eco-select"
                    value={selectedEco ?? ""}
                    onChange={(e) => {
                      const nextEco = e.target.value || null;

                      setSelectedEco(nextEco);
                      setSelectedOpeningName(null);
                      setSelectedOpeningEco(nextEco);
                      setSelectedOpeningDescription("");
                      setQuery("");
                      setIsComboOpen(false);
                    }}
                  >
                    <option value="">All ECOs</option>
                    {ecoOptions.map((eco) => (
                      <option key={eco} value={eco}>
                        {eco}
                      </option>
                    ))}
                  </select>
                </div>

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

                <div className="tile-spacer" />

                <Button
                  className="tile-action"
                  disabled={!selectedOpeningName}
                  onClick={() =>
                    selectedOpeningName &&
                    selectedOpeningEco &&
                    startSession(selectedOpeningEco, selectedOpeningName)
                  }
                  type="button"
                >
                  {selectedOpeningName
                    ? `Start ${selectedOpeningName}`
                    : `Choose An Opening`}
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
              <Button
                className="tile-action btn-secondary"
                onClick={() => {}}
                type="button"
                disabled
              >
                Coming Soon
              </Button>
            }
          />

          <DashboardTile
            className="tile-2"
            icon={<RecommendedLineIcon />}
            title="Recommended Line"
            subtitle="Study prompt picked for you"
            cta={
              <Button
                className="tile-action btn-secondary"
                onClick={() => {}}
                type="button"
                disabled
              >
                Coming Soon
              </Button>
            }
          />

          <DashboardTile
            className="tile-3"
            icon={<ClassicsIcon />}
            title="Classics Practice"
            subtitle="Re-learn the classics"
            cta={
              <Button
                className="tile-action btn-secondary"
                onClick={() => {}}
                type="button"
                disabled
              >
                Coming Soon
              </Button>
            }
          />

          <DashboardTile
            className="dashboard-tile tile-right"
            icon={<ProgressIcon />}
            title="Progress"
            subtitle="(Placeholder)"
          />
        </div>
      </div>
    </main>
  );
};
