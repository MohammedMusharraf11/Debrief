import PageHeader from "@/components/ui/PageHeader";
import VisitForm from "@/components/visit/VisitForm";

export default function LogPage() {
  return (
    <>
      <PageHeader eyebrow="Field capture" title="Log a visit">
        Fast structured metadata, field notes, and media in one flow.
      </PageHeader>
      <VisitForm />
    </>
  );
}
