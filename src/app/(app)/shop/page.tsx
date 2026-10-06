import type { Metadata } from "next";
import { Shop } from "@/components/shop";
import { requireUser, userToday } from "@/lib/dal";
import { getRewards } from "@/lib/data";

export const metadata: Metadata = { title: "Rewards shop" };

export default async function ShopPage() {
  const user = await requireUser();
  const { rewards, history } = await getRewards(user._id);
  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Rewards shop</h1>
        <p className="text-sm text-muted">Spend the coins you earn on treats you set yourself.</p>
      </div>
      <Shop rewards={rewards} history={history} coins={user.coins} today={userToday(user)} />
    </>
  );
}
