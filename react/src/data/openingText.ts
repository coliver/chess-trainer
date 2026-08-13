// Descriptive text for openings shown in the dashboard preview panel.
//
// The backend seed (eco / name / pgn) ships no descriptions, so we supply them
// here on the frontend. Resolution order for any opening:
//   1. the DB `description` field, if it is ever populated (it wins);
//   2. an authored blurb for the base opening (BASE_TEXT below);
//   3. a factual fallback built from the name, so every opening shows text.
//
// The authored map covers the common base openings; add entries freely — the
// key is the base name (text before the first colon).
import type { Opening } from "../pages/Dashboard";
import { baseNameOf, variationLabelOf } from "../lib/groupOpenings";

const BASE_TEXT: Record<string, string> = {
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
};

/** A short, non-empty, non-fabricated description for any opening. */
export function describeOpening(o: Opening): string {
  const dbText = o.description?.trim();
  if (dbText) return dbText;

  const base = baseNameOf(o.name);
  const authored = BASE_TEXT[base];
  const label = variationLabelOf(o.name);

  if (label === "Main line") {
    return authored ?? `${base} (${o.eco}) — a recognised chess opening.`;
  }
  const lead = `${label} — a variation of the ${base}.`;
  return authored ? `${lead} ${authored}` : lead;
}
