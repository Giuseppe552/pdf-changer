export type AccountPlan = "guest" | "free" | "paid";

export type MeResponse =
  | {
      authenticated: false;
      plan: "guest";
      entitlementExpiresAt: string | null;
      entitlementToken: string | null;
    }
  | {
      authenticated: true;
      plan: "free" | "paid";
      entitlementExpiresAt: string | null;
      entitlementToken: string | null;
    };

export type CheckoutResponse = {
  url: string;
};

export type PortalResponse = {
  url: string;
};
