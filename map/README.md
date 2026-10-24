# Medical Navigation Map - Calm Care Design System

A production-ready Android medical navigation app built with Jetpack Compose, Google Maps SDK, and Material 3. Features a "Calm Care" healthcare design system with teal primary colors, glassmorphism, and 24dp radii.

## Features

### 🗺️ Map & Navigation
- **Medical-only Google Map Style** - Hides all non-medical POIs (restaurants, retail, etc.)
- **Satellite ⇄ Normal Toggle** - Floating glassmorphic FAB for map type switching
- **Custom Medical Markers** - Hospitals (red + cross), Clinics (teal + stethoscope), Pharmacies (green + pill)
- **Turn-by-Turn Navigation** - Live HUD with maneuver icons, distance countdown, street instructions
- **Built-in Simulation Engine** - Coroutine-based vehicle animation along route polyline
- **Gradient Route Polyline** - Teal to sky-blue gradient (8dp width) from user to destination

### 🏥 Medical Facilities
- **5 Pre-populated Chennai Facilities** with realistic data:
  1. Apollo Speciality Hospital (Multi-speciality, 6 ICU beds, 1.2km)
  2. Fortis Malar Hospital (Emergency, 2 ICU beds, 2.5km)
  3. Apollo 24/7 Pharmacy (24h, critical meds, 450m)
  4. MedPlus 24x7 Chemist (24h, 800m)
  5. Dr. Meenakshi Sundaram Clinic (OPD 9AM-8PM, 1.8km)

### 🎨 Calm Care Design System
- **Primary Teal**: #0FA397
- **Primary Dark**: #0D9488
- **Light Tint**: #EEF7FB
- **Accent Sky Blue**: #3B9BF0
- **Emergency Crimson**: #E5484D
- **Success Green**: #22A06B
- **Glass Cards**: #EEFFFFFF surface, #66E2E8F0 border, 24dp radius
- **Navigation HUD**: #F00F172A deep slate for high contrast

### 🔧 Technical Stack
- **Kotlin** + **Jetpack Compose** (Material 3)
- **Google Maps Compose** (maps-compose:4.3.3)
- **Play Services Maps** (18.2.0) + **Location** (21.2.0)
- **Coroutines & Flow** for reactive state
- **Kotlinx Serialization** for mock data
- **ViewModel** for state management
- **Edge-to-edge** immersive display

## Project Structure

```
app/
├── src/main/
│   ├── java/com/medical/navigation/
│   │   ├── MainActivity.kt                 # Entry point
│   │   ├── model/
│   │   │   └── MedicalModels.kt           # Data models & mock data
│   │   ├── viewmodel/
│   │   │   └── MedicalNavigationViewModel.kt  # State & navigation logic
│   │   ├── ui/
│   │   │   ├── theme/
│   │   │   │   └── CalmCareTheme.kt       # Colors, typography, shapes
│   │   │   └── components/
│   │   │       ├── MedicalComponents.kt   # Markers, filters, detail card
│   │   │       └── NavigationComponents.kt # HUD, controls
│   │   └── screen/
│   │       └── MedicalNavigationMapScreen.kt # Main composable
│   ├── res/
│   │   ├── values/
│   │   │   ├── colors.xml      # Calm Care palette
│   │   │   ├── strings.xml
│   │   │   └── themes.xml      # Material3 theme
│   │   ├── drawable/           # 25+ vector icons
│   │   └── xml/                # Backup/data extraction rules
│   ├── AndroidManifest.xml     # Permissions & API key
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

## Setup Instructions

### 1. Zero Configuration Map (OpenStreetMap)
The app is powered by **OpenStreetMap (OsmDroid)**:
- **No API Key required!**
- **No Credit Card or Google Cloud billing required!**
- **100% Free** and works right out of the box.

### 2. Build & Run
```bash
./gradlew assembleDebug
```

Or open in Android Studio and click **Run**.

### 3. Permissions
The app requests at runtime:
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `INTERNET`
- `CALL_PHONE` (for emergency dialing)

## Key Implementation Details

### Medical Map Style (JSON)
```json
[
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi.medical", "elementType": "all", "stylers": [{ "visibility": "on" }] },
  { "featureType": "transit.station", "elementType": "all", "stylers": [{ "visibility": "simplified" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "lightness": 10 }] }
]
```

### Navigation Simulation
- 5-step route from user location to Apollo Hospital
- Coroutine animates vehicle marker along 15 polyline points
- Updates HUD distance/ETA in real-time
- Auto-advances maneuver instructions at waypoints
- Voice announcement hooks (TTS integration ready)

### Filter Chips
| Filter | Facilities Shown |
|--------|------------------|
| All Medical | All 5 |
| 🚨 24/7 Emergency & ICU | Apollo, Fortis |
| 🏥 Multi-Speciality | Apollo, Fortis |
| 🩺 Clinics | Meenakshi Clinic |
| 💊 24/7 Medical Shops | Apollo Pharmacy, MedPlus |

## Customization

### Add New Facilities
Edit `MedicalModels.kt` → `MedicalFacility.createMockFacilities()`

### Modify Navigation Route
Edit `MockNavigationData.apolloRouteSteps` and `routePolylinePoints`

### Change Design Colors
Edit `CalmCareTheme.kt` → `CalmCareLightColorScheme` / `CalmCareDarkColorScheme`

### Adjust Map Style
Modify the JSON string in `MedicalNavigationMapScreen.kt`

## Requirements

- **minSdk**: 26 (Android 8.0)
- **targetSdk**: 34 (Android 14)
- **Kotlin**: 1.9.22
- **Compose Compiler**: 1.5.12
- **Java**: 17

## License

MIT License - Free for commercial and personal use.