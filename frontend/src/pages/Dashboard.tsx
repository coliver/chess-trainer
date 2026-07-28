import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

import classicsUrl from "../assets/classics.svg";
import upRightArrowUrl from "../assets/up-right-arrow.svg";
import targetUrl from "../assets/target.svg";
import branchUrl from "../assets/branch.svg";

import { KnightSchoolIcon } from "../components/KnightSchoolIcon";
import BoardPreview from "../components/openings/BoardPreview";
import OpeningCombo from "../components/openings/OpeningCombo";
import DashboardTile from "../components/openings/DashboardTile";

import { Button } from "../components/Button";

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

        setQuery(first ? `${first.eco} — ${first.name}` : "");
        setIsComboOpen(false);
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
        <p className="title" role="heading">{greeting}</p>
        <p className="subtitle">Ready to practice your lines?</p>

        <div className="dashboard-layout">
          <DashboardTile
            className="tile-start"
            tile={
              <div>
                <div className="tile-start-text">
                  <div>
                    <KnightSchoolIcon height={"100px"} />
                  </div>
                  <div className="tile-title">Training</div>
                  <div className="tile-subtitle">
                    Every day a little better.
                  </div>
                </div>

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
            icon={
              <img
                src={targetUrl}
                alt="Target with arrow"
                width={"64px"}
                height={"64px"}
              />
            }
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
            icon={
              <img
                src={branchUrl}
                alt="Recommended line"
                width={"64px"}
                height={"64px"}
              />
            }
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
            icon={
              <img
                src={classicsUrl}
                alt="Recommended line"
                width={"64px"}
                height={"64px"}
              />
            }
            title="Classics Practice"
            subtitle="Re-learn the classics"
            cta={
              <Button className="tile-action" onClick={() => {}} type="button">
                Start Classics
              </Button>
            }
          />

          <DashboardTile          
            className="dashboard-tile--tall tile-right"
            compact
            rightArrowIcon={
              <img
                src={upRightArrowUrl}
                alt="Recommended line"
                width={28}
                height={28}
              />
            }
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
