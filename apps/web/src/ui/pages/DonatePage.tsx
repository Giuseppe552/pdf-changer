import React from "react";
import { NavLink } from "react-router-dom";
import { donateAddresses } from "../../content/donate/addresses";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Surface } from "../components/Surface";

const STRIPE_ONE_TIME_URL = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  .VITE_DONATE_STRIPE_ONE_TIME_URL;
const STRIPE_MONTHLY_URL = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  .VITE_DONATE_STRIPE_MONTHLY_URL;

function DonateLink({
  href,
  label,
}: {
  href: string | undefined;
  label: string;
}) {
  if (!href) {
    return <Button disabled>{label} (not configured)</Button>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button>{label}</Button>
    </a>
  );
}

function CryptoAddress({
  network,
  symbol,
  address,
  note,
}: {
  network: string;
  symbol: string;
  address: string;
  note?: string;
}) {
  return (
    <Surface compact className="bg-neutral-50">
      <div className="flex items-center justify-between gap-2">
        <div className="text-base font-semibold text-neutral-900">
          {network} ({symbol})
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(address)}
          className="rounded-sm border border-neutral-400 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
        >
          Copy
        </button>
      </div>
      <div className="mt-2 break-all border border-neutral-300 bg-white p-3 font-mono text-sm text-neutral-900">
        {address}
      </div>
      {note ? <div className="mt-2 text-sm text-neutral-600">{note}</div> : null}
    </Surface>
  );
}

export function DonatePage() {
  React.useEffect(() => {
    document.title = "Donate · PDF Changer";
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="ui-title">Donate</h1>
        <p className="ui-subtitle max-w-3xl">
          Donations keep security guidance free and maintenance steady, without
          ads, trackers, or paywalled safety basics.
        </p>
      </div>

      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-neutral-800">
          Donation pages do not load analytics scripts or wallet-connect code.
          Verify addresses before sending.
        </div>
      </Surface>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Card donation (Stripe)">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <DonateLink href={STRIPE_ONE_TIME_URL} label="One-time donation" />
              <DonateLink href={STRIPE_MONTHLY_URL} label="Monthly donation" />
            </div>
            <div className="text-sm text-neutral-600">
              Stripe handles card processing.
            </div>
          </div>
        </Card>

        <Card title="Crypto donation">
          <div className="space-y-3">
            {donateAddresses.map((address) => (
              <CryptoAddress key={address.symbol} {...address} />
            ))}
            <div className="text-sm text-neutral-700">
              Verify addresses on the{" "}
              <NavLink className="underline" to="/donate/proof">
                signed proof page
              </NavLink>
              .
            </div>
          </div>
        </Card>
      </div>

      <Card title="Trust links">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-neutral-800">
          <NavLink className="underline" to="/donate/proof">
            Address proof center
          </NavLink>
          <NavLink className="underline" to="/donate/proof/archive">
            Proof archive
          </NavLink>
          <NavLink className="underline" to="/donate/transparency">
            Transparency reports
          </NavLink>
          <NavLink className="underline" to="/security/policy">
            Defensive-only policy
          </NavLink>
        </div>
      </Card>
    </div>
  );
}
