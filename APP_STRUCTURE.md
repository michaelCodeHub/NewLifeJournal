# NewLifeJournal - App Folder Structure

## Overview
The app follows Expo Router's file-based routing convention with route groups for organized navigation.

## Folder Structure

```
app/
├── _layout.tsx                    # Root layout with AuthProvider & PregnancyProvider
├── index.tsx                      # Smart route redirector based on auth state
│
├── (auth)/                        # Authentication flow (unauthenticated users)
│   ├── _layout.tsx               # Auth layout (headerless)
│   └── login.tsx                 # Google Sign-In screen
│
├── (onboarding)/                  # First-time user setup
│   ├── _layout.tsx               # Onboarding stack layout
│   ├── choose-mode.tsx           # Select "Pregnancy" or "Baby"
│   ├── create-pregnancy.tsx      # Pregnancy profile form
│   └── create-baby.tsx           # Baby profile form
│
├── (pregnancy)/                   # Pregnancy tracking (tab navigation)
│   ├── _layout.tsx               # Tab layout with 4 tabs
│   ├── home.tsx                  # Dashboard: Week tracker, progress, quick actions
│   ├── visits.tsx                # Hospital visits list & logging
│   ├── symptoms.tsx              # Symptom tracking with severity
│   └── timeline.tsx              # Unified timeline of all events
│
└── (baby)/                        # Baby tracking (tab navigation)
    ├── _layout.tsx               # Tab layout for baby features
    └── home.tsx                  # Baby dashboard (placeholder)
```

## Navigation Flow

### 1. Root Redirector (`index.tsx`)
```
User lands here → Checks auth state → Redirects to:
├─ Not authenticated → /(auth)/login
├─ Authenticated + pregnancy → /(pregnancy)/home
├─ Authenticated + baby → /(baby)/home
└─ Authenticated + no profile → /(onboarding)/choose-mode
```

### 2. Authentication Flow
```
/(auth)/login → Google Sign-In → /(onboarding)/choose-mode
```

### 3. Onboarding Flow
```
/(onboarding)/choose-mode
├─ Select "Track Pregnancy" → create-pregnancy.tsx → /(pregnancy)/home
└─ Select "Add Baby" → create-baby.tsx → /(baby)/home
```

### 4. Pregnancy Section (Tabs)
```
/(pregnancy)/
├─ 🏠 Home         → Dashboard with week tracker
├─ 🏥 Visits       → Hospital visits tracking
├─ 💊 Symptoms     → Symptom logging
└─ 📅 Timeline     → Unified event timeline
```

## Route Groups Explained

### `(auth)` Group
- **Purpose**: Handle unauthenticated users
- **Layout**: Headerless, clean design
- **Screens**: Login with Google

### `(onboarding)` Group
- **Purpose**: First-time user setup
- **Layout**: Stack navigation with back button
- **Screens**: Mode selection, pregnancy form, baby form

### `(pregnancy)` Group
- **Purpose**: Pregnancy tracking features
- **Layout**: Bottom tab navigation
- **Tabs**: Home, Visits, Symptoms, Timeline
- **Active when**: User has `currentMode: 'pregnancy'`

### `(baby)` Group
- **Purpose**: Baby tracking features
- **Layout**: Bottom tab navigation
- **Active when**: User has `currentMode: 'baby'`

## Key Features per Screen

### Pregnancy Home (`/(pregnancy)/home`)
- ✅ Current week badge
- ✅ Days until due date countdown
- ✅ Progress bar (weeks 1-40)
- ✅ Quick action buttons
- ✅ Recent activity summary
- ✅ Hospital & doctor info cards

### Hospital Visits (`/(pregnancy)/visits`)
- ✅ List all hospital visits
- ✅ Visit type badges (checkup, ultrasound, test, emergency)
- ✅ Week indicator
- ✅ Weight & blood pressure tracking
- ✅ Next appointment reminder
- 🚧 Add new visit form (placeholder)

### Symptoms (`/(pregnancy)/symptoms`)
- ✅ List all symptoms
- ✅ Severity indicator (1-5 with color coding)
- ✅ Week association
- ✅ Notes display
- 🚧 Add new symptom form (placeholder)

### Timeline (`/(pregnancy)/timeline`)
- ✅ Unified chronological timeline
- ✅ Combines visits, symptoms, and milestones
- ✅ Visual timeline with dots and connecting lines
- ✅ Icon indicators for event types
- ✅ Week badges for each event

## State Management

### Context Providers (in `_layout.tsx`)
1. **AuthProvider** - User authentication state
2. **PregnancyProvider** - Active pregnancy data with real-time Firestore listeners

### Data Flow
```
Component → usePregnancy() hook → PregnancyContext
                                        ↓
                                  subscribeToX()
                                        ↓
                                    Firestore
                                        ↓
                                  Real-time updates
```

## Navigation Patterns

### Tab Navigation
- Pregnancy and Baby sections use bottom tabs
- Icons with active/inactive colors
- Header shown with screen titles

### Stack Navigation
- Onboarding uses stack for linear flow
- Auth screens are headerless

### Replace vs Push
- `router.replace()` - Used for auth flows (no back button)
- `router.push()` - Used for detail screens (can go back)

## Best Practices

1. **Route Groups** `(name)` - Don't appear in URL, organize related screens
2. **Layouts** `_layout.tsx` - Define navigation structure for child routes
3. **Index Routes** `index.tsx` - Default route for a directory
4. **Dynamic Routes** `[id].tsx` - For detail screens (not yet implemented)

## Future Extensions

### Planned Additions
- `/(pregnancy)/visits/[id].tsx` - Visit detail/edit screen
- `/(pregnancy)/symptoms/[id].tsx` - Symptom detail/edit screen
- `/(pregnancy)/milestones/` - Dedicated milestones tab
- `/(baby)/activities/` - Activity logging screens
- `/(baby)/growth/` - Growth chart screens
- `/(tabs)/settings.tsx` - Shared settings screen

### Modal Screens
Can add modal screens for forms:
```tsx
// app/(pregnancy)/_layout.tsx
<Tabs>
  <Tabs.Screen name="add-visit" options={{ presentation: 'modal' }} />
</Tabs>
```

## File Naming Conventions

- **Screens**: `kebab-case.tsx` (e.g., `create-pregnancy.tsx`)
- **Layouts**: `_layout.tsx` (underscore prefix)
- **Route Groups**: `(parentheses)` for organizational grouping
- **Dynamic Routes**: `[brackets]` for parameters

## Summary

The app structure is now professionally organized with:
- ✅ Clear separation of concerns (auth, onboarding, features)
- ✅ Tab navigation for main features
- ✅ Logical flow from login → onboarding → feature use
- ✅ Scalable structure for future additions
- ✅ Following Expo Router best practices
