import { useOutletContext } from "react-router";
import type { LayoutContext } from "./AppLayout";

export function useLayoutContext() {
  return useOutletContext<LayoutContext>();
}
