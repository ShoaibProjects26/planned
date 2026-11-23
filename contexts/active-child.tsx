"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface ChildSummary {
  id: string;
  name: string;
  age: number | null;
  yearGroup: string | null;
  bloomStars: number;
  learningStyle: string | null;
  interests: string;
}

interface ActiveChildContextType {
  allChildren: ChildSummary[];
  activeChild: ChildSummary | null;
  setActiveChildId: (id: string) => void;
}

const ActiveChildContext = createContext<ActiveChildContextType>({
  allChildren: [],
  activeChild: null,
  setActiveChildId: () => {},
});

export function ActiveChildProvider({
  children,
  allChildren,
}: {
  children: ReactNode;
  allChildren: ChildSummary[];
}) {
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("planned:activeChildId");
    if (stored && allChildren.find((c) => c.id === stored)) {
      setActiveChildIdState(stored);
    } else if (allChildren.length > 0) {
      setActiveChildIdState(allChildren[0].id);
    }
  }, [allChildren]);

  const setActiveChildId = (id: string) => {
    setActiveChildIdState(id);
    localStorage.setItem("planned:activeChildId", id);
  };

  const activeChild =
    allChildren.find((c) => c.id === activeChildId) ?? allChildren[0] ?? null;

  return (
    <ActiveChildContext.Provider
      value={{ allChildren, activeChild, setActiveChildId }}
    >
      {children}
    </ActiveChildContext.Provider>
  );
}

export function useActiveChild() {
  return useContext(ActiveChildContext);
}
