import { BackLink } from "@/components/back-link";

export default function NewCompanyPage() {
  return (
    <section className="pageSection">
      <BackLink href="/companies" label="Back to Companies" />
      <div>
        <h2 className="sectionHeading">Create New Company</h2>
        <p className="sectionSubheading">
          Company creation workflow will be added in a future build phase.
        </p>
      </div>
      <div className="panel">
        <p>
          This phase only includes skeleton navigation and mock-data driven company
          pages.
        </p>
      </div>
    </section>
  );
}
