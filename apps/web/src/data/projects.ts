import type { Project } from "@repo/shared";

/** Mock project records for development before the backend is integrated. */
export const mockProjects: Project[] = [
  {
    id: "1",
    name: "Production App",
    slug: "production-app",
    description: "Production environment secrets",
    ownerId: "owner-1",
    secrets: Array.from({ length: 12 }, (_, i) => ({ id: `s-${i}` })),
    color: "bg-blue-500",
    createdAt: "2026-05-01",
    updatedAt: "2026-06-01",
  },
  {
    id: "2",
    name: "Staging Environment",
    slug: "staging-environment",
    description: "Staging and testing secrets",
    ownerId: "owner-1",
    secrets: Array.from({ length: 8 }, (_, i) => ({ id: `s-${i}` })),
    color: "bg-green-500",
    createdAt: "2026-04-28",
    updatedAt: "2026-05-28",
  },
  {
    id: "3",
    name: "Development",
    slug: "development",
    description: "Local development secrets",
    ownerId: "owner-1",
    secrets: Array.from({ length: 15 }, (_, i) => ({ id: `s-${i}` })),
    color: "bg-purple-500",
    createdAt: "2026-05-15",
    updatedAt: "2026-06-02",
  },
  {
    id: "4",
    name: "External APIs",
    slug: "external-apis",
    description: "Third-party service credentials",
    ownerId: "owner-1",
    secrets: Array.from({ length: 6 }, (_, i) => ({ id: `s-${i}` })),
    color: "bg-orange-500",
    createdAt: "2026-04-30",
    updatedAt: "2026-05-30",
  },
];
