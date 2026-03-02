import React from "react";
import {
  enableNoTrace,
  disableNoTrace,
  isNoTraceMode,
} from "../../utils/noTrace";

type NoTraceState = {
  isNoTrace: boolean;
  toggleNoTrace: () => void;
};

const NoTraceContext = React.createContext<NoTraceState>({
  isNoTrace: false,
  toggleNoTrace: () => {},
});

export function useNoTrace(): NoTraceState {
  return React.useContext(NoTraceContext);
}

export function NoTraceProvider({ children }: { children: React.ReactNode }) {
  const [isNoTrace, setIsNoTrace] = React.useState(isNoTraceMode);

  const toggleNoTrace = React.useCallback(() => {
    if (isNoTraceMode()) {
      disableNoTrace();
      setIsNoTrace(false);
    } else {
      enableNoTrace();
      setIsNoTrace(true);
    }
  }, []);

  return (
    <NoTraceContext.Provider value={{ isNoTrace, toggleNoTrace }}>
      {children}
    </NoTraceContext.Provider>
  );
}
