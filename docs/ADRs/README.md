# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the Movie Ticket Booking System. ADRs document significant architectural and design decisions made during the project lifecycle.

---

## What are ADRs?

Architecture Decision Records (ADRs) are short documents that capture important architectural decisions along with their context and consequences. They help teams:
- Understand why decisions were made
- Track the evolution of the architecture
- Onboard new team members
- Avoid revisiting settled decisions

---

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-XXX: [Decision Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Date**: YYYY-MM-DD
**Decision Makers**: [Names]
**Technical Story**: [Link to issue/story]

## Context

What is the issue we're facing? What factors are driving this decision?

## Decision

What is the change we're proposing and/or doing?

## Consequences

What becomes easier or more difficult because of this decision?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Trade-off 1
- Trade-off 2

### Risks
- Risk 1 (Mitigation: ...)
- Risk 2 (Mitigation: ...)

## Alternatives Considered

What other options were evaluated?

### Option A
- Pros: ...
- Cons: ...
- Why rejected: ...

### Option B
- Pros: ...
- Cons: ...
- Why rejected: ...

## References

- [Link to documentation]
- [Link to discussion]
```

---

## Naming Convention

ADRs are numbered sequentially with descriptive titles:
```
001-database-choice.md
002-transaction-isolation-level.md
003-authentication-strategy.md
```

---

## ADR Lifecycle

1. **Proposed**: Initial draft, under discussion
2. **Accepted**: Decision finalized and implemented
3. **Deprecated**: No longer relevant but kept for history
4. **Superseded**: Replaced by a newer ADR (reference the new one)

---

## Example ADRs

### ADR-001: MySQL as Primary Database

**Status**: Accepted
**Date**: 2026-03-15

**Context**: Need to choose a database for the ticket booking system with strong ACID guarantees and support for complex transactions.

**Decision**: Use MySQL 8.0 as the primary database.

**Consequences**:
- **Positive**: Strong ACID compliance, proven scalability, excellent transaction support
- **Negative**: Requires careful schema design, vertical scaling limitations
- **Risks**: Need expertise in query optimization (Mitigation: comprehensive documentation)

**Alternatives Considered**:
- PostgreSQL (rejected: team familiarity)
- MongoDB (rejected: need for strong consistency)

---

### ADR-002: SELECT FOR UPDATE for Seat Locking

**Status**: Accepted
**Date**: 2026-03-16

**Context**: Prevent double-booking when multiple users try to book the same seats simultaneously.

**Decision**: Use `SELECT ... FOR UPDATE` within transactions to lock seat records during booking.

**Consequences**:
- **Positive**: Prevents race conditions, ensures data consistency
- **Negative**: Can cause blocking under high load
- **Risks**: Potential deadlocks (Mitigation: proper transaction ordering, timeout handling)

**Alternatives Considered**:
- Optimistic locking (rejected: higher conflict rate)
- Application-level semaphores (rejected: doesn't work across multiple instances)

---

## When to Create an ADR

Create an ADR when:
- Making architectural choices (database, framework, tools)
- Choosing design patterns or approaches
- Making security decisions
- Deciding on deployment strategies
- Changing existing architecture significantly

Do NOT create an ADR for:
- Minor code changes
- Bug fixes
- Routine feature additions
- Temporary workarounds

---

## ADR Review Process

1. **Draft**: Create ADR with "Proposed" status
2. **Discussion**: Share with team, gather feedback
3. **Review**: Technical lead reviews and approves
4. **Accept**: Change status to "Accepted" and implement
5. **Update**: Mark as "Deprecated" or "Superseded" if needed

---

## Tools

### Creating a New ADR
```bash
# Use ADR tools (if installed)
adr new "Choose authentication strategy"

# Manual creation
cp docs/ADRs/template.md docs/ADRs/003-authentication-strategy.md
```

### Listing ADRs
```bash
ls -1 docs/ADRs/*.md | sort
```

---

## Best Practices

1. **Keep it concise**: 1-2 pages maximum
2. **Be specific**: Include concrete examples
3. **Document alternatives**: Show what was considered
4. **Explain consequences**: Be honest about trade-offs
5. **Update when needed**: Mark as deprecated if decision changes
6. **Link to resources**: Reference documentation, discussions, issues

---

## Resources

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)

---

**Current ADR Count**: 0 (to be created during development)
**Last Updated**: 2026-03-20
