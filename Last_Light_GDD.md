# LAST LIGHT

## Game Design Document

*A lighthouse keeper's vigil against the dark.*

**Version 1.0 — March 2026**

---

## 1. Vision

### 1.1 Logline

You are a lighthouse keeper on a dark coast. Your beam is your only tool. Aim it to guide ships to safety and hold back what moves beneath the surface. You can only illuminate one direction at a time, and the night is full of competing demands.

### 1.2 The Elevator Pitch

Last Light is a real-time triage game played almost entirely in darkness. The player controls a lighthouse beam, the sole source of light on a black ocean, sweeping it to guide arriving ships into harbor and repel creatures that rise from the deep. The core tension: the beam can only point one direction at once. Every choice to look here is a choice not to look there. Ships you ignore crash. Creatures you ignore reach the shallows. The night always brings more than you can handle.

Across 21 nights, the player masters the beam, confronts escalating threats, and pieces together a story told entirely through what the light reveals. There is no exposition. There is no narrator. There is only the beam, the dark, and the things that move through it.

### 1.3 Design Pillars

- **Darkness as design.** 95% of the screen is dark at any given moment. Information scarcity is the core mechanic, not a visual gimmick.
- **Triage, not combat.** The player never destroys anything. They manage competing demands with a single limited tool. The interesting decisions are about what to sacrifice, not what to attack.
- **The world is the HUD.** No score counters, health bars, or fuel gauges. Every piece of feedback is communicated through the state of the beam, the behavior of ships, and the condition of the coastline.
- **Narrative through mechanics.** The story emerges from play. What the light reveals, night after night, assembles a picture the player constructs themselves. No cutscenes. No dialogue trees.

### 1.4 Target Platform and Audience

Single HTML5 Canvas file. Playable in any modern browser, desktop or mobile. Keyboard and mouse primary, touch input supported. 45–60 minute campaign length. Target audience: players who loved Papers Please, Return of the Obra Dinn, Lucas Pope's work generally, and atmospheric indie titles that treat restraint as a feature.

---

## 2. Core Mechanic: The Beam

The beam is the entire game. If this doesn't feel right, nothing else matters. Every other system is downstream of how it feels to sweep a cone of light across dark water.

### 2.1 Control Scheme

**Mouse / Touch (Primary)**

The beam rotates to follow the cursor or touch point, but with eased rotation governed by a maximum angular velocity. The beam sweeps toward the target rather than snapping. The gap between where the player points and where the beam currently aims is where the skill expression lives. Think of it like steering a heavy spotlight: responsive enough to feel connected, weighted enough to demand planning.

**Keyboard (Alternative)**

Left and Right arrow keys rotate the beam. Hold to sweep continuously, tap for fine adjustments. The same momentum physics apply underneath. Spacebar activates Overdrive.

### 2.2 Beam Physics

**Sweep Momentum**

The beam has angular inertia. Initiating a sweep from rest requires a brief acceleration phase. Reversing direction involves deceleration followed by re-acceleration. This prevents the player from vibrating the beam to cover everything at once. Short corrections feel snappy; large sweeps feel heavy and committed. The difference mirrors the physical feeling of flicking a wrist versus turning one's whole body.

**The Cone of Light**

The beam projects as a cone, not a line. Close to the lighthouse, it is bright and narrow, revealing sharp detail: ship types, creature species, hull markings. At far range, it widens and dims, showing only silhouettes and vague motion. This creates a natural depth-of-information gradient from a single input. A sweep gives the player layered data: precise intelligence up close, early warnings at distance.

**Beam Strength and Fuel**

The beam draws from a fuel reserve that depletes during use and regenerates slowly. Fuel state is communicated entirely through the beam's visual and audio properties (see Section 6: Feedback). At full fuel, the cone is wide, warm, and bright. At low fuel, it narrows, flickers, and shifts to a colder yellow. The player reads fuel intuitively, without ever checking a meter.

**Overdrive**

A secondary input (Spacebar or dedicated button) temporarily focuses the beam into a tight, intense column. Overdrive reaches further, repels creatures instantly, and is the only tool effective against Abyssals. It drains fuel rapidly and covers almost no angular width. Overdrive is the panic button, the sniper shot, and the resource gamble rolled into one. Using it means the rest of the night plays out with a weaker beam.

### 2.3 Skill Expression

The skill ceiling is rhythmic, not reflexive. Expert players develop a personal sweep pattern: a steady rotation with deliberate pauses at high-priority angles, broken by sharp corrections when threats appear. Beginners chase every stimulus reactively. Experienced players read far-range silhouettes and pre-position. The journey from novice to expert mirrors the difference between a drummer who keeps time and one who owns the groove.

---

## 3. Entity Taxonomy

Every entity in the water creates a distinct decision shape for the player. If two entities demand the same response from the beam, one of them is redundant. The roster is designed so that each member occupies a unique mechanical niche, and the compelling gameplay emerges from their combinations.

### 3.1 Ships (Things You're Saving)

#### The Merchant

*Slow, heavy, high-value. The escort mission of every night.*

Requires sustained beam contact to follow the safe channel into harbor. If the beam pulls away, it drifts and stalls. Too long without light, it runs aground. Forces the player to commit the beam in one direction for an uncomfortable duration.

**Beam demand:** Sustained hold. High opportunity cost.

#### The Skiff

*Small, fast, comes in groups. The plate-spinning challenge.*

Needs only a brief flash of light to orient, then sails independently for a short window. Arrives in clusters of 3–5. Each needs periodic re-flashing or it scatters off course. Forces the player into a rhythmic sweep pattern, returning to each skiff before it drifts.

**Beam demand:** Rapid intermittent flashes. Punishes tunnel vision.

#### The Passenger Vessel

*Medium speed, rare. The moral weight.*

Mechanically similar to a merchant in beam requirements. No extra difficulty, but losses carry heavier narrative consequences in the dawn debrief. The game tracks whether the player prioritizes passenger vessels over higher-scoring merchants.

**Beam demand:** Moderate sustained contact. Tests the player's values, not their reflexes.

#### The Ghost Ship

*Derelict. Empty. A strategic wrinkle.*

Appears mid-night. Looks like a normal ship at far range until the beam reveals it up close: no crew, no lights. Cannot be "saved" (there is nothing to save), but attracts creatures to cluster around it. The player must decide: spend beam time keeping the cluster contained, or ignore it and handle scattered creatures individually.

**Beam demand:** Optional sustained attention. A resource allocation puzzle.

### 3.2 Creatures (Things in the Dark)

Creatures are environmental pressure, not enemies. The beam repels them; it does not destroy them. They are the weather that shapes the player's decisions.

#### The Lurker

*Slow, persistent, foundational. The baseline grammar.*

Moves slowly toward ships or the shallows. Flees when illuminated. Returns after a few seconds. A single Lurker is trivial. Five Lurkers from different angles during a Merchant escort is a crisis. Teaches the core interaction: light pushes things away.

**Beam response:** Brief contact. Low individual threat, high aggregate pressure.

#### The Flinch

*Fast, erratic. The commitment punisher.*

Darts in from screen edges in bursts. Freezes when the beam touches it, but only momentarily. The instant the beam moves away, it bolts forward again. Requires frequent re-illumination. Punishes the player who stays locked on one target too long. A timer on every commitment.

**Beam response:** Frequent brief contact. Disrupts sustained escort patterns.

#### The Mimic

*Disguised. The attention tax.*

Moves like a Skiff at far range. Indistinguishable from a real ship in the dim outer cone. When illuminated up close, revealed as a creature. The player has wasted sweep time reaching it. Over time, expert players learn subtle movement-pattern differences to identify Mimics at range.

**Beam response:** None needed (once identified). Costs the player's scarcest resource: time.

#### The Abyssal

*Massive, slow, unstoppable by normal means. The resource crisis.*

Huge silhouette, visible even at far range. Does not flee from standard beam contact. Only driven back by Overdrive, which drains fuel heavily. Appearance forces a strategic calculation: when to spend the fuel, and what to sacrifice while the beam recovers.

**Beam response:** Overdrive only. Turns the rest of the night into a low-fuel survival scenario.

#### The Shade

*Targets the lighthouse itself. The tool-threat.*

Ignores ships entirely. Moves toward the lighthouse base. If it reaches the lighthouse, the beam flickers and weakens for a duration. The only entity that threatens the player's instrument rather than their objective.

**Beam response:** Standard beam contact (drives it back). Forces the player to aim at their own feet.

### 3.3 Environmental Events

These rotate into nights to modify the base rules. They never appear every night; their intermittence keeps the loop from becoming predictable.

#### Fog Bank

*A region of the water becomes opaque.*

Beam range drops sharply inside the fog zone. Ships and creatures within it are invisible until dangerously close. Forces the player to over-allocate attention to the affected area at the expense of clear zones.

#### Storm Swell

*Waves push all ships off course periodically.*

Even well-escorted ships get shoved sideways, requiring re-acquisition and re-guidance. Increases the tempo of the entire night. More corrections per minute.

#### Red Tide

*The water glows faintly with bioluminescence.*

The player can see further without the beam. Creatures are also more aggressive and better at locating ships. The information advantage cuts both ways.

#### New Moon

*Total ambient darkness.*

The beam's far-range dim cone is nearly useless. Everything is close-range identification only. The most claustrophobic, intense nights.

### 3.4 Combinatorics

The design's depth comes from entity pairings, not from individual complexity. Key combinations that create emergent decision pressure:

- **Merchant + Flinches:** "I need to hold steady AND keep flashing around." Competing beam rhythms.
- **Skiff cluster + Mimic:** "Which of these shapes is real?" Identification under time pressure.
- **Abyssal + Shades:** "Do I spend Overdrive on the big threat or protect my lighthouse?" Resource allocation fork.
- **Ghost Ship + Lurkers + Fog:** "There's a cluster forming somewhere I can't see clearly." Blind strategic planning.
- **Passenger Vessel + anything:** "Do I let the higher-scoring target go to save the one that matters more to me?" Values under pressure.

---

## 4. Campaign Structure

21 nights. Three weeks. Each week has a distinct mechanical identity and narrative tone. The campaign runs 45–60 minutes total, with each night lasting 2–3 minutes of real-time play.

### 4.1 Week One: The Routine (Nights 1–7)

**Mechanical Role**

Tutorial through play. Entities are introduced one or two at a time. By Night 7, the player has encountered the full basic roster (Skiffs, Merchants, Lurkers, Flinches) and faced their first genuine triage scenario.

**Narrative Layer**

Between nights, the player reads brief journal entries from a previous lighthouse keeper. These begin mundane: weather observations, ship counts, maintenance notes. Small oddities accumulate. A reference to sounds from the north channel. A scratched-out line. An entry that reads only: "Still there."

**Tone**

Lonely but calm. The sea is dangerous but manageable. The player feels competent. The darkness is vast but not hostile. Yet.

### 4.2 Week Two: The Deterioration (Nights 8–14)

**Mechanical Role**

Full roster deployed. Environmental events begin. Mimics and Ghost Ships enter. Nights are 15–20% longer in real time (gradual enough to avoid conscious detection). This is where most players will experience their first truly bad night, losing multiple ships and feeling the weight of it.

**Narrative Layer**

The previous keeper's journal entries become erratic. Longer gaps between dates. Handwriting deteriorates (represented through visual font and spacing changes). References to a "bargain." Mentions of a second lighthouse, further up the coast, that went dark.

**The Whisper System**

Starting around Night 10, when the beam passes over empty water, brief text fragments occasionally float up from the darkness. A word or two, ambient and easy to miss during active play. Players who pay attention across multiple nights begin assembling fragments of a message. The darkness is trying to communicate. What it's saying depends on how many fragments the player collects.

**Tone**

Something is wrong. The lighthouse shows wear between nights: cracks in stonework, a flicker in the lens. The competence of Week One erodes. The player is no longer comfortable.

### 4.3 Week Three: The Reckoning (Nights 15–21)

**Mechanical Role**

Abyssals and Shades enter. Environmental events layer on top of complex entity mixes. Night 18–19 is peak difficulty. Night 20 is a deliberate breather: calm sea, few threats, the narrative eye of the storm. Night 21 is the finale.

**Narrative Layer**

The journal entries stop. The previous keeper's last entry is a date and a single word. In their place, between-night scenes shift to vignettes from the player's own nights: a ship they saved arriving safely, the faces of people they couldn't save. The whisper fragments now form coherent phrases.

**Night 21: The Final Night**

Mechanically intense. Partway through, the beam fails completely. Total darkness. A few seconds of silence. Then a choice appears, the only explicit choice in the game:

> *Relight the beam. Continue the watch.*
>
> *Leave the lighthouse. Walk down to the shore.*

Both options lead to a final sequence. Neither is correct. The game tracks every decision across 21 nights and shapes the closing scene around accumulated play, not a binary fork.

---

## 5. The Keeper's Tools (Upgrades)

Upgrades are framed as maintenance and preparation, not power fantasy. The player is a keeper, not a hero. Between each night, one improvement is chosen from a set of two or three options.

| Upgrade | Category | Effect |
|---------|----------|--------|
| **Lens Polish** | Beam | Increases beam brightness. Far-range silhouettes become marginally clearer. A small, compounding advantage. |
| **Oil Reserve** | Fuel | Increases maximum fuel capacity. More Overdrive available per night. The savings-account pick. |
| **Fog Horn** | Ability | Active ability, long cooldown. Briefly reveals all entities in a wide radius without using the beam. Information without interaction. |
| **Storm Shutters** | Defense | Shades take longer to reach the lighthouse. Breathing room on the defensive front. |
| **Spyglass** | Scouting | Tap to briefly zoom the beam into a long, narrow view. Identify far-range silhouettes without committing to a full sweep. |
| **Log Book** | Strategy | Between nights, review a map of where ships were lost and creatures appeared. No in-game benefit; helps the player plan sweep priority. |

Across 20 upgrade opportunities, with binary or triple choices each dawn, no two playthroughs produce the same loadout. A Fog Horn + Spyglass keeper plays an information-rich, fuel-scarce game. An Oil Reserve + Storm Shutters keeper plays a durable, resource-heavy game. This is a primary replayability lever.

---

## 6. Feedback and Scoring

No HUD. The world is the interface. Every piece of performance data is communicated through the state of entities the player is already watching.

### 6.1 Beam State (Fuel Communication)

- **Full fuel:** Warm amber, wide cone, visible particles, confident mechanical hum.
- **75%:** Slightly cooler tone. Barely perceptible narrowing. Subconscious register.
- **50%:** Paler, thinner. Particle density drops. Hum develops a faint irregularity.
- **25%:** Visible flicker every few seconds. Labored grinding hum. Amber shifts toward cold yellow.
- **Critical:** Rapid flickering. Dramatic narrowing. Distressed electrical whine. The tool is dying.

### 6.2 Ship Behavior (Guidance Feedback)

- **Guided and safe:** Steady heading, lit lantern, regular fog horn. Reads as confidence.
- **Drifting:** Heading wobbles, lantern dims, horn becomes irregular and anxious.
- **In danger:** Significant drift off course. Lantern flickers. Rapid distress bell.
- **Lost:** Lists. Lantern extinguishes. Horn stops. Timber groans. Settles lower. Then silence where sound used to be.

### 6.3 The Harbor Glow

The harbor behind the lighthouse carries a warm amber glow that intensifies slightly with each safe arrival and dims with each loss. A soft chime marks each arrival. Wreckage accumulates near the rocks for each lost ship. The player can glance at the harbor at any moment for an instant aggregate read on the night's outcome, without any number being displayed.

### 6.4 Dawn Debrief

Dawn breaks with a slow gradient transition from deep blue to pale gold. The camera pulls back to reveal the full coastline in daylight. Ships at anchor in the harbor. Wreckage along the rocks. Damage to the lighthouse if Shades reached it. A handwritten-style journal entry is generated from the night's actual events, assembled from templated fragments:

> *"Night 7. Four vessels guided safe. The merchant out of Hallow Bay ran aground on the north rocks. Fog made the eastern channel blind after midnight. Something large passed through but did not surface."*

Below the tally, the upgrade selection appears, framed as practical preparations: "The lens needs cleaning." "There's oil in the supply shed."

### 6.5 The Keeper's Record (End of Campaign)

After Night 21, the player receives a single-page summary styled as an aged ledger. Contents:

- **Header:** Lighthouse name, dates (Night 1–21), keeper's name (player-entered or default).
- **The Tally:** Ships guided and lost by type, expressed as a phrase: "Of forty-three vessels that sought the light, thirty-seven found harbor."
- **The Night Map:** 21-cell grid, each shaded from pale gold (perfect) to deep red-black (catastrophic). Shows the campaign's shape at a glance.
- **The Whisper:** The assembled message if enough fragments were collected, or: "Something spoke from the water. You did not hear it all."
- **The Final Line:** A one-sentence summation shaped by the ending choice and overall performance. Rendered as a shareable image.

---

## 7. Visual Identity

### 7.1 Art Direction: Drowned Romanticism

Not pixel art. Not neon. Not minimalist. The game should evoke Turner seascapes swallowed by night. Painterly, atmospheric, with the beam cutting through like the only honest thing in the frame. Reference points are Winslow Homer's storm paintings, Eddystone Lighthouse illustrations, Caspar David Friedrich's figures dwarfed by vast nature.

### 7.2 The Palette

| Element | Hex | Description |
|---------|-----|-------------|
| **Dark Water** | `#0A1628` | Deep desaturated blue-green. Animated with subtle noise to suggest movement. |
| **Deep Sky** | `#060D1A`–`#0F1B33` | Gradient from horizon (lighter) to overhead (darker). A few faint stars. No moon. |
| **Lighthouse Stone** | `#3A3530` | Warm gray with amber undertones. The only warm-toned solid object. Rough, textured edges. |
| **Creature Dark** | `#12081A` | Warmer, more purple-black than the water. Subliminally "wrong." Distinct before conscious recognition. |
| **Wreckage** | `#4A3828` | Desaturated brown-amber. Driftwood and damage look like bruises on the water. |
| **The Beam** | `#FFCC44`→`#FFF8E0` | Warm amber-gold at source, pale yellow-white at edges. Soft feathered cone with visible light scatter. |

### 7.3 Key Visual Principles

- **The darkness breathes.** Perlin noise animated slowly across the water surface. Occasional ambient events (distant heat lightning, bioluminescent plankton trails). The dark is a substance, not an absence.
- **The beam is volumetric.** Not a flat triangle. Brighter center, dimmer edges, particles floating through it, a bright ellipse where it meets the water surface.
- **Entities emerge gradually.** Nothing pops in. Ships and creatures resolve through a gradient: far range shows shapes and motion, mid range shows silhouettes, close range reveals detail and identity.
- **Everything moves like water.** Ships lean into corrections. Creatures undulate with vertex displacement. The beam has micro-tremor oscillation. Sinking ships list and settle over several seconds.

### 7.4 Screen Composition

The lighthouse sits at screen bottom-center. The beam fans outward and upward. The sea extends above and to the sides. This inverted orientation places the safe zone at the bottom and danger above, creating a persistent "looking up into the dark" feeling. The player's eye rests on the lighthouse and must deliberately venture outward.

---

## 8. Audio Design

### 8.1 Core Principle: No Music During Gameplay

The silence is the point. Music would fill the space that tension occupies. The player needs to hear the dark. All gameplay audio is diegetic or procedurally generated via the Web Audio API. No external files.

### 8.2 The Ambient Bed

- **Water:** Constant layered sound. Low ocean rumble underneath, closer lapping against lighthouse stone, occasional deep swell groans.
- **Wind:** Variable intensity tied to weather events. Whistles when strong, murmurs when calm.
- **Lighthouse mechanism:** A rhythmic mechanical pulse, the game's heartbeat. Confident thrum at full power, stuttering whine at low fuel.

### 8.3 Entity Audio Cues

- **Merchants:** Deep, resonant fog horn at regular intervals.
- **Skiffs:** Quick, high bell.
- **Passenger vessels:** Distant whistle.
- **Lurkers:** Silent. Only displaced water sound.
- **Flinches:** Quick, wet darting sound.
- **Abyssals:** Deep sub-audible vibration. Felt more than heard.
- **Shades:** Whispers. The same fragments from the narrative system. The story approaching.

### 8.4 Impact Audio

- **Beam on water:** Soft warm hiss. Campfire comfort.
- **Beam on ship:** Gentle chime. "I see you. Follow me."
- **Beam on creature:** Sharp discordant tone. Unpleasant in a satisfying way.
- **Ship arriving safely:** Distant, barely audible cheer. Almost imagined.
- **Ship sinking:** Timber creak and groan. Then silence where the horn used to be.
- **Overdrive activation:** Rising electrical whine, then sustained high-pitched beam. Powerful and unsettling.

### 8.5 Between-Night Audio

Soft, sparse piano. Three or four notes. Not a melody, just presence. Warmth after cold. The only music in the game. Its rarity gives it weight.

### 8.6 The Final Night

When the beam fails, all sound cuts except the ocean. Ten seconds of water and nothing else. Then, whatever comes next.

---

## 9. Technical Specification

### 9.1 Platform

Single self-contained HTML file. HTML5 Canvas rendering. Vanilla JavaScript. No external dependencies. Playable in any modern browser.

### 9.2 Rendering

- **Target framerate:** 60fps with requestAnimationFrame and fixed-timestep delta-time game loop.
- **Resolution:** Responsive canvas scaling. Internal resolution ~1280x720, scaled to display.
- **Light cone rendering:** Radial gradient with noise-based edge softening. Canvas globalCompositeOperation for volumetric layering.
- **Darkness:** Full-screen dark layer with the beam cone subtracted via compositing. Perlin noise overlay for water surface animation.
- **Entity rendering:** Procedural shapes with vertex displacement for organic movement. No sprite sheets.

### 9.3 Audio

All sound generated via Web Audio API. Oscillators for tonal sounds (horns, chimes, mechanical hum). Noise buffers for ambient (water, wind). Gain envelope shaping for all transient sounds. No external audio files.

### 9.4 State Management

- **Game states:** Title, Night (gameplay), Dawn (debrief/upgrade), Finale, Keeper's Record.
- **Campaign persistence:** Progress saved to localStorage between sessions. Full campaign state serialized as JSON.
- **Entity management:** Object pooling for frequently spawned entities (creatures, particles). Array-based entity system with type flags.

### 9.5 Input

- **Mouse:** Cursor position drives target beam angle. Click or hold for Overdrive.
- **Keyboard:** Arrow keys for beam rotation. Spacebar for Overdrive.
- **Touch:** Touch position drives target beam angle. Two-finger tap for Overdrive.

---

*The light held. The coast remembers.*
