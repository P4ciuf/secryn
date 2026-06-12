# Secryn Roadmap

<!-- eslint-disable markdown/no-missing-label-refs -->

> Secryn is a secure secrets management platform for developers and teams.
>
> Goal: build a simple, secure, and developer-friendly solution for storing and managing environment variables and application secrets.

---

## Phase 1 — MVP Core

## Backend Foundation

- [x] Fastify + TypeScript setup
- [x] PostgreSQL integration
- [x] Prisma ORM configuration
- [x] Project architecture (routes, services, plugins)
- [x] User model
- [x] Team model _(renamed to Project model)_
- [x] Secret model

## Authentication

- [x] User registration
- [x] User login
- [x] Password hashing
- [x] JWT authentication
- [x] Authentication middleware

## Secret Management

- [x] Create encrypted secret
- [x] Retrieve secrets by project
- [x] List project secrets
- [x] Delete secret
- [x] Dashboard API endpoints

---

## Phase 2 — Security

## Encryption

- [x] AES-256 encryption
- [x] Encrypted-only storage
- [x] Server-side key management
- [x] Secret masking and secure logging

## API Security

- [x] Request validation _(schema validation on auth + project routes)_
- [x] Rate limiting _(`@fastify/rate-limit`, 50 req/min)_
- [x] Brute-force protection
- [x] Secure JWT strategy _(httpOnly cookies + bcrypt)_
- [x] CORS hardening _(`@fastify/cors`, credentials)_

## Security Review

- [x] OWASP Top 10 audit
- [x] Dependency vulnerability scanning
- [x] Security testing checklist

---

## Phase 3 — Web Dashboard

## Authentication UI

- [x] Login page
- [x] Registration page

## Project Management

- [x] Dashboard overview
- [x] Create project
- [x] Project settings _(user settings: profile, security, notifications, danger zone)_

## Secret Management UI

- [x] Secret listing
- [x] Add secret
- [x] Delete secret
- [x] Search and filtering

---

## Phase 4 — Developer Platform

## API Access

- [x] API key generation
- [x] API key management
- [x] Secret retrieval endpoints
- [x] Secret creation endpoints

## Integrations

- [x] Environment variable export
- [x] CLI planning
- [x] SDK planning

## Documentation

- [x] API reference _(Swagger UI at /docs, OpenAPI 3.1.0)_
- [x] Quick start guide _(README.md Getting Started)_
- [x] Authentication guide

---

## Phase 5 — Billing & Plans

## Free Tier

- [ ] Limited projects
- [ ] Limited secrets
- [ ] Dashboard access

## Pro Tier

- [ ] Unlimited secrets
- [ ] API access
- [ ] Environment export
- [ ] Audit history

---

## Phase 6 — Deployment

## Infrastructure

- [ ] Production database
- [ ] Backend deployment
- [ ] Frontend deployment
- [x] Monitoring and logging _(Winston with daily rotate file)_
- [ ] Backup strategy

## Operations

- [x] Environment management _(`EnvUtils`, `.env.example`)_
- [x] Error tracking _(`AppError`, global error handler)_
- [x] Health checks _(`GET /api/v1/health`)_

---

## Phase 7 — Launch

## Open Source Readiness

- [x] README
- [x] Contribution guide
- [x] License _(Apache 2.0)_
- [x] GitHub release

## Community

- [ ] Product demo
- [ ] Developer communities launch
- [ ] Feedback collection
- [ ] Early adopters program

---

## Long-Term Vision

- [ ] Teams and organizations
- [ ] Secret versioning
- [x] Audit logs
- [ ] Role-based access control (RBAC)
- [ ] Secret rotation
- [ ] CI/CD integrations
- [x] CLI tool
- [x] SDKs
- [x] Self-hosted edition

---

## Guiding Principles

- Security by default
- Simple developer experience
- Build small, iterate fast
- Solve real-world developer problems
- Reliability over complexity
