export type LeaderboardEntry = {
  id: number;
  name: string;
  username: string;
  avatarUrl: string;
  tokens: number;
  appSeconds: number;
  country?: string;
};

const firstNames = [
  "Amelia",
  "Diego",
  "Liu",
  "Sofia",
  "Michael",
  "Noah",
  "Isabella",
  "Mateo",
  "Aisha",
  "Eva"
];

const lastNames = [
  "Torres",
  "Fernandez",
  "Wen",
  "Petrova",
  "Harris",
  "Johnson",
  "Okafor",
  "Yamamoto",
  "Khan",
  "Novak"
];

const topTokensBase = 18800;
const topTimeBaseSeconds = 19 * 3600 + 30 * 60; // 19h30m

const createAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/thumbs/png?seed=${encodeURIComponent(seed)}&size=128`;

export const fallbackLeaderboard: LeaderboardEntry[] = Array.from({ length: 100 }, (_, index) => {
  const rank = index + 1;
  const first = firstNames[index % firstNames.length];
  const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const name = `${first} ${last}`;
  const usernameSeed = `${first}${last}${rank}`.toLowerCase();
  const username = usernameSeed.replace(/[^a-z0-9]/g, "");
  const tokens = Math.max(850, Math.round(topTokensBase - rank * 110 + (index % 5) * 35));
  const appSeconds = Math.max(1200, topTimeBaseSeconds - rank * 95 + (index % 4) * 40);

  return {
    id: 1000 + rank,
    name,
    username,
    avatarUrl: createAvatarUrl(usernameSeed),
    tokens,
    appSeconds
  };
});
