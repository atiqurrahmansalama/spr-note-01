# OUR LITTLE UNIVERSE

## Product Requirements Document (PRD)

**Document ID:** OLU-PRD-001  
**Version:** 1.0  
**Status:** Initial Approved Baseline  
**Product Type:** Private Personalized Interactive Web Application

---

## 1. Product Overview

Our Little Universe is a private, personalized, interactive digital experience designed to create an immersive world of memories, stories, letters, games, gifts, and surprises for a loved one.

The platform will combine elements of:

- Interactive storytelling
- Digital scrapbook
- Memory museum
- Personal multimedia library
- Mini-game platform
- Virtual gift experience
- Treasure hunt and mystery system
- Personalized event and anniversary experiences

The product will be continuously updated throughout its lifetime.

## 2. Product Vision

**Vision:** Build a personal digital universe where every interaction reveals a memory, every section tells a story, and every visit can bring a new surprise.

The experience should feel personal, emotional, beautiful, playful, and memorable.

## 3. Product Objectives

1. Create an immersive and personalized digital experience.
2. Preserve photographs, memories, stories, and personal messages.
3. Provide interactive activities rather than static content.
4. Introduce progressive content unlocking and surprise mechanisms.
5. Allow the administrator to manage all content without modifying source code.
6. Support future anniversaries, new memories, and additional experiences.
7. Maintain privacy and secure access to personal content.
8. Deliver a high-quality mobile and desktop experience.

## 4. User Roles

### 4.1 Administrator / Owner

The administrator has full control over the application.

Permissions:

- Manage all modules.
- Create, edit, publish, archive, and delete content.
- Upload and organize media.
- Configure surprise rules.
- Manage games and quizzes.
- Configure schedules and special dates.
- Manage website themes.
- View user progress and activity.
- Manage access permissions.
- Configure backups and application settings.

### 4.2 Recipient / Guest

The recipient is the primary experience user.

Permissions:

- Explore available sections.
- View memories and stories.
- Read letters and messages.
- Play games.
- Collect achievements.
- Discover hidden clues.
- Unlock surprises.
- Save progress.
- Explore future plans and special events.

The recipient must not have access to administrative functionality.

## 5. Functional Requirements

### FR-01: Authentication & Private Access

- Private login system.
- No public registration.
- Administrator and recipient access separation.
- Protected administrative routes.
- Session management.
- Logout functionality.
- Secure access to protected media.

### FR-02: Welcome Experience

- Personalized welcome screen.
- Animated entry.
- Optional PIN challenge.
- Custom greeting.
- Countdown.
- Entry sound and visual effects.

### FR-03: Main Universe Dashboard

- Interactive navigation.
- Module cards or visual universe map.
- Module availability status.
- Journey progress.
- Achievement display.
- Daily surprise notification.

### FR-04: Our Story

- Chronological timeline.
- Relationship milestones.
- First-time experiences.
- Photos and videos.
- Written narratives.
- Custom event dates.
- Interactive story chapters.

### FR-05: Memory Museum

- Photo gallery.
- Albums and categories.
- Memory wall.
- Random memory discovery.
- Full-screen slideshow.
- Before/after comparison.
- Photo puzzle.
- Memory descriptions and dates.

### FR-06: Letters & Messages

- Digital envelope.
- Multiple letters.
- Open When categories.
- Handwritten-style presentation.
- Voice messages.
- Hidden messages.
- Read/unread status.
- Scheduled letters.

### FR-07: Virtual Garden

- Animated virtual garden.
- Interactive flowers.
- Planting mechanism.
- Growing animations.
- Messages associated with flowers.
- Garden progress.

### FR-08: Music & Atmosphere

- Custom music library.
- Audio player.
- Play/pause and volume control.
- Song-associated memories.
- Visualizer.
- Ambient sound controls.
- User-initiated playback.

### FR-09: Games & Activities

- Couple quiz.
- Memory quiz.
- Matching game.
- Catch the Hearts.
- Find My Heart.
- Treasure Hunt.
- Score tracking.
- Rewards and completion status.
- Configurable difficulty.

### FR-10: Secret & Mystery System

- Secret rooms.
- Code-based unlocking.
- Distributed clues.
- Easter eggs.
- Multi-stage puzzles.
- Conditional content visibility.
- Unlock history.

### FR-11: Digital Gifts

- Interactive gift boxes.
- Scratch cards.
- Spin wheel.
- Mystery boxes.
- Gift animations.
- Reward management.

### FR-12: Dreams & Future

- Shared dream board.
- Travel destination collection.
- Future bucket list.
- Shared plans.
- Goal completion tracking.

### FR-13: Night Sky

- Animated star field.
- Interactive constellations.
- Custom constellation.
- Wish interaction.
- Hidden messages.

### FR-14: Final Surprise

- Final unlock conditions.
- Cinematic reveal.
- Personalized final message.
- Memory slideshow.
- Anniversary celebration.
- Special event presentation.

### FR-15: Administration

The administrator must be able to manage all user-facing content from a centralized dashboard.

Required capabilities:

- Dashboard overview.
- Content CRUD.
- Media management.
- Module management.
- Game configuration.
- Quiz editor.
- Surprise configuration.
- Unlock rule editor.
- Scheduled content.
- Theme configuration.
- User progress management.
- Activity history.
- Application settings.

## 6. Content Management Requirements

All frequently updated content should be database-driven.

Examples:

| Content                | Management Method |
| ---------------------- | ----------------- |
| Memories               | Admin Panel       |
| Photos                 | Admin Panel       |
| Letters                | Admin Panel       |
| Voice recordings       | Admin Panel       |
| Quiz questions         | Admin Panel       |
| Gifts                  | Admin Panel       |
| Unlock rules           | Admin Panel       |
| Special dates          | Admin Panel       |
| Theme settings         | Admin Panel       |
| Core application logic | Source Code       |

The administrator should not need a developer to add ordinary memories, letters, photos, or surprises.

## 7. Surprise & Unlock Engine

The application must support configurable unlocking mechanisms.

### Supported triggers

1. Manual unlock.
2. Date-based unlock.
3. Progress-based unlock.
4. Quiz-result-based unlock.
5. Secret-code-based unlock.
6. Clue-collection-based unlock.
7. Achievement-based unlock.

### Example workflow

Memory Gallery completed  
→ Secret clue discovered  
→ Treasure Hunt completed  
→ Gift Box unlocked  
→ Final Surprise becomes available.

Unlock conditions must be configurable from the Admin Panel.

The server must validate protected unlock conditions rather than trusting browser-side state.

## 8. Non-Functional Requirements

### Performance

- Fast initial page loading.
- Lazy loading for large media collections.
- Optimized image formats.
- Code splitting.
- Smooth animations.
- Avoid unnecessary 3D rendering.

### Responsive Design

- Mobile-first implementation.
- Desktop support.
- Tablet support.
- Touch-friendly interactions.

### Security

- Private access.
- Secure authentication.
- Database access restrictions.
- Protected media.
- Input validation.
- No sensitive credentials in frontend code.

### Reliability

- Persistent user progress.
- Database migrations.
- Backup strategy.
- Graceful error handling.
- Recovery from interrupted sessions.

### Accessibility

- Keyboard navigation.
- Readable typography.
- Sufficient color contrast.
- Reduced-motion support.
- Audio controls.

### Maintainability

- Modular architecture.
- Reusable components.
- Documented modules.
- Automated tests.
- Version-controlled source code.

## 9. Success Criteria

The initial production release will be considered successful when:

1. Private access works correctly.
2. Administrator can manage all core content.
3. Recipient can complete the main experience.
4. Memories and letters persist correctly.
5. Unlock conditions are validated securely.
6. User progress survives browser refreshes and device changes.
7. Main experience works on mobile and desktop.
8. Critical user journeys pass automated E2E tests.
9. No critical security or data-loss issues remain.

## 10. Release Strategy

### Release 1 — Foundation

- Authentication
- Main layout
- Welcome experience
- Dashboard
- Database foundation
- Admin foundation

### Release 2 — Memory Experience

- Our Story
- Memory Museum
- Letters
- Voice messages
- Music

### Release 3 — Interactive Experience

- Games
- Garden
- Digital Gifts
- Treasure Hunt

### Release 4 — Advanced Experience

- Secret rooms
- Unlock Engine
- Night Sky
- Final Surprise

### Release 5 — Long-Term Platform

- Anniversary Mode
- Scheduled content
- Expanded admin capabilities
- Advanced personalization
- Performance and security improvements

## 11. Out of Scope for Initial Version

- Public registration.
- Multi-couple SaaS functionality.
- Public social network.
- Payment processing.
- Public content sharing.
- AI-generated relationship content.
- Native Android/iOS applications.

These may be considered in future versions if needed.

## 12. Product Principles

1. Privacy before convenience.
2. Experience before visual complexity.
3. Reusability before duplication.
4. Content-driven features before hardcoded pages.
5. Mobile usability before desktop-only effects.
6. Reliable interactions before decorative animations.
7. Long-term maintainability before unnecessary abstraction.

---

**End of PRD v1.0**
