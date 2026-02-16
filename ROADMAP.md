# Linkyboss Product Roadmap

## v1 — Foundation & Launch (Weeks 1-3)
**Goal:** Nail the core interview + content studio loop. Ship it. Get feedback.

### Interview & Auth
- [x] Redesign interview: 16 questions → 8 smart questions (3 phases)
- [x] AI follow-up probes after key answers (DeepSeek)
- [x] Fix signup flow: name → auth → interview
- [x] Save interview progress to DB for signed-in users
- [ ] Polish interview UX: loading states, error handling, edge cases
- [ ] Email delivery of voice profiles (currently stubbed)

### Content Studio (DeepSeek-powered)
- [ ] Swap Anthropic for DeepSeek in content generation (cost optimization)
- [ ] Simulate and polish the creation studio UX
- [ ] Ensure voice profiles from new interview flow produce quality posts
- [ ] Basic post editing and refinement loop

### Launch Prep
- [ ] Landing page copy refresh (reflect 8-question flow)
- [ ] Basic analytics / tracking
- [ ] Deploy to production
- [ ] Start collecting user feedback

**Ship target:** End of Week 3

---

## v2 — Smarter Studio (Weeks 4-8)
**Goal:** Level up content quality with real data and better models.

### Smarter Content Generation
- [ ] Upgrade to a stronger model for post generation (Claude / GPT-4o)
- [ ] Fresh data integration — trending topics, news feeds relevant to user's pillars
- [ ] Content calendar suggestions based on pillars and audience
- [ ] Multiple draft variations per topic

### Image Curator / Generator
- [ ] AI image suggestions for posts (stock + generated)
- [ ] Simple image generation integration (DALL-E / Flux)
- [ ] Image-to-post and post-to-image workflows

### Refinements from v1 Feedback
- [ ] Interview question tweaks based on user feedback
- [ ] Voice profile accuracy improvements
- [ ] UX polish based on user sessions

**Ship target:** End of Week 8

---

## v3 — LinkedIn Brain (Weeks 9-14)
**Goal:** Use LinkedIn API tools to build a "brain" that trains your voice from real data.

### LinkedIn Integration
- [ ] LinkedIn OAuth + API connection
- [ ] Import user's existing posts for voice analysis
- [ ] Analyze engagement patterns (what works, what doesn't)
- [ ] Build a "content brain" from their best-performing posts

### Voice Training
- [ ] Fine-tune voice profile using real LinkedIn data (not just interview)
- [ ] Auto-detect tone, hooks, and patterns from top posts
- [ ] "Voice match score" — how close generated content is to their real voice
- [ ] Iterative voice refinement based on post performance

### Advanced Content Features
- [ ] Post scheduling and publishing via LinkedIn API
- [ ] Engagement analytics dashboard
- [ ] Comment/reply generation in the user's voice
- [ ] Content series / thread planning

**Ship target:** End of Week 14

---

## v4 — Optimization & Scale (Weeks 15-18)
**Goal:** Performance, reliability, and growth.

### Technical Optimization
- [ ] Model cost optimization (routing, caching, smaller models for simple tasks)
- [ ] Response latency improvements
- [ ] Database query optimization
- [ ] CDN and edge deployment

### Product Optimization
- [ ] A/B testing framework for interview questions
- [ ] Conversion funnel optimization
- [ ] User onboarding improvements based on data
- [ ] Referral / viral loops

### Scale Prep
- [ ] Rate limiting and abuse prevention
- [ ] Team/agency accounts (manage multiple profiles)
- [ ] API for third-party integrations
- [ ] Billing and subscription infrastructure

**Ship target:** End of Week 18

---

## Timeline Summary

| Version | Focus | Duration | Ship Date |
|---------|-------|----------|-----------|
| **v1** | Interview + Studio + Launch | 3 weeks | ~Early March 2026 |
| **v2** | Smart Studio + Images + Better Models | 5 weeks | ~Mid April 2026 |
| **v3** | LinkedIn Brain + Voice Training | 6 weeks | ~End May 2026 |
| **v4** | Optimization + Scale | 4 weeks | ~End June 2026 |

**Total runway: ~18 weeks (4.5 months)**

This is aggressive but doable if v1 ships fast and feedback loops are tight. The biggest risk is v3 — LinkedIn API access can be slow to get approved. Start that process during v2.
