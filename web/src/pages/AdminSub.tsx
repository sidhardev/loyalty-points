import { createContext, useContext, type ReactNode } from 'react';

// The admin sidebar splits a long page into subtabs (#/plans/health). The shell provides the open one;
// a page wraps each part in <Sub id> and only that part shows. Outside the admin (no subtab), everything shows.
export const SubtabContext = createContext<string | null>(null);

export function Sub({ id, children }: { id: string; children: ReactNode }) {
  const open = useContext(SubtabContext);
  return open === null || open === id ? children : null;
}
