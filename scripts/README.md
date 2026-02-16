# Initialize Pregnancy Week Data

To populate Firestore with pregnancy week information:

## Option 1: Via App (Recommended)

Add this to your app temporarily (e.g., in a button on the home screen):

```typescript
import { initializeWeekData } from '../services/firebase/weekInfoService';

// In your component:
<TouchableOpacity onPress={async () => {
  await initializeWeekData();
  alert('Week data initialized!');
}}>
  <Text>Initialize Week Data</Text>
</TouchableOpacity>
```

## Option 2: Via Console

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Create a collection called `pregnancyWeeks`
4. Add documents with IDs: `week4`, `week8`, `week12`, etc.
5. Copy the data structure from `services/firebase/weekInfoService.ts`

The data will be automatically fetched and displayed on the home screen!
