// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Game State
// ═══════════════════════════════════════════════════════════════

export const GameState = {
    TITLE: 0,
    PLAYING: 1,
    DAWN: 2,
    TRANSITION: 3,
    NIGHT_INTRO: 4,
    UPGRADE: 5,
    FINALE_DARK: 6,
    FINALE_CHOICE: 7,
    FINALE_END: 8,
    KEEPERS_RECORD: 9,
    PAUSED: 10,
};

export const campaign = {
    nightResults: [],
    upgrades: [],
    whispersCollected: [],
    finalChoice: null,
    totalSaved: 0,
    totalLost: 0,
};

export const nightStats = {
    saved: 0,
    lost: 0,
    merchantsSaved: 0,
    passengersSaved: 0,
    passengersLost: 0,
    creaturesRepelled: 0,
};

export function resetNightStats() {
    nightStats.saved = 0;
    nightStats.lost = 0;
    nightStats.merchantsSaved = 0;
    nightStats.passengersSaved = 0;
    nightStats.passengersLost = 0;
    nightStats.creaturesRepelled = 0;
}

export function resetCampaign() {
    campaign.nightResults = [];
    campaign.upgrades = [];
    campaign.whispersCollected = [];
    campaign.finalChoice = null;
    campaign.totalSaved = 0;
    campaign.totalLost = 0;
}

// ── Journal Entries ──
const JOURNAL_ENTRIES = [
    "Clear skies. Four vessels expected from the south. Lens cleaned, oil topped. Routine.",
    "Wind picking up from the northeast. The merchant from Harrow Bay arrived late. Noticed scratches on the eastern railing. Gulls, probably.",
    "Fog at dawn. Something scraped the rocks below during the night. Checked at first light\u2014nothing there. Tide marks higher than usual.",
    "The mechanism needs oiling. It groans when it turns past north-northwest. Heard the same sound from the water tonight. Coincidence.",
    "Something quick in the water. Not fish. Wrong movement. The beam caught it for a moment\u2014it stopped. Then I looked away.",
    "Can\u2019t sleep during the day anymore. The scratching is louder. Not gulls.",
    "The fog is wrong. Things move in it. I saw\u2014no. The lens needs cleaning.",
    "The lighthouse at Carden Point went dark three nights ago. No word from the keeper.",
    "The water speaks. I know how that sounds. But when the beam passes over open sea, there are words. Almost.",
    "Found the previous keeper\u2019s journal behind the mechanism housing. Most of it is weather. The last pages are the same sentence, over and over.",
    "The dark has weight now. It presses against the glass.",
    "They know my name. They should not know my name.",
    "Whispers from below. The beam holds them back. But for how long?",
    "Still here.",
    null, null,
];

export function getJournalEntry(nightIdx) {
    if (nightIdx < 13 && JOURNAL_ENTRIES[nightIdx]) {
        return JOURNAL_ENTRIES[nightIdx];
    }
    const result = campaign.nightResults[nightIdx];
    if (!result) return null;
    const total = result.saved + result.lost;
    if (total === 0) return 'A quiet night. Almost too quiet.';

    const phrases = [];
    if (result.saved > 0) phrases.push(`${result.saved} vessel${result.saved > 1 ? 's' : ''} guided safe`);
    if (result.lost > 0) phrases.push(`${result.lost} met the rocks`);
    if (result.passengersLost > 0) phrases.push('The passenger vessel did not make it');

    let entry = phrases.join('. ') + '.';
    const flavors = [
        ' The beam felt weaker tonight.',
        ' Something watched from the north channel.',
        ' The darkness presses closer each night.',
        ' I heard the horn of a ship that was not there.',
        ' The lighthouse groaned in the wind. Or not the wind.',
        ' Dawn took longer to arrive.',
        ' The water was unnaturally still afterward.',
    ];
    entry += flavors[nightIdx % flavors.length];
    return entry;
}

// ── Whisper System ──
export const WHISPER_FRAGMENTS = [
    'remember', 'the bargain', 'was made', 'before you',
    'the light', 'holds them', 'but calls', 'them too',
    'we chose', 'to stay', 'the dark', 'is not',
    'empty', 'it waits', 'it watches', 'with patience',
    'the shore', 'remembers', 'every keeper', 'every light',
    'that failed', 'and every', 'light that', 'held'
];

// ── Campaign Persistence ──
export function saveCampaign(nightNum) {
    try {
        localStorage.setItem('lastLight_campaign', JSON.stringify({
            nightNum, campaign,
            upgrades: campaign.upgrades,
        }));
    } catch(e) {}
}

export function loadCampaign() {
    try {
        const data = JSON.parse(localStorage.getItem('lastLight_campaign'));
        if (data && data.nightNum > 0 && data.nightNum < 15) {
            Object.assign(campaign, data.campaign);
            return data.nightNum;
        }
    } catch(e) {}
    return null;
}

export function hasSavedCampaign() {
    try {
        const data = JSON.parse(localStorage.getItem('lastLight_campaign'));
        return data && data.nightNum > 0 && data.nightNum < 15;
    } catch(e) {}
    return false;
}

export function clearSave() {
    try { localStorage.removeItem('lastLight_campaign'); } catch(e) {}
}
