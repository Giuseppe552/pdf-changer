import React from "react";
import { Card } from "../components/Card";
import { InlineCode } from "../components/InlineCode";

export function ContactPage() {
  React.useEffect(() => {
    document.title = "Contact · PDF Changer";
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Contact</h1>
      <Card title="Sensitive information">
        <p className="text-neutral-700">
          Please don’t send sensitive documents over contact channels. Use{" "}
          <InlineCode>/scrub</InlineCode> offline and share documents using a
          channel that fits your threat model.
        </p>
      </Card>
      <Card title="Support">
        <p className="text-neutral-700">
          Support channels are being set up. For billing, use the billing portal
          from <InlineCode>/pricing</InlineCode>.
        </p>
      </Card>
    </div>
  );
}

