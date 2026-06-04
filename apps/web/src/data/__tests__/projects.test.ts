import { describe, it, expect } from "vitest";
import { mockProjects } from "@/data/projects";
import type { Project } from "@repo/shared";

describe("mockProjects", () => {
  it("should be an array of Project objects", () => {
    expect(Array.isArray(mockProjects)).toBe(true);
    expect(mockProjects.length).toBeGreaterThan(0);
  });

  it("should have required fields on every project", () => {
    for (const project of mockProjects) {
      expect(project).toHaveProperty("id");
      expect(typeof project.id).toBe("string");
      expect(project).toHaveProperty("name");
      expect(typeof project.name).toBe("string");
      expect(project).toHaveProperty("slug");
      expect(typeof project.slug).toBe("string");
      expect(project).toHaveProperty("description");
      expect(typeof project.description).toBe("string");
      expect(project).toHaveProperty("ownerId");
      expect(typeof project.ownerId).toBe("string");
      expect(project).toHaveProperty("secrets");
      expect(Array.isArray(project.secrets)).toBe(true);
      expect(project).toHaveProperty("color");
      expect(typeof project.color).toBe("string");
      expect(project).toHaveProperty("createdAt");
      expect(typeof project.createdAt).toBe("string");
      expect(project).toHaveProperty("updatedAt");
      expect(typeof project.updatedAt).toBe("string");
    }
  });

  it("should have unique IDs", () => {
    const ids = mockProjects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique slugs", () => {
    const slugs = mockProjects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("should have secrets array with correct shape", () => {
    for (const project of mockProjects) {
      for (const secret of project.secrets) {
        expect(secret).toHaveProperty("id");
        expect(typeof secret.id).toBe("string");
      }
    }
  });

  it("should use the Project type from @repo/shared", () => {
    // Type-level assertion — verifies mockProjects satisfies the Project[] type at compile time
    const typed: Project[] = mockProjects;
    expect(typed).toBe(mockProjects);
  });
});
