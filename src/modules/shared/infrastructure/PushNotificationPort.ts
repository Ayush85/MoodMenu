import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendPush } from "@/lib/push";

export type PushNotification = {
  title: string;
  body: string;
  userIds: string[];
  url?: string;
  data?: Record<string, string>;
};

type PushSender = (payload: PushNotification) => Promise<boolean>;
type ErrorLogger = (error: unknown) => void;

export class PushNotificationPort {
  constructor(
    private readonly sender: PushSender = sendPush,
    private readonly onError: ErrorLogger = (error) => {
      logger.error("push.notification_delivery_failed", { error });
    },
  ) {}

  async send(payload: PushNotification): Promise<void> {
    try {
      await this.sender(payload);
    } catch (error) {
      this.onError(error);
    }
  }

  async sendToRestaurant(input: Omit<PushNotification, "userIds"> & {
    restaurantId: string;
    excludeUserId?: string;
    staffRoles?: Array<"WAITER" | "COOK" | "CHEF">;
  }): Promise<void> {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: {
          ownerId: true,
          staffMembers: {
            where: {
              isActive: true,
              ...(input.staffRoles ? { role: { in: input.staffRoles } } : {}),
            },
            select: { id: true },
          },
        },
      });
      if (!restaurant) return;

      const userIds = [restaurant.ownerId, ...restaurant.staffMembers.map((staff) => staff.id)]
        .filter((id) => id !== input.excludeUserId);
      await this.send({
        title: input.title,
        body: input.body,
        userIds,
        url: input.url,
        data: input.data,
      });
    } catch (error) {
      this.onError(error);
    }
  }
}
