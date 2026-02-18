# NewLifeJournal - React Native Pregnancy Tracking App

## Overview
NewLifeJournal is a comprehensive pregnancy tracking application built with React Native, Expo, and Firebase. It helps expectant mothers track their pregnancy journey, log hospital visits, monitor symptoms, and interact with an AI assistant for pregnancy-related questions.

## Tech Stack
- **React Native**: 0.81.5
- **Expo**: 54.0.33
- **TypeScript**: Type-safe development
- **Firebase Firestore**: Cloud database for data storage
- **Firebase Authentication**: Google Sign-In integration
- **AI Integration**: Multi-provider chatbot (OpenAI, Anthropic, Google)

## Project Structure

```
NewLifeJournal/
├── app/
│   ├── (auth)/                    # Authentication screens
│   │   ├── _layout.tsx           # Auth layout
│   │   ├── login.tsx             # Login screen with Google Sign-In
│   │   └── welcome.tsx           # Welcome screen
│   │
│   ├── (pregnancy)/              # Main app screens
│   │   ├── _layout.tsx           # Tab navigation layout
│   │   ├── home.tsx              # Home screen with week info
│   │   ├── visits.tsx            # Hospital visits tracker
│   │   ├── symptoms.tsx          # Symptoms logger
│   │   ├── timeline.tsx          # Timeline view with filters
│   │   ├── chat.tsx              # AI assistant chat
│   │   └── admin.tsx             # Admin setup screen
│   │
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # App entry point
│
├── context/
│   ├── AuthContext.tsx           # Authentication state management
│   └── PregnancyContext.tsx      # Pregnancy data management
│
├── services/
│   └── firebase/
│       ├── config.ts             # Firebase configuration
│       ├── auth.ts               # Authentication services
│       ├── pregnancyService.ts   # Pregnancy CRUD operations
│       ├── weekInfoService.ts    # Week data initialization
│       ├── hospitalVisitService.ts
│       └── symptomService.ts
│
├── types/
│   └── index.ts                  # TypeScript type definitions
│
└── scripts/
    └── addDummyData.ts          # Dummy data generation script
```

## Core Features

### 1. Authentication
- **Google Sign-In**: Users authenticate using their Google account
- **Session Management**: Firebase handles user sessions
- **Protected Routes**: Auth-only and pregnancy-only screens

**Implementation:**
```typescript
// Google Sign-In flow
const handleGoogleSignIn = async () => {
  const result = await promptAsync();
  if (result.type === 'success') {
    const credential = GoogleAuthProvider.credential(result.params.id_token);
    await signInWithCredential(auth, credential);
  }
};
```

### 2. Pregnancy Data Management

#### Data Structure
```typescript
interface Pregnancy {
  id: string;
  userId: string;
  startDate: Timestamp;
  dueDate: Timestamp;
  currentWeek: number;
  babyName?: string;
  createdAt: Timestamp;
}

interface HospitalVisit {
  id: string;
  pregnancyId: string;
  type: 'checkup' | 'ultrasound' | 'test' | 'emergency';
  date: Timestamp;
  week: number;
  weight?: number;
  bloodPressure?: string;
  notes?: string;
  createdAt: Timestamp;
}

interface Symptom {
  id: string;
  pregnancyId: string;
  type: 'nausea' | 'fatigue' | 'headache' | 'back_pain' | 'other';
  severity: 1 | 2 | 3 | 4 | 5;
  date: Timestamp;
  week: number;
  notes?: string;
  createdAt: Timestamp;
}
```

#### Firestore Collections
```
users/{userId}/
  └── pregnancies/{pregnancyId}/
      ├── hospitalVisits/{visitId}
      ├── symptoms/{symptomId}
      └── milestones/{milestoneId}

pregnancyWeeks/{weekNumber}/
  ├── babySize
  ├── babyLength
  ├── babyWeight
  ├── development: []
  ├── motherChanges: []
  └── tips: []
```

### 3. Home Screen
**Features:**
- Displays current pregnancy week
- Shows baby size comparison (fruit/vegetable)
- Baby measurements (length and weight)
- Development milestones
- Mother's body changes
- Weekly tips
- Compact single-card UI
- Teal color scheme (#81bec1)

**Key Implementation:**
```typescript
// Week calculation
const calculateCurrentWeek = (startDate: Date) => {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.min(Math.floor(diffDays / 7) + 1, 40);
};
```

### 4. Hospital Visits Tracker
**Features:**
- Add visits with dropdown type selection
- Track weight, blood pressure, and notes
- Animated modal form
- 9 visit types: Checkup, Ultrasound, Blood Test, Glucose Test, Anatomy Scan, First Trimester Screening, Non-Stress Test, Emergency Visit, Other
- Teal-themed UI
- Type mapping to database enums

**Visit Types Mapping:**
```typescript
const mapVisitTypeToDb = (type: string): 'checkup' | 'ultrasound' | 'test' | 'emergency' => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('ultrasound') || lowerType.includes('scan')) return 'ultrasound';
  if (lowerType.includes('test') || lowerType.includes('blood') || lowerType.includes('glucose')) return 'test';
  if (lowerType.includes('emergency')) return 'emergency';
  return 'checkup';
};
```

### 5. Symptoms Logger
**Features:**
- 11 symptom types with custom "Other" option
- 5 severity levels with color coding:
  - Level 1: Mild (Green #4CAF50)
  - Level 2: Moderate (Light Green #8BC34A)
  - Level 3: Noticeable (Orange #FF9800)
  - Level 4: Severe (Red-Orange #FF5722)
  - Level 5: Very Severe (Red #F44336)
- Animated dropdown pickers
- Custom input for "Other" symptom type
- Notes field for additional details

**Symptom Types:**
```typescript
const SYMPTOM_TYPES = [
  'Nausea', 'Fatigue', 'Headache', 'Back Pain', 'Leg Cramps',
  'Heartburn', 'Constipation', 'Mood Swings', 'Swelling',
  'Shortness of Breath', 'Other'
];
```

### 6. Timeline View
**Features:**
- Unified view of all events (visits, symptoms, milestones)
- Filter by type: All Events, Visits Only, Symptoms Only
- Week selector dropdown to jump to specific weeks
- Events grouped by pregnancy week
- Week headers with decorative lines
- Color-coded left borders:
  - Green (#4CAF50) - Hospital Visits
  - Orange (#FF9800) - Symptoms
  - Gold (#FFD700) - Milestones
- Clean card-based layout (no timeline dots/lines)
- Smooth animations on filter changes
- Auto-scroll to selected week

**Filter Implementation:**
```typescript
type FilterType = 'all' | 'visits' | 'symptoms';

const timelineEvents = allEvents.filter(event => {
  if (filterType === 'all') return true;
  if (filterType === 'visits') return event.type === 'visit';
  if (filterType === 'symptoms') return event.type === 'symptom';
  return true;
});
```

**Week Grouping:**
```typescript
const eventsByWeek: { [key: number]: typeof timelineEvents } = {};
timelineEvents.forEach(event => {
  if (!eventsByWeek[event.week]) {
    eventsByWeek[event.week] = [];
  }
  eventsByWeek[event.week].push(event);
});
```

### 7. AI Assistant Chat
**Features:**
- Multi-provider support (OpenAI, Anthropic, Google)
- Context-aware pregnancy advice
- Message history
- Real-time streaming responses
- Pregnancy week context injection

**Provider Configuration:**
```typescript
interface ChatProvider {
  id: 'openai' | 'anthropic' | 'google';
  name: string;
  model: string;
  apiKey: string;
}
```

### 8. Admin Setup Screen
**Features:**
- Initialize 40 weeks of pregnancy data
- Add dummy test data
- Teal primary button (#81bec1)
- Orange secondary button (#FF9800) for dummy data
- Loading states with spinners
- Success/error alerts

**Dummy Data:**
- 15 realistic hospital visits across all trimesters
- 27 realistic symptoms with varying severity
- Distributed timeline from week 1 to week 40
- Realistic notes for each entry

**Week Calculation for Dummy Data:**
```typescript
const getWeekFromDaysAgo = (days: number): number => {
  const totalDays = 280; // 40 weeks
  const currentDay = totalDays - days;
  return Math.max(1, Math.min(40, Math.floor(currentDay / 7)));
};
```

## UI/UX Design Patterns

### Color Scheme
- **Primary**: #81bec1 (Teal)
- **Background**: #E0F2F3 (Light Teal)
- **Visits**: #4CAF50 (Green)
- **Symptoms**: #FF9800 (Orange)
- **Milestones**: #FFD700 (Gold)
- **Secondary Button**: #FF9800 (Orange)

### Navigation
**Bottom Tabs (Visible):**
- 🏠 Home
- 📅 Timeline
- 💬 Chat
- ⚙️ Admin

**Hidden Tabs (Code Preserved):**
- 🏥 Visits (href: null)
- 💊 Symptoms (href: null)

Users access Visits and Symptoms through the Timeline's FAB (Floating Action Button).

### Animated Components
**Dropdown Picker Pattern:**
```typescript
const pickerSlideAnim = useRef(new Animated.Value(500)).current;
const pickerFadeAnim = useRef(new Animated.Value(0)).current;

const openPicker = useCallback(() => {
  setShowPicker(true);
  Animated.parallel([
    Animated.timing(pickerSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }),
    Animated.timing(pickerFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }),
  ]).start();
}, []);
```

### Form Validation
- Required fields marked clearly
- Timestamp conversion for dates
- Type mapping for database enums
- Optional fields handled gracefully

## Firebase Integration

### Authentication
```typescript
// Google Sign-In Configuration
const config = {
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};
```

### Real-time Data Subscriptions
```typescript
const subscribeToHospitalVisits = (
  userId: string,
  pregnancyId: string,
  callback: (visits: HospitalVisit[]) => void
) => {
  const visitsRef = collection(
    db,
    'users',
    userId,
    'pregnancies',
    pregnancyId,
    'hospitalVisits'
  );

  return onSnapshot(
    query(visitsRef, orderBy('date', 'desc')),
    (snapshot) => {
      const visits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HospitalVisit[];
      callback(visits);
    }
  );
};
```

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - only accessible by the user
    match /users/{userId}/pregnancies/{pregnancyId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Subcollections
      match /{subcollection}/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Pregnancy week data - readable by all authenticated users
    match /pregnancyWeeks/{week} {
      allow read: if request.auth != null;
      allow write: if false; // Only admin can write
    }
  }
}
```

## Key Components

### Context Providers
```typescript
// AuthContext - Manages authentication state
<AuthProvider>
  {/* App content */}
</AuthProvider>

// PregnancyContext - Manages pregnancy data and subscriptions
<PregnancyProvider>
  {/* Pregnancy screens */}
</PregnancyProvider>
```

### Custom Hooks
```typescript
const { user, loading } = useAuth();
const { pregnancy, hospitalVisits, symptoms, loading } = usePregnancy();
```

## Data Flow

1. **User Authentication**
   - User signs in with Google
   - Firebase creates/updates user record
   - Auth state persists across sessions

2. **Pregnancy Creation**
   - User creates pregnancy with start date
   - System calculates due date and current week
   - Firestore creates pregnancy document

3. **Data Entry**
   - User adds visits/symptoms through forms
   - Data saved to Firestore subcollections
   - Real-time listeners update UI

4. **Timeline Display**
   - Context providers fetch all data
   - Events combined and sorted
   - Filtered based on user selection
   - Grouped by pregnancy week

## Performance Optimizations

### Real-time Updates
- Firestore listeners for live data sync
- Automatic UI updates on data changes
- Unsubscribe on component unmount

### Memoization
```typescript
const openPicker = useCallback(() => {
  // Animation logic
}, [dependencies]);

const filteredEvents = useMemo(() => {
  return allEvents.filter(/* filter logic */);
}, [allEvents, filterType]);
```

### Efficient Rendering
- FlatList for long lists
- Key props for list items with fallbacks
- Animated.View for smooth transitions
- RequestAnimationFrame for layout-dependent scrolls

## Error Handling

### Try-Catch Blocks
```typescript
try {
  await addHospitalVisit(userId, pregnancyId, visitData);
  Alert.alert('Success', 'Visit added successfully');
} catch (error: any) {
  console.error('Error adding visit:', error);
  Alert.alert('Error', error.message || 'Failed to add visit');
}
```

### Fallback Keys
```typescript
// Prevent React key warnings
key={item.id || `item-${index}-${item.date?.toMillis()}`}
```

## Environment Variables
```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=

EXPO_PUBLIC_OPENAI_API_KEY=
EXPO_PUBLIC_ANTHROPIC_API_KEY=
EXPO_PUBLIC_GOOGLE_API_KEY=
```

## Testing Data

### Initialize Week Data
Navigate to Admin screen and tap "Initialize Week Data" to populate Firestore with 40 weeks of pregnancy information.

### Add Dummy Data
1. Ensure you have an active pregnancy
2. Navigate to Admin screen
3. Tap "Add Dummy Data"
4. Data includes:
   - 15 hospital visits (First trimester: 4, Second: 4, Third: 7)
   - 27 symptoms (First trimester: 7, Second: 7, Third: 13)
   - Realistic progression throughout pregnancy

## Common Patterns

### Dropdown Picker
Every dropdown uses the same pattern:
1. TouchableOpacity trigger button
2. Animated modal with backdrop
3. FlatList of options (or manual mapping for filters)
4. Checkmark on selected item
5. Slide-up/fade-in animation

### Form Submission
1. Collect form data
2. Validate required fields
3. Convert Date to Timestamp
4. Map UI values to database enums
5. Call service function
6. Show success/error alert
7. Reset form or close modal

### Week Header Display
```typescript
<View style={styles.weekHeader}>
  <View style={styles.weekHeaderLine} />
  <Text style={styles.weekHeaderText}>Week {week}</Text>
  <View style={styles.weekHeaderLine} />
</View>
```

## Future Enhancements

### Potential Features
- Push notifications for appointments
- Photo upload for ultrasounds
- Kick counter
- Contraction timer
- Birth plan builder
- Baby items checklist
- Weight tracking with charts
- Blood pressure trends
- Export data as PDF
- Share timeline with partner
- Community forum
- Video call with doctor

### Technical Improvements
- Offline support with Firestore persistence
- Image optimization and compression
- Dark mode support
- Internationalization (i18n)
- Unit and integration tests
- Analytics tracking
- Crash reporting
- Performance monitoring

## Troubleshooting

### Common Issues

**1. React Key Warning**
```typescript
// Solution: Add fallback keys
key={item.id || `item-${index}-${item.date?.toMillis()}`}
```

**2. Timestamp Type Errors**
```typescript
// Wrong: date: new Date()
// Correct: date: Timestamp.now()
// Or: date: Timestamp.fromDate(new Date())
```

**3. Dropdown Not Showing**
- Ensure proper View hierarchy
- Use fixed height for picker container
- Separate backdrop TouchableOpacity from content
- Check z-index and positioning

**4. Filter/Week Scroll Issues**
```typescript
// Use requestAnimationFrame for layout-dependent scrolls
requestAnimationFrame(() => {
  scrollViewRef.current?.scrollTo({ y: offset, animated: false });
});
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Clear cache and restart
npx expo start -c

# Build for production
eas build --platform ios
eas build --platform android
```

## Git Workflow

```bash
# Do not commit until asked
# User will explicitly request commits

# When committing (only when asked):
git add .
git commit -m "Descriptive message

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

## Best Practices Followed

1. **TypeScript**: Strong typing throughout
2. **Component Structure**: Logical separation of concerns
3. **Error Handling**: Try-catch blocks with user feedback
4. **User Feedback**: Loading states, success/error alerts
5. **Accessibility**: Readable font sizes, clear labels
6. **Performance**: Memoization, efficient rendering
7. **Code Reusability**: Shared patterns, utility functions
8. **Consistent Styling**: Design system with theme colors
9. **Real-time Updates**: Firestore listeners
10. **Security**: Firestore rules, env variables

## Credits

Built with assistance from Claude (Anthropic) AI assistant for:
- UI/UX design and implementation
- Firebase integration
- State management architecture
- Animation implementations
- Bug fixes and optimizations

## License

Private project - All rights reserved
