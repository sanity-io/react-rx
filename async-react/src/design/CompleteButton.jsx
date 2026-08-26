import { CircleCheckBig } from "lucide-react";
import PendingButton from "./PendingButton.jsx";

export default function CompleteButton({ complete, action }) {
  /**
   * No useOptimistic here: the list this button renders already shows what the
   * user asked for, because the store merges intent into the data. The design
   * system still owns the delayed loading state, via PendingButton.
   * `action` takes the value the user asked for, like changeAction elsewhere.
   */
  return (
    <PendingButton action={() => action(!complete)}>
      {complete ? <CircleCheckBig className="text-chart-2" size={48} /> : <div />}
    </PendingButton>
  );
}
