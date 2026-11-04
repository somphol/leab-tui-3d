# Rules of เลี๊ยบตุ่ย (Leab-Tui)

This is the rule contract for the studio. The code, the rules modal and the self-test are expected to agree with this document. If you change one, change all three.

## Source and scope

The rules are modelled on **Navee Angsuputiphant, “กฏกติกาการเล่น เลี๊ยบตุ่ย” (22 March 2016)**, <http://naveea.blogspot.com/2016/03/blog-post.html>. That article describes the four-player game in detail and mentions two- and three-player variants. This studio implements the **four-player game only**.

The source is a community description, not an official tournament code. It is ambiguous in two places:

1. **Ngoh Hoo (five-tile straight).** The article says a Sa Hoo core is extended by “the paired tiles”; it does not spell out whether both extra tiles must duplicate core ranks. This studio requires **two distinct core ranks to be doubled** (e.g. General + two Advisors + two Elephants). A three-of-a-kind extension is not a straight.
2. **Lak Hoo (six-tile straight).** The article names only “Chariot pair + Horse pair + Cannon pair”. This studio requires all six tiles to be **one colour**, consistent with every other straight. It also treats colour as the only comparison for Lak Hoo because the rank pattern is fixed.

Both choices are visible in `docs/TESTING.md` and in the in-app rules drawer.

## Equipment

A Chinese chess set has 32 tiles. Each colour has:

| Rank | Red Hanzi | Black Hanzi | Copies per colour | Thai name |
| --- | --- | --- | --- | --- |
| General (7) | 帥 | 將 | 1 | ตี่ |
| Advisor (6) | 仕 | 士 | 2 | บิน / สือ |
| Elephant (5) | 相 | 象 | 2 | ช้าง / เฉียว |
| Chariot (4) | 俥 | 車 | 2 | กือ / เรือ |
| Horse (3) | 傌 | 馬 | 2 | เบ๊ / ม้า |
| Cannon (2) | 炮 | 包 | 2 | เผ่า |
| Soldier (1) | 兵 | 卒 | 5 | จุก |

16 red + 16 black = 32. Four players take eight tiles each.

## Hierarchy

```text
General > Advisor > Elephant > Chariot > Horse > Cannon > Soldier
```

At equal rank, **red beats black**. If rank and colour are both equal, the **earlier play keeps the trick**; a later identical set cannot overtake it.

The hierarchy applies to rank-based sets. Straight sets and same-rank Soldier sets have their own comparison rules below.

## Calls and combinations

The leader chooses one call and plays a matching set face-up.

| Call | Thai | Count | Shape |
| --- | --- | --- | --- |
| Leab | เลี๊ยบ | 1 | Any single tile |
| Tui | ตุ่ย | 2 | Two identical tiles: same rank **and** colour. Generals cannot pair (one copy per colour) |
| Sam Juk | ซาจุก | 3 | Three Soldiers of one colour |
| Si Juk | สี่จุก | 4 | Four Soldiers of one colour |
| Ha Juk | ห้าจุก | 5 | All five Soldiers of one colour |
| Sa Hoo | ซาฮู้ | 3 | One colour, either **big** `General–Advisor–Elephant` or **small** `Chariot–Horse–Cannon` |
| See Hoo | สี่ฮู้ | 4 | Sa Hoo plus one duplicate of a core rank. The duplicated pair decides |
| Ngoh Hoo | ห้าฮู้ | 5 | Sa Hoo with two distinct core ranks doubled. The higher pair decides, then the second |
| Lak Hoo | หลักฮู้ | 6 | Small core with all three ranks doubled: `Chariot×2 + Horse×2 + Cannon×2`, one colour |

### Comparison keys

| Type | Compare, in order |
| --- | --- |
| Leab | rank, then colour |
| Tui | rank, then colour |
| Sam/Si/Ha Juk | count is fixed by the call; colour only (all are Soldiers) |
| Sa Hoo | big > small, then colour |
| See Hoo | duplicated rank, then colour |
| Ngoh Hoo | higher duplicated rank, then lower duplicated rank, then colour |
| Lak Hoo | colour only |

A set only competes if it matches the **called type**. A pair cannot beat a single; a Sa Hoo cannot beat a See Hoo.

## How a trick runs

1. The leader calls a type and plays a legal set of that type face-up.
2. Every other player, in clockwise order, sends **exactly the same number of tiles**, face-down.
3. The leader's set is revealed first and is the current best.
4. In turn, each player may reveal a legal set of the called type that **strictly beats** the current best. If they cannot or choose not to, their tiles stay face-down.
5. The highest revealed set wins all `4 × N` tiles. Unrevealed tiles never compete, even if they could have won.
6. The winner leads the next trick.

In this studio the human selects the required number of tiles and chooses **Reveal & challenge** or **Play face-down**. The AI follows the same rule. The leader must be able to form the called set.

### First lead and next round

- The holder of the **red General** leads the opening trick.
- The winner of a trick leads the next.
- After a round, the tiles are reshuffled and dealt again; the winner of the last trick leads the first trick of the next round.

## Scoring

Each captured group of four tiles is a **pile**. At the end of a round:

| Piles | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Points | −2 | −1 | **0** | +1 | +2 | +3 | +4 | +5 | **16** |

Two piles is par. Every pile above or below par is one point. Capturing all eight piles is a **Chuan (ช้วน)** worth 16 points. Scores accumulate across rounds; the first player to the match target (20 by default in this studio) wins.

Because every trick awards `4 × N` tiles, the four players' round points always sum to zero. The self-test asserts the 32-tile conservation and the scoring table.

## Digital table conventions

These are deliberate interface choices, not rule changes:

- You may always send tiles face-down, even when you hold a legal beating set. This preserves the bluffing and conservation core of the game.
- A set must be revealed to compete. The interface never auto-reveals for you.
- The leader must be able to form the called set. The UI disables **Lead** for illegal selections.
- **Hint** uses a deterministic version of the AI heuristic. It is advice, not an auto-play.
- **Undo trick** restores the position before the last trick and restarts it. It is a learning tool, not a competitive feature.
- The coach and inspector use the same `detectCombo` function as the engine, so their explanations cannot drift from the rules.

## Source citations

- Navee Angsuputiphant, “กฏกติกาการเล่น เลี๊ยบตุ่ย”, 22 March 2016. <http://naveea.blogspot.com/2016/03/blog-post.html>
- Thai Wikipedia, “หมากรุกจีน”, for the Xiangqi tile names and counts: <https://th.wikipedia.org/wiki/หมากรุกจีน>

## Licence and independence

This is an independent, open-source teaching implementation. It is not affiliated with any publisher, temple fair, gambling operator or standards body. The rule text above is original prose; the source is cited for the historical game.
