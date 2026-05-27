import {
  getManualInputWiringByEngine,
  getManualInputWiringContract,
  MANUAL_INPUT_ENGINE_GROUPS,
  MANUAL_INPUT_WIRING_PHASE,
} from "@/lib/company-workspace/manualInputsEngineWiringContract";

export function ManualInputsWiringContractPanel() {
  const contract = getManualInputWiringContract();
  const wiredCount = contract.filter((f) => f.allowedForFutureEngineWiring).length;
  const persistableCount = contract.filter((f) => f.persistable).length;

  return (
    <article className="card manualInputSection manualInputSectionFull manualInputWiringContract">
      <h3 className="cardTitle">Engine wiring contract (documentation)</h3>
      <p className="cardMeta manualInputSectionDesc">
        Phase <code>{MANUAL_INPUT_WIRING_PHASE}</code>: <strong>current price</strong> and{" "}
        <strong>required MOS</strong> are <code>market_overlay_wired</code> (MOS + Dashboard only). All
        other persistable fields remain <code>not_wired_yet</code> for the valuation chain.
      </p>
      <p className="cardMeta">
        {contract.length} contract fields · {persistableCount} persistable on Save · {wiredCount}{" "}
        allowlisted for <em>future</em> engine wiring · Valuation tab uses base company + foundation
        cache unchanged.
      </p>

      <div className="manualInputWiringGroups">
        {MANUAL_INPUT_ENGINE_GROUPS.map((group) => {
          const fields = getManualInputWiringByEngine(group);
          if (fields.length === 0) return null;

          const futureAllowed = fields.filter((f) => f.allowedForFutureEngineWiring).length;

          return (
            <details key={group} className="manualInputWiringGroup">
              <summary className="manualInputWiringGroupSummary">
                {group}
                <span className="manualInputWiringGroupMeta">
                  {fields.length} fields · {futureAllowed} future-allowed · status: not_wired_yet
                </span>
              </summary>
              <ul className="manualInputWiringFieldList">
                {fields.map((field) => (
                  <li key={field.fieldKey} className="manualInputWiringFieldRow">
                    <span className="manualInputWiringFieldLabel">{field.label}</span>
                    <code className="manualInputWiringFieldKey">{field.fieldKey}</code>
                    <span className="manualInputWiringFieldTarget">{field.engineTarget}</span>
                    {field.status === "market_overlay_wired" ? (
                      <span className="badge badgeGreen">market overlay wired</span>
                    ) : field.allowedForFutureEngineWiring ? (
                      <span className="badge badgeBlue">future allowlist</span>
                    ) : (
                      <span className="badge badgeYellow">display / notes</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </article>
  );
}
