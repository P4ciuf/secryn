# SecureVault Roadmap

> SecureVault is a secure secrets management platform for developers and teams.
>
> Goal: build a simple, secure, and developer-friendly solution for storing and managing environment variables and application secrets.

---

# Phase 1 — MVP Core

## Backend Foundation

- [x] Fastify + TypeScript setup
- [x] PostgreSQL integration
- [x] Prisma ORM configuration
- [x] Project architecture (routes, services, plugins)
- [x] User model
- [x] Team model
- [x] Secret model

## Authentication

- [x] User registration
- [x] User login
- [x] Password hashing
- [x] JWT authentication
- [x] Authentication middleware

## Secret Management

- [ ] Create encrypted secret
- [ ] Retrieve secrets by project
- [ ] List project secrets
- [ ] Delete secret
- [ ] Dashboard API endpoints

---

# Phase 2 — Security

## Encryption

- [ ] AES-256 encryption
- [ ] Encrypted-only storage
- [ ] Server-side key management
- [ ] Secret masking and secure logging

## API Security

- [ ] Request validation
- [ ] Rate limiting
- [ ] Brute-force protection
- [ ] Secure JWT strategy
- [ ] CORS hardening

## Security Review

- [ ] OWASP Top 10 audit
- [ ] Dependency vulnerability scanning
- [ ] Security testing checklist

---

# Phase 3 — Web Dashboard

## Authentication UI

- [ ] Login page
- [ ] Registration page

## Project Management

- [ ] Dashboard overview
- [ ] Create project
- [ ] Project settings

## Secret Management UI

- [ ] Secret listing
- [ ] Add secret
- [ ] Delete secret
- [ ] Search and filtering

---

# Phase 4 — Developer Platform

## API Access

- [ ] API key generation
- [ ] API key management
- [ ] Secret retrieval endpoints
- [ ] Secret creation endpoints

## Integrations

- [ ] Environment variable export
- [ ] CLI planning
- [ ] SDK planning

## Documentation

- [ ] API reference
- [ ] Quick start guide
- [ ] Authentication guide

---

# Phase 5 — Billing & Plans

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

# Phase 6 — Deployment

## Infrastructure

- [ ] Production database
- [ ] Backend deployment
- [ ] Frontend deployment
- [ ] Monitoring and logging
- [ ] Backup strategy

## Operations

- [ ] Environment management
- [ ] Error tracking
- [ ] Health checks

---

# Phase 7 — Launch

## Open Source Readiness

- [ ] README
- [ ] Contribution guide
- [ ] License
- [ ] GitHub release

## Community

- [ ] Product demo
- [ ] Developer communities launch
- [ ] Feedback collection
- [ ] Early adopters program

---

# Long-Term Vision

- [ ] Teams and organizations
- [ ] Secret versioning
- [ ] Audit logs
- [ ] Role-based access control (RBAC)
- [ ] Secret rotation
- [ ] CI/CD integrations
- [ ] CLI tool
- [ ] SDKs
- [ ] Self-hosted edition

---

# Guiding Principles

- Security by default
- Simple developer experience
- Build small, iterate fast
- Solve real-world developer problems
- Reliability over complexity
