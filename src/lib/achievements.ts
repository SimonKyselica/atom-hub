// Badge definitions, shared by server (unlocking) and client (display).

export type AchievementKey =
  | "first_commit"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "streak_365"
  | "contrib_100"
  | "contrib_500"
  | "contrib_1000"
  | "perfect_day"
  | "perfect_week"
  | "todo_1"
  | "todo_50"
  | "todo_250"
  | "level_5"
  | "level_10"
  | "level_20"
  | "first_reward"
  | "habits_5"
  | "quests_10"
  | "mastery_gold"
  | "freeze_saved";

export type Achievement = {
  key: AchievementKey;
  name: string;
  description: string;
  icon: string;
  coins: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  { key: "first_commit", name: "Initial Commit", description: "Complete a habit for the first time", icon: "🌱", coins: 10 },
  { key: "streak_3", name: "Warming Up", description: "Reach a 3-day streak on any habit", icon: "🕯️", coins: 15 },
  { key: "streak_7", name: "On Fire", description: "Reach a 7-day streak on any habit", icon: "🔥", coins: 30 },
  { key: "streak_30", name: "Unstoppable", description: "Reach a 30-day streak on any habit", icon: "⚡", coins: 100 },
  { key: "streak_100", name: "Centurion", description: "Reach a 100-day streak on any habit", icon: "💯", coins: 300 },
  { key: "streak_365", name: "Evergreen", description: "Reach a 365-day streak on any habit", icon: "🌳", coins: 1000 },
  { key: "contrib_100", name: "Green Squares", description: "Make 100 contributions", icon: "🟩", coins: 50 },
  { key: "contrib_500", name: "Prolific", description: "Make 500 contributions", icon: "📈", coins: 150 },
  { key: "contrib_1000", name: "Thousand Commits", description: "Make 1,000 contributions", icon: "🚀", coins: 300 },
  { key: "perfect_day", name: "Flawless", description: "Complete every scheduled habit in a day", icon: "🌟", coins: 20 },
  { key: "perfect_week", name: "Perfect Week", description: "Have 7 perfect days in a row", icon: "🏆", coins: 100 },
  { key: "todo_1", name: "Ticket Closed", description: "Complete your first todo", icon: "✅", coins: 10 },
  { key: "todo_50", name: "Issue Crusher", description: "Complete 50 todos", icon: "🔨", coins: 75 },
  { key: "todo_250", name: "Inbox Zero Hero", description: "Complete 250 todos", icon: "📭", coins: 200 },
  { key: "level_5", name: "Committer", description: "Reach level 5", icon: "⭐", coins: 50 },
  { key: "level_10", name: "Maintainer", description: "Reach level 10", icon: "🌠", coins: 150 },
  { key: "level_20", name: "Legend", description: "Reach level 20", icon: "👑", coins: 400 },
  { key: "first_reward", name: "Treat Yourself", description: "Redeem your first reward", icon: "🎁", coins: 0 },
  { key: "habits_5", name: "Architect", description: "Create 5 habits", icon: "🏗️", coins: 20 },
  { key: "quests_10", name: "Adventurer", description: "Complete 10 daily quests", icon: "🗺️", coins: 50 },
  { key: "mastery_gold", name: "Golden Habit", description: "Reach Gold mastery on a habit", icon: "🥇", coins: 100 },
  { key: "freeze_saved", name: "Ice Cold", description: "Let a streak freeze save your streak", icon: "🧊", coins: 10 },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.key, a])) as Record<
  AchievementKey,
  Achievement
>;
