import type { Project } from "../types";

/** Mock project records for development before the backend is integrated. */
export const mockProjects: Project[] = [
  {
    id: "1",
    name: "Production App",
    description: "Production environment secrets",
    secretCount: 12,
    updatedAt: "2026-06-01",
    color: "bg-blue-500",
  },
  {
    id: "2",
    name: "Staging Environment",
    description: "Staging and testing secrets",
    secretCount: 8,
    updatedAt: "2026-05-28",
    color: "bg-green-500",
  },
  {
    id: "3",
    name: "Development",
    description: "Local development secrets",
    secretCount: 15,
    updatedAt: "2026-06-02",
    color: "bg-purple-500",
  },
  {
    id: "4",
    name: "External APIs",
    description: "Third-party service credentials",
    secretCount: 6,
    updatedAt: "2026-05-30",
    color: "bg-orange-500",
  },
];
