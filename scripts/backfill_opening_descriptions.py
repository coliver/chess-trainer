"""Backfill the openings.description column with the authored blurbs that
previously lived only in react/src/data/openingText.ts and
angular/src/app/lib/opening-text.ts.

Only the base "main line" rows and the specific well-known variations we've
hand-authored get a description here — everything else is left NULL and the
frontend's generic template fallback still applies (describeOpening() always
prefers the DB description when present).

Usage: DATABASE_URL=... python scripts/backfill_opening_descriptions.py
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from psycopg import connect
from psycopg.rows import dict_row


def load_env_file(path: str = ".env"):
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env_file(".env")

BASE_TEXT: dict[str, str] = {
    "Sicilian Defense":
        "Black's most popular and combative reply to 1.e4, meeting it asymmetrically with 1...c5 and playing for a win rather than equality.",
    "French Defense":
        "Black answers 1.e4 with 1...e6 and 2...d5, building a solid pawn chain and a clear plan of counterplay, at the cost of a passive light-squared bishop.",
    "Caro-Kann Defense":
        "A sound, resilient defence: 1...c6 supports ...d5 without shutting in the light-squared bishop like the French. Favoured for its structural soundness.",
    "Ruy Lopez":
        "The Spanish Game. After 1.e4 e5 2.Nf3 Nc6 3.Bb5, White pressures the knight defending e5. One of the oldest, deepest, and most respected openings.",
    "Italian Game":
        "After 1.e4 e5 2.Nf3 Nc6 3.Bc4, White trains the bishop on f7 for quick, natural development. Principled and ideal for improving players; its quiet main line is the Giuoco Piano.",
    "Scandinavian Defense":
        "Black challenges the centre immediately with 1...d5. Direct and easy to learn, trading early complexity for a clear structure.",
    "Pirc Defense":
        "A hypermodern reply: Black lets White build a big centre, then undermines it with a kingside fianchetto and timely pawn breaks.",
    "Caro-Kann":
        "A sound, resilient defence built on ...c6 and ...d5, keeping the light-squared bishop active.",
    "Queen's Gambit Declined":
        "Black declines the gambit and builds a solid classical centre with ...d5 and ...e6. A cornerstone of elite chess for over a century.",
    "Queen's Gambit Accepted":
        "Black takes the c4-pawn, conceding the centre temporarily to free the position and target White's structure.",
    "Slav Defense":
        "Black supports d5 with ...c6 instead of ...e6, keeping the light-squared bishop's diagonal open. Rock-solid and hard to crack.",
    "Semi-Slav Defense":
        "A Slav/QGD hybrid with ...c6 and ...e6. Black holds a firm centre and can steer into the razor-sharp Botvinnik and Meran lines.",
    "King's Indian Defense":
        "Black cedes the centre to attack it later with ...e5 or ...c5 and a kingside fianchetto. Dynamic, uncompromising, and rich in attacking play.",
    "Nimzo-Indian Defense":
        "Black pins the c3-knight with ...Bb4 to fight for control of e4. Prized for combining structural soundness with deep strategy.",
    "Queen's Indian Defense":
        "A flexible, solid partner to the Nimzo: Black fianchettoes on b7 to contest the long light-square diagonal.",
    "Grünfeld Defense":
        "A hypermodern counterattack: Black strikes the big centre with ...d5 and piece pressure rather than occupying it. Very sharp and concrete.",
    "Benoni Defense":
        "Black accepts a space disadvantage for dynamic, asymmetrical counterplay down the half-open e-file and the long diagonal.",
    "Dutch Defense":
        "Black grabs kingside space with 1...f5, aiming for an aggressive attacking game against 1.d4.",
    "English Opening":
        "A flexible flank opening. 1.c4 stakes a claim on d5 and can transpose into a wide range of structures.",
    "Réti Opening":
        "A hypermodern flank system: White develops with Nf3 and a fianchetto, pressuring the centre from the wings before committing pawns.",
    "Bird Opening":
        "White plays 1.f4, staking out kingside space and aiming for a reversed Dutch-style setup.",
    "London System":
        "A solid, systematic setup with d4, Bf4, e3 and c3 that White can play against almost anything. Reliable and low-maintenance.",
    "Vienna Game":
        "White develops the knight to c3 before Nf3, keeping the f-pawn free for an early f4 push and aggressive intentions.",
    "Scotch Game":
        "White strikes the centre early with 3.d4, opening lines quickly for fast, concrete piece play.",
    "Petrov's Defense":
        "The Russian Game. Black mirrors with 2...Nf6, seeking symmetry and rock-solid equality. A byword for reliability.",
    "Philidor Defense":
        "A solid but cramped classical defence with ...d6 propping up e5. Sturdy, if a touch passive.",
    "Alekhine Defense":
        "A provocative hypermodern try: 1...Nf6 invites White to chase the knight and overextend, then Black strikes back.",
    "King's Gambit Accepted":
        "A romantic-era gambit: White sacrifices the f-pawn for rapid development and a raging attack on the open f-file.",
    "Catalan Opening":
        "White blends a Queen's Gambit centre with a kingside fianchetto, exerting long-term pressure on the light squares and the c4-pawn.",
    "Queen's Gambit":
        "White offers the c4-pawn to deflect Black's d5-pawn and gain a strong central grip. One of the oldest and most respected queen's-pawn openings.",
    "Queen's Pawn Game":
        "Any opening beginning 1.d4 d5 that has not yet declared a specific system. Flexible and solid, it can transpose into many mainstream structures.",
    "Queen's Pawn, Mengarini Attack":
        "An offbeat queen's-pawn line featuring an early a3, keeping options open and sidestepping mainstream theory.",
    "King's Pawn Game":
        "The broad family of openings starting 1.e4 e5 before a named system appears. Open, classical chess emphasising quick development.",
    "King's Pawn Opening":
        "Openings opening with 1.e4 that have not yet settled into a named variation. Direct play for central space and rapid development.",
    "King's Knight Opening":
        "After 1.e4 e5 2.Nf3, White develops the king's knight and eyes the e5-pawn — the natural gateway to the Ruy Lopez, Italian, and many other lines.",
    "King's Gambit":
        "White plays 2.f4, offering the f-pawn to rip open lines against Black's e5-point. A sharp, romantic gambit prizing initiative over material.",
    "King's Gambit Declined":
        "Black declines the offered f-pawn, most often with ...Bc5 or ...d6, aiming for solid development while denying White the fully open lines the gambit seeks.",
    "King's Indian Attack":
        "A reversed King's Indian setup White can steer into against many defences: Nf3, g3, Bg2, O-O, d3 and e4, building a flexible kingside attacking scheme.",
    "King's Indian Attack, with Bf5":
        "A King's Indian Attack in which Black develops the light-squared bishop actively to f5 before locking the centre.",
    "King's Indian Attack, with e6":
        "A King's Indian Attack met by a French-style ...e6 setup, giving Black a solid but slightly passive light-squared bishop.",
    "Four Knights Game":
        "After 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 both sides develop symmetrically. Classical and sound, with quiet or sharp (Scotch, Belgrade) branches.",
    "Three Knights Opening":
        "A relative of the Four Knights where Black avoids ...Nf6, choosing an independent third-move setup instead. Classical open-game play.",
    "Bishop's Opening":
        "1.e4 e5 2.Bc4 trains the bishop on f7 at once and can transpose to the Italian or Vienna, while keeping f-pawn options open.",
    "Center Game":
        "White strikes with 2.d4 straight away; after ...exd4 3.Qxd4 the early queen sortie trades central tension for quick, direct development.",
    "Center Game Accepted":
        "Black captures on d4 in the Center Game, inviting White's early queen recapture and the sharp open play that follows.",
    "Ponziani Opening":
        "1.e4 e5 2.Nf3 Nc6 3.c3, preparing d4 to build a broad centre. An old, offbeat line that steers away from Ruy Lopez theory.",
    "Danish Gambit":
        "White sacrifices one or two pawns with c3 and Bc4/Bxb2 for rapid development and open diagonals aimed at f7. A swashbuckling attacking gambit.",
    "Danish Gambit Accepted":
        "Black grabs the offered pawns in the Danish Gambit, accepting a material edge in return for facing White's fast development and open lines.",
    "Danish Gambit Declined":
        "Black returns or refuses the Danish Gambit material, aiming to blunt White's initiative and reach a soundly developed position.",
    "Latvian Gambit":
        "A rare, aggressive reply to 1.e4 e5 2.Nf3 with 2...f5, a reversed King's Gambit that seeks wild complications at some structural risk.",
    "Latvian Gambit Accepted":
        "White captures on f5 in the Latvian Gambit, meeting Black's provocative pawn thrust head-on for sharp, unbalanced play.",
    "Elephant Gambit":
        "Black answers 1.e4 e5 2.Nf3 with 2...d5, an offbeat counter-gambit striking the centre at once. Enterprising but theoretically dubious.",
    "Irish Gambit":
        "A dubious romantic gambit in which White sacrifices a knight on e5 very early. Rarely seen outside casual and offbeat play.",
    "Vienna Gambit, with Max Lange Defense":
        "A Vienna Gambit line in which Black adopts the Max Lange setup, meeting White's early f4 push with solid classical development.",
    "Portuguese Opening":
        "1.e4 e5 2.Bb5, an offbeat cousin of the Ruy Lopez that develops the bishop before Nf3, sidestepping mainstream theory.",
    "Owen Defense":
        "Black answers 1.e4 with 1...b6, fianchettoing the light-squared bishop to pressure e4 from the flank. Solid but passive.",
    "St. George Defense":
        "Black replies to 1.e4 with 1...a6, a provocative flank system preparing ...b5 and ...Bb7. Offbeat but occasionally surprising.",
    "Nimzowitsch Defense":
        "Black meets 1.e4 with 1...Nc6, a hypermodern try that pressures the centre with pieces rather than pawns and often transposes to unusual structures.",
    "Modern Defense":
        "Black fianchettoes with ...g6 and ...Bg7, letting White build a centre before striking at it — a flexible, hypermodern cousin of the Pirc.",
    "Robatsch Defense":
        "Another name for the Modern Defense: Black delays committing central pawns and fianchettoes the king's bishop to counterattack White's centre.",
    "Rat Defense":
        "An offbeat 1...d6 system in which Black keeps a flexible, modern setup, often transposing into Pirc- or Modern-style positions.",
    "Lion Defense":
        "A Philidor/Pirc-related setup with ...d6, ...Nf6, ...Nbd7 and ...e5, building a compact, resilient formation before counterattacking.",
    "Czech Defense":
        "Black plays ...d6 and ...c6 with ...Nf6, a solid, restrained modern setup that keeps the position flexible and hard to break down.",
    "Hippopotamus Defense":
        "Black develops behind a wall of pawns on the third rank with double fianchettoes, ceding the centre entirely to counter later. Ultra-flexible and provocative.",
    "Pterodactyl Defense":
        "An offbeat Modern-Defense hybrid where Black fianchettoes and plays an early ...Qa5, combining ...g6 setups with quick queenside pressure.",
    "Borg Defense":
        "The reversed Grob: Black answers 1.e4 with 1...g5, a wildly provocative and unsound flank thrust.",
    "Carr Defense":
        "Black meets 1.e4 with 1...h6, a passive and offbeat waiting move rarely seen in serious play.",
    "Goldsmith Defense":
        "An irregular reply to 1.e4 with 1...h5, a rare flank pawn move outside standard theory.",
    "Barnes Defense":
        "Black answers 1.e4 with 1...f6, a weakening and generally poor move that neglects development.",
    "Lemming Defense":
        "A rare, offbeat reply to 1.e4 with little theoretical standing, leading to unusual, untested positions.",
    "Australian Defense":
        "An obscure, offbeat defence to 1.d4 that departs from mainstream theory, leading to independent play.",
    "Kangaroo Defense":
        "Black meets 1.d4 with an early ...Bb4+ (after ...e6), an offbeat, flexible system that can transpose to Bogo- or Nimzo-Indian structures.",
    "Fried Fox Defense":
        "A bizarre, unsound defence in which Black shuffles the king early, ceding development for shock value. Not a serious system.",
    "Vulture Defense":
        "An offbeat Benoni-related line where Black plays an early ...Ne4, a provocative and rarely seen sideline.",
    "Zaire Defense":
        "A rare, irregular defence that departs quickly from mainstream lines into little-explored territory.",
    "Wade Defense":
        "Black develops the light-squared bishop early to g4 with ...d6 against 1.d4, an offbeat but playable system pinning White's knight.",
    "Döry Defense":
        "An offbeat Indian defence in which Black plays an early ...Ne4, provoking White and steering into uncommon structures.",
    "Indian Defense":
        "The broad 1.d4 Nf6 family before it branches into a named system. Hypermodern in spirit, contesting the centre with pieces.",
    "Old Indian Defense":
        "Black plays ...d6 and ...e5 behind ...Nf6, a solid, classical cousin of the King's Indian without the early kingside fianchetto.",
    "East Indian Defense":
        "An early ...g6 Indian setup that can transpose toward King's Indian or Grünfeld structures depending on how the centre unfolds.",
    "Mexican Defense":
        "Black develops both knights early with ...Nf6 and ...Nc6 against 1.d4, an offbeat, provocative system.",
    "Slav Indian":
        "A hybrid where Black combines ...Nf6 with an early ...c6 against 1.d4, blending Slav and Indian ideas.",
    "Neo-Grünfeld Defense":
        "A Grünfeld setup in which White has fianchettoed with g3; Black still strikes the centre with ...d5 for hypermodern counterplay.",
    "Bogo-Indian Defense":
        "Black checks with ...Bb4+ against 1.d4 (after Nf3), a solid, low-theory cousin of the Nimzo-Indian that trades bishops or gains time.",
    "Queen's Indian Accelerated":
        "A Queen's Indian in which Black plays an early ...b6 and ...Bb7 to contest the long light-square diagonal before White commits.",
    "Queen's Indian Defense, with e3":
        "A Queen's Indian where White supports the centre with a modest e3, aiming for a solid, restrained structure.",
    "Queen's Indian Defense, with e3, Bb4+ Line":
        "A Queen's Indian with e3 in which Black inserts ...Bb4+, blending Nimzo- and Queen's-Indian ideas.",
    "Pseudo Queen's Indian Defense":
        "An early ...b6 fianchetto setup against 1.d4 that resembles the Queen's Indian but arises through a different move order.",
    "Benko Gambit":
        "Black sacrifices a wing pawn with ...b5 in a Benoni structure to open the a- and b-files and generate lasting queenside pressure.",
    "Benko Gambit Accepted":
        "White captures the b5-pawn, taking the material while Black obtains long-term queenside pressure and open lines for the price of a pawn.",
    "Benko Gambit Declined":
        "White refuses the offered b5-pawn, aiming to blunt Black's queenside play and keep a more solid Benoni-style structure.",
    "Blumenfeld Countergambit":
        "In a Benoni structure Black plays ...b5, sacrificing a pawn to build a strong central pawn duo and active piece play.",
    "Blumenfeld Countergambit Accepted":
        "White captures the b5-pawn in the Blumenfeld, taking material while Black builds a broad, mobile centre in compensation.",
    "Tarrasch Defense":
        "Black meets the Queen's Gambit with ...c5, accepting an isolated d-pawn in return for free piece play and open lines.",
    "Semi-Slav Defense Accepted":
        "A Semi-Slav in which the central tension is resolved by a capture, steering the Slav/QGD hybrid into more concrete play.",
    "Colle System":
        "A compact queen's-pawn system with d4, Nf3, e3, Bd3 and c3, preparing an e4 break. Reliable, easy to learn, and low on theory.",
    "Torre Attack":
        "White plays d4, Nf3 and Bg5, pinning Black's knight and building a flexible, solid setup that avoids heavy main-line theory.",
    "Trompowsky Attack":
        "1.d4 Nf6 2.Bg5, pinning or swapping off the knight at once to sidestep mainstream Indian defences and impose White's own structures.",
    "Richter-Veresov Attack":
        "White plays d4, Nc3 and Bg5, an aggressive, offbeat queen's-pawn system aiming for early piece pressure and an e4 break.",
    "London System, with Bd3":
        "A London System in which White places the light-squared bishop on d3, supporting an e4 break and a kingside setup.",
    "London System, with Be2":
        "A London System with the bishop developed modestly to e2, a solid, flexible handling of White's pyramid structure.",
    "Rapport-Jobava System":
        "White combines d4, Nc3 and Bf4 for an aggressive, offbeat London-style setup with early piece activity and Nb5 ideas.",
    "Rapport-Jobava System, with e6":
        "A Rapport-Jobava setup met by Black's solid ...e6, leading to flexible, less-charted middlegame play.",
    "Marienbad System":
        "A queen's-pawn system featuring a double fianchetto for White, contesting the long diagonals in restrained, positional fashion.",
    "Yusupov-Rubinstein System":
        "A solid queen's-pawn setup with e3 and restrained development, aiming for a sound structure and gradual play.",
    "Rubinstein Opening":
        "A Colle-style queen's-pawn system with d4, Nf3 and e3, developing soundly before seeking central breaks.",
    "Zukertort Opening":
        "1.Nf3, a flexible flank move that keeps White's options open and can transpose into a wide range of d4 or c4 structures.",
    "Zukertort Defense":
        "An offbeat reply that develops a knight early, leading to independent, less-charted positions.",
    "Nimzo-Larsen Attack":
        "White fianchettoes the queen's bishop early with b3 and Bb2, pressuring the long diagonal in hypermodern style before committing the centre.",
    "Polish Opening":
        "1.b4, the Sokolsky, grabbing queenside space and fianchettoing the queen's bishop for offbeat, flank-oriented play.",
    "Polish Opening, with d5":
        "A Polish Opening in which Black stakes a central claim with an early ...d5, challenging White's flank plan.",
    "Polish Defense":
        "Black answers 1.d4 with 1...b5, a rare flank thrust grabbing queenside space at some structural cost.",
    "English Defense":
        "Black meets 1.d4 or 1.c4 with ...b6 and ...Bb7, a provocative hypermodern system pressuring e4 and inviting sharp, unbalanced play.",
    "English Orangutan":
        "An English Opening handled with an early b4, blending flank pressure on both wings in offbeat fashion.",
    "Anderssen's Opening":
        "White opens 1.a3, a rare waiting move that keeps options open and can transpose into reversed defences.",
    "Ware Opening":
        "White opens 1.a4, an irregular flank move with little central impact, rarely seen in serious play.",
    "Ware Defense":
        "Black replies to 1.e4 with 1...a5, an offbeat flank move outside mainstream theory.",
    "Grob Opening":
        "White plays 1.g4, a provocative and unsound flank thrust that grabs kingside space while weakening the king. Purely offbeat.",
    "Amar Opening":
        "White opens 1.Nh3, a bizarre and unsound knight development, essentially a joke opening.",
    "Amazon Attack":
        "An offbeat, irregular opening scheme that departs quickly from established theory into untested positions.",
    "Amsterdam Attack":
        "A rare, offbeat opening system that avoids mainstream lines in favour of independent play.",
    "Barnes Opening":
        "White opens 1.f3, a poor move that weakens the king and does nothing for development or the centre.",
    "Basque Opening":
        "An offbeat opening system outside mainstream theory, leading to unusual, independent play.",
    "Blackmar-Diemer Gambit":
        "White sacrifices a pawn with an early e4 and f3 against ...d5, opening lines for rapid development and a kingside attack.",
    "Blackmar-Diemer Gambit Accepted":
        "Black captures the offered pawn in the Blackmar-Diemer, taking material against White's fast development and open attacking lines.",
    "Blackmar-Diemer Gambit Declined":
        "Black declines the Blackmar-Diemer pawn, aiming to neutralise White's attacking intentions and reach a sound structure.",
    "Canard Opening":
        "White plays an early d4 and f4 (the Stonewall-style pawn duo) in an offbeat setup, staking central and kingside space.",
    "Clemenz Opening":
        "White opens 1.h3, an irregular waiting move with negligible central impact, rarely seen in serious games.",
    "Creepy Crawly Formation":
        "An ultra-passive setup in which White advances only flank pawns early, ceding the centre in a hypermodern, provocative manner.",
    "Dresden Opening":
        "An English-style setup with c4 and an early a3, a flexible, offbeat handling of the flank opening.",
    "Duras Gambit":
        "Black replies to 1.e4 with 1...f5, an aggressive but risky gambit-like thrust that weakens the kingside.",
    "Englund Gambit":
        "Black answers 1.d4 with 1...e5, a sharp gambit sacrificing a pawn for quick development and tactical tricks. Dubious but tricky.",
    "Englund Gambit Declined":
        "White declines the Englund pawn, sidestepping Black's tactics to keep a safe, well-developed position.",
    "Gunderam Defense":
        "An offbeat defence to 1.e4 that steers away from mainstream open-game theory into independent lines.",
    "Global Opening":
        "An irregular opening scheme outside standard theory, leading to unusual, untested play.",
    "Horwitz Defense":
        "Black answers 1.d4 with 1...e6, a flexible move that can transpose into the French, Queen's Gambit, or various Indian setups.",
    "Hungarian Opening":
        "White opens 1.g3, preparing a kingside fianchetto in reversed-defence, hypermodern style with great flexibility.",
    "Mieses Opening":
        "White opens 1.d3, a modest, flexible move that keeps options open and often transposes into reversed defensive setups.",
    "Mikenas Defense":
        "Black meets 1.d4 with 1...Nc6, an offbeat knight development that pressures the centre in unorthodox fashion.",
    "Montevideo Defense":
        "A rare, offbeat reply that departs quickly from mainstream theory into independent positions.",
    "Paleface Attack":
        "White plays d4 with an early f3, a restrained, offbeat system preparing e4 in Blackmar-Diemer or Torre-related fashion.",
    "Saragossa Opening":
        "White opens 1.c3, a modest, flexible move that prepares d4 and keeps the position quiet and non-committal.",
    "Sodium Attack":
        "White opens 1.Na3, developing the knight to the rim — an offbeat and passive first move rarely used seriously.",
    "Valencia Opening":
        "An irregular opening system outside mainstream theory, leading to independent, little-explored play.",
    "Van Geet Opening":
        "White opens 1.Nc3, developing the queen's knight first — a flexible, offbeat move that can transpose into many structures.",
    "Van't Kruijs Opening":
        "White opens 1.e3, a modest and flexible move that keeps options open, often transposing into reversed defensive setups.",
    "Kádas Opening":
        "White opens 1.h4, an irregular flank thrust with little central value, rarely seen in serious play.",
    "Bongcloud Attack":
        "White plays an early 2.Ke2, a notorious joke opening that exposes the king and violates opening principles.",
    "Lasker Simul Special":
        "An offbeat opening line associated with simultaneous exhibitions, departing early from mainstream theory.",
    "Formation":
        "A generic setup pattern rather than a specific named opening, describing a pawn-and-piece formation reachable by several move orders.",
}

VARIATION_TEXT: dict[str, str] = {
    "Sicilian Defense: Najdorf Variation":
        "5...a6 — the most deeply analysed line in chess. Black delays commitment, preparing ...e5 or ...b5 while keeping every option open. Kasparov's and Fischer's main weapon.",
    "Sicilian Defense: Dragon Variation":
        "Black fianchettoes with ...g6 and ...Bg7, aiming the bishop down the long diagonal. Leads to the razor-sharp Yugoslav Attack, where both kings often run for their lives.",
    "Sicilian Defense: Scheveningen Variation":
        "Black sets up pawns on d6 and e6, a flexible 'small centre' that can absorb pressure and strike back with ...d5 or ...b5 later.",
    "Sicilian Defense: Lasker-Pelikan Variation, Sveshnikov Variation":
        "Black plays an early ...e5, conceding the d5-square but gaining piece activity and a healthy pawn majority. Once considered dubious, now a top-level main line.",
    "Sicilian Defense: Kan Variation":
        "2...e6 and 4...a6 keep Black's structure maximally flexible, delaying ...Nc6 or ...Nf6 to react to White's setup.",
    "Sicilian Defense: Taimanov Variation":
        "Black develops with ...Nc6 and ...e6 without committing the d-pawn, aiming for quick piece play and central counterstrikes.",
    "Sicilian Defense: Accelerated Dragon":
        "Black fianchettoes the bishop before playing ...d6, hoping to meet the Maroczy Bind setup with faster counterplay against c4.",
    "Sicilian Defense: Closed":
        "White avoids the main-line theory battles with 2.Nc3 and a kingside fianchetto, aiming for a slower, strategic game.",
    "Sicilian Defense: Alapin Variation":
        "2.c3 stakes a claim for a full d4 centre next move, sidestepping the main Open Sicilian theory. Solid and popular at club and top level alike.",
    "Sicilian Defense: Smith-Morra Gambit":
        "White sacrifices a pawn with 2.d4 cxd4 3.c3 for rapid development and open lines, hoping to overwhelm Black before the extra pawn matters.",
    "Sicilian Defense: Nyezhmetdinov-Rossolimo Attack":
        "3.Bb5 pins or trades off Black's knight, avoiding heavy main-line Sicilian theory while keeping a small, lasting structural edge.",
    "Sicilian Defense: Nimzowitsch Variation":
        "2...Nf6 provokes e5, then Black hits back at the advanced pawn — a sharp, direct alternative to the main lines.",
    "Sicilian Defense: Four Knights Variation":
        "Both sides develop knights early (2...Nc6, 3...Nf6), often transposing into Sveshnikov- or Taimanov-related structures.",
    "Sicilian Defense: Grand Prix Attack":
        "White plays an early f4, going straight for a kingside pawn storm and quick attack rather than the slow manoeuvring of the Open Sicilian.",
    "Sicilian Defense: Wing Gambit":
        "White offers the b-pawn with 2.b4 to divert Black's c-pawn and seize the centre with tempo. Enterprising but theoretically dubious.",
    "Sicilian Defense: Chekhover Variation":
        "White recaptures on d4 with the queen, sidestepping some Open Sicilian theory while keeping central control.",
    "Sicilian Defense: Modern Variations":
        "A catch-all for early sideline tries that deviate from the main Open Sicilian battlegrounds.",
    "Ruy Lopez: Closed":
        "The main battleground of the Ruy Lopez: both sides castle and manoeuvre for space before opening the centre. Deep strategic chess, historically the main line at the top level.",
    "Ruy Lopez: Berlin Defense":
        "3...Nf6 heading for an early queen trade after 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5. The 'Berlin Wall' — famously used by Kramnik to neutralise Kasparov in 2000.",
    "Ruy Lopez: Exchange Variation":
        "White trades on c6 to double Black's pawns, banking on the long-term structural edge in a simplified position with a healthy pawn majority.",
    "Ruy Lopez: Open":
        "Black grabs the e4-pawn with 5...Nxe4, accepting an isolated pawn structure later for active piece play down the e-file.",
    "Ruy Lopez: Marshall Attack":
        "Black sacrifices a pawn with 8...d5, offering material for a fierce, long-lasting initiative against White's king. A perennial main-line battleground.",
    "Ruy Lopez: Schliemann Defense":
        "3...f5 strikes back immediately, offering sharp, unbalanced play at the cost of structural risk — Black fights for the initiative from move three.",
    "Ruy Lopez: Steinitz Defense":
        "3...d6 shores up e5 immediately, a solid but passive setup that cedes space for a compact, hard-to-crack structure.",
    "Ruy Lopez: Classical Variation":
        "3...Bc5 develops actively and pins nothing down, inviting sharp central play rather than the slow manoeuvring of the main lines.",
    "Ruy Lopez: Cozio Defense":
        "3...Nge7 develops the knight to a slightly awkward square to avoid the main theoretical debates, keeping the position flexible.",
    "Ruy Lopez: Bird Variation":
        "3...Nd4 offers a pawn sacrifice by inviting Nxd4, aiming for quick piece activity in return for the structural concession.",
    "Ruy Lopez: Morphy Defense, Norwegian Variation":
        "An early ...Na5 or delayed development idea named for Carlsen's use of offbeat Ruy Lopez tries.",
    "Italian Game: Giuoco Piano":
        "The 'quiet game' — both sides develop naturally with 3...Bc5, leading to rich strategic middlegames rather than immediate fireworks.",
    "Italian Game: Two Knights Defense":
        "3...Nf6 counterattacks e4 at once, inviting sharp tactical lines like the Fried Liver Attack after 4.Ng5.",
    "Italian Game: Evans Gambit":
        "White offers the b-pawn with 4.b4 to gain a tempo and a big centre, a romantic 19th-century weapon revived occasionally by elite players.",
    "Italian Game: Hungarian Defense":
        "3...Be7 is a modest, solid try that avoids early tactics, conceding some activity for safety.",
    "Italian Game: Scotch Gambit":
        "White meets the Italian setup with an early d4 sacrifice, trading a pawn for rapid development and central control.",
    "Scotch Game: Classical Variation":
        "Black develops naturally with ...Bc5 after the central exchange, aiming for quick piece activity against White's centralised queen or pawns.",
    "Scotch Game: Mieses Variation":
        "Black plays an early ...Qh4, hitting e4 and disrupting White's development after the central trade.",
    "Scotch Game: Scotch Gambit":
        "White declines to retreat the attacked knight and instead develops with tempo, offering a pawn for rapid piece activity.",
    "French Defense: Winawer Variation":
        "3...Bb4 pins the knight and provokes structural weaknesses, leading to the sharpest, most theoretically loaded French lines — often with opposite-side attacks.",
    "French Defense: Tarrasch Variation":
        "3.Nd2 avoids the Winawer pin entirely, aiming for a slower strategic game with a small, safe edge.",
    "French Defense: Advance Variation":
        "3.e5 grabs space immediately, locking the centre and setting up a long strategic battle around the resulting pawn chains.",
    "French Defense: Exchange Variation":
        "3.exd5 simplifies the structure into a symmetrical position, generally viewed as solid but drawish unless spiced up with active piece play.",
    "French Defense: Classical Variation":
        "3...Nf6 develops naturally, meeting White's centre with direct pressure rather than the Winawer's structural complications.",
    "French Defense: Rubinstein Variation":
        "3...dxe4 simplifies at once, aiming for a solid, slightly passive structure that's hard for White to crack.",
    "French Defense: Steinitz Variation":
        "A Tarrasch-related structure with an early ...Nf6 and central tension, leading to rich middlegame manoeuvring.",
    "Caro-Kann Defense: Advance Variation":
        "3.e5 grabs space and locks the centre, similar in spirit to the French Advance but with Black's light-squared bishop already outside the pawn chain.",
    "Caro-Kann Defense: Classical Variation":
        "Black develops the light-squared bishop to f5 before ...e6, the defence's signature idea that avoids the French's chronic bishop problem.",
    "Caro-Kann Defense: Exchange Variation":
        "3.exd5 cxd5 creates a symmetrical centre where White often targets the resulting minority-attack structure.",
    "Caro-Kann Defense: Panov Attack":
        "White meets ...d5 with an IQP structure via c4, mirroring Queen's Gambit-style plans for active piece play against Black's centre.",
    "Caro-Kann Defense: Two Knights Attack":
        "White develops both knights before committing the centre, keeping options flexible against Black's solid setup.",
    "Caro-Kann Defense: Main Line":
        "3.Nc3 (or Nd2) dxe4 4.Nxe4 Bf5 is the classical tabiya, where Black's bishop escapes before the pawn chain locks it in.",
    "Queen's Gambit Declined: Exchange Variation":
        "White trades on d5 to fix the pawn structure, often preparing a minority attack with b4-b5 to create weaknesses on Black's queenside.",
    "Queen's Gambit Declined: Lasker Defense":
        "Black trades pieces with ...Ne4 early to relieve the position, a tried-and-tested equalising method against the QGD's main lines.",
    "Queen's Gambit Declined: Cambridge Springs Defense":
        "Black pins White's knight with ...Qa5 after a well-timed ...Nbd7 and ...c6, generating quick counterplay against the centre.",
    "Queen's Gambit Declined: Tartakower Defense":
        "Black plays ...b6 and ...Bb7, fianchettoing to complete development flexibly while keeping the centre solid.",
    "Queen's Gambit Declined: Orthodox Defense":
        "Black completes development classically with ...Be7 and ...O-O before deciding on a central plan — a bedrock of QGD theory since the 19th century.",
    "Slav Defense: Chebanenko Variation":
        "An early ...a6 gives Black's queenside extra flexibility, preparing ...b5 or ...Bf5 without committing to a specific main line.",
    "Slav Defense: Czech Variation":
        "Black develops the bishop to f5 early, echoing the Caro-Kann's approach to avoid the light-squared bishop being shut in.",
    "Semi-Slav Defense: Meran Variation":
        "Black strikes with ...c5 and ...b5 for dynamic queenside counterplay, one of the sharpest and most respected main-line battlegrounds in queen's-pawn chess.",
    "Semi-Slav Defense: Botvinnik Variation":
        "An extremely sharp, forcing line where both sides sacrifice material for attacking chances — among the most heavily analysed positions in chess.",
    "Semi-Slav Defense: Moscow Variation":
        "White pins with Bg5 against the Semi-Slav setup, provoking ...h6 and steering toward well-charted, safer waters than the Botvinnik.",
    "King's Indian Defense: Orthodox Variation, Classical System":
        "Both sides commit to the centre before racing on opposite wings — White pushes queenside, Black storms the kingside. The defence's iconic middlegame.",
    "King's Indian Defense: Sämisch Variation":
        "White plays an early f3 and Be3, building a broad centre and preparing a quick kingside attack with g4, while restraining Black's typical ...Ne4/...Nc5 ideas.",
    "King's Indian Defense: Four Pawns Attack":
        "White grabs maximum central space with c4, d4, e4 and f4, betting on overwhelming force before Black can counterattack the overextended centre.",
    "King's Indian Defense: Fianchetto Variation":
        "White meets the King's Indian setup with a matching g3 fianchetto, aiming for a calmer, more positional battle than the Classical or Sämisch.",
    "King's Indian Defense: Averbakh Variation":
        "White develops Be2 and Bg5 before committing the centre, pinning down Black's typical plans and delaying the critical central tension.",
    "King's Indian Defense: Petrosian Variation":
        "White closes the centre early with d5, aiming for a slow manoeuvring battle where piece placement matters more than immediate tactics.",
    "Nimzo-Indian Defense: Classical Variation":
        "4.Qc2 avoids doubled pawns by preparing to meet ...Bxc3 with the queen, keeping the structure intact at the cost of development time.",
    "Nimzo-Indian Defense: Rubinstein System":
        "4.e3 is the most flexible, popular main line, developing naturally and postponing the decision about how to meet the bishop pin.",
    "Nimzo-Indian Defense: Sämisch Variation":
        "White accepts doubled c-pawns with 4.a3 Bxc3+ 5.bxc3 in exchange for the bishop pair and a broad pawn centre.",
    "Nimzo-Indian Defense: Leningrad Variation":
        "White develops Bg5 immediately, pinning the knight and aiming for quick piece pressure rather than the main Rubinstein plans.",
    "Grünfeld Defense: Exchange Variation":
        "White accepts an isolated but mobile centre after the central trades, while Black bombards it with pieces from the flanks — the defence's main theoretical battlefield.",
    "Grünfeld Defense: Russian Variation":
        "White plays an early Qb3, pressuring d5 and b7 simultaneously to punish Black's hypermodern approach before it's fully set up.",
    "English Opening: Symmetrical Variation":
        "Black mirrors with 1...c5, leading to rich, flexible structures that can resemble a reversed Sicilian or transpose into many other openings.",
    "English Opening: King's English Variation, Four Knights Variation":
        "Both sides develop knights symmetrically, a calm, flexible tabiya that can head toward numerous English pawn structures.",
    "English Opening: King's English Variation, Reversed Sicilian":
        "White effectively plays a Sicilian Defense with an extra tempo, aiming for a favourable version of Black's usual counterattacking setups.",
    "Réti Opening: Advance Variation":
        "White advances the fianchettoed knight's support pawns gradually, pressuring d5 from a distance in true hypermodern fashion.",
    "Petrov's Defense: Classical Attack":
        "White presses for an edge with 3.Nxe5 d6 4.Nf3, aiming to exploit Black's symmetrical, slightly passive setup.",
    "Petrov's Defense: Modern Attack, Steinitz Variation":
        "White meets the Petrov head-on with an early d4, fighting for the centre rather than settling for the drawish main lines.",
    "Alekhine Defense: Four Pawns Attack":
        "White accepts the invitation to overextend, building a huge pawn centre for Black to attack — the sharpest test of the whole opening.",
    "Alekhine Defense: Exchange Variation":
        "White trades on d6, simplifying the structure to neutralise the provocative ideas behind 1...Nf6.",
    "Alekhine Defense: Modern Variation":
        "White develops naturally with Nf3 and g3, meeting the provocation with sound development rather than an immediate pawn storm.",
    "Pirc Defense: Austrian Attack":
        "White meets the Pirc setup with an aggressive f4-f5 pawn storm, punishing Black's slow development with a direct kingside assault.",
    "Pirc Defense: Classical Variation":
        "White develops naturally with Nf3, Be2 and O-O, aiming for a calm positional edge rather than an immediate attack.",
    "Benoni Defense: Modern Variation":
        "The main Benoni tabiya, where Black accepts a cramped but resilient structure for dynamic piece play down the long diagonal and half-open e-file.",
    "Benoni Defense: Czech Benoni Defense":
        "Black locks the centre completely and plays for a slow kingside expansion with ...g6, ...Bg7, and eventually ...f5, rather than the sharp piece play of the Modern Benoni.",
    "Scandinavian Defense: Main Line":
        "After 2...Qxd5 3.Nc3, Black retreats the queen (commonly to a5 or d6/d8) having traded central tension for quick, simple development.",
    "Vienna Game: Vienna Gambit":
        "White supports an early f4 push with Nc3 first, aiming for a King's Gambit-style attack while sidestepping some of its sharpest defences.",
    "Bogo-Indian Defense":
        "Black's characteristic ...Bb4+ check after Nf3, aiming to trade off the dark-squared bishop or gain time for a solid, low-theory setup.",
    "Catalan Opening: Open Defense":
        "Black takes the c4-pawn, and White regains it with long-term pressure on the queenside and the long light-square diagonal.",
    "Catalan Opening: Closed":
        "Black keeps the tension by supporting d5, leading to a slow strategic struggle for control of the light squares.",
}


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL env var is required")
    database_url = re.sub(r"^postgresql\+[^:]+://", "postgresql://", database_url)

    conn = connect(database_url, row_factory=dict_row)
    try:
        updated = 0
        with conn.cursor() as cur:
            for name, text in BASE_TEXT.items():
                cur.execute(
                    "update openings set description = %s where name = %s",
                    (text, name),
                )
                updated += cur.rowcount
            for name, text in VARIATION_TEXT.items():
                cur.execute(
                    "update openings set description = %s where name = %s",
                    (text, name),
                )
                updated += cur.rowcount
        conn.commit()
        print(f"Updated {updated} rows ({len(BASE_TEXT)} base + {len(VARIATION_TEXT)} variation keys attempted).")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
