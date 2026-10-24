package com.medical.navigation.model

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.Stable
import java.io.Serializable

/**
 * Medical facility types supported by the Calm Care design system
 */
enum class FacilityType(val displayName: String, val iconName: String, val badgeColor: Long) {
    HOSPITAL("Hospital", "medical_cross", 0xFFE5484D),      // Emergency Crimson
    CLINIC("Clinic", "stethoscope", 0xFF0FA397),           // Primary Teal
    PHARMACY("Pharmacy", "pill", 0xFF22A06B)               // Success Green
}

/**
 * Navigation maneuver types for turn-by-turn directions
 */
enum class ManeuverType(val iconName: String, val instruction: String) {
    STRAIGHT("arrow_upward", "Continue straight"),
    TURN_RIGHT("turn_right", "Turn right"),
    TURN_LEFT("turn_left", "Turn left"),
    SLIGHT_RIGHT("turn_slight_right", "Slight right"),
    SLIGHT_LEFT("turn_slight_left", "Slight left"),
    U_TURN("u_turn", "Make a U-turn"),
    ARRIVE("flag", "Arrived at destination"),
    ROUNDABOUT("roundabout", "Enter roundabout"),
    EXIT_ROUNDABOUT("exit_roundabout", "Exit roundabout")
}

/**
 * Navigation step representing a single maneuver in the route
 */
data class NavigationStep(
    val maneuver: ManeuverType,
    val instruction: String,
    val distanceMeters: Int,
    val streetName: String,
    val durationSeconds: Int
) : Serializable

/**
 * Medical facility model with rich metadata for the Calm Care system
 */
@Stable
data class MedicalFacility(
    val id: String,
    val name: String,
    val type: FacilityType,
    val latitude: Double,
    val longitude: Double,
    val address: String,
    val phoneNumber: String,
    val isOpen24Hours: Boolean,
    val icuBedsAvailable: Int,
    val specialities: List<String>,
    val distanceKm: Double = 0.0,
    val etaMinutes: Int = 0,
    val hasEmergencyServices: Boolean = false,
    val criticalMedsInStock: Boolean = false
) : Serializable {
    
    companion object {
        fun createMockFacilities(): List<MedicalFacility> {
            val baseLat = 13.0604
            val baseLng = 80.2496
            
            return listOf(
                MedicalFacility(
                    id = "apollo_main",
                    name = "Apollo Speciality Hospital",
                    type = FacilityType.HOSPITAL,
                    latitude = baseLat + 0.012,
                    longitude = baseLng + 0.008,
                    address = "21, Greams Lane, Off Greams Road, Thousand Lights, Chennai, Tamil Nadu 600006",
                    phoneNumber = "+91 44 2829 0200",
                    isOpen24Hours = true,
                    icuBedsAvailable = 6,
                    specialities = listOf("Cardiology", "Neurology", "Oncology", "Orthopedics", "Emergency & Trauma", "ICU"),
                    distanceKm = 1.2,
                    etaMinutes = 5,
                    hasEmergencyServices = true,
                    criticalMedsInStock = true
                ),
                MedicalFacility(
                    id = "fortis_malar",
                    name = "Fortis Malar Hospital",
                    type = FacilityType.HOSPITAL,
                    latitude = baseLat - 0.015,
                    longitude = baseLng + 0.020,
                    address = "52, 1st Main Road, Gandhi Nagar, Adyar, Chennai, Tamil Nadu 600020",
                    phoneNumber = "+91 44 4289 2222",
                    isOpen24Hours = true,
                    icuBedsAvailable = 2,
                    specialities = listOf("Cardiac Sciences", "Neurosciences", "Orthopedics", "Emergency Medicine", "Critical Care"),
                    distanceKm = 2.5,
                    etaMinutes = 8,
                    hasEmergencyServices = true,
                    criticalMedsInStock = false
                ),
                MedicalFacility(
                    id = "apollo_pharmacy",
                    name = "Apollo 24/7 Pharmacy",
                    type = FacilityType.PHARMACY,
                    latitude = baseLat + 0.004,
                    longitude = baseLng - 0.003,
                    address = "Shop No. 3, Greams Road, Thousand Lights, Chennai, Tamil Nadu 600006",
                    phoneNumber = "044 2829 1111",
                    isOpen24Hours = true,
                    icuBedsAvailable = 0,
                    specialities = listOf("Prescription Medicines", "OTC Drugs", "Medical Devices", "Health Supplements"),
                    distanceKm = 0.45,
                    etaMinutes = 2,
                    hasEmergencyServices = false,
                    criticalMedsInStock = true
                ),
                MedicalFacility(
                    id = "medplus_chemist",
                    name = "MedPlus 24x7 Chemist",
                    type = FacilityType.PHARMACY,
                    latitude = baseLat - 0.006,
                    longitude = baseLng - 0.007,
                    address = "No. 45, Anna Salai, Teynampet, Chennai, Tamil Nadu 600018",
                    phoneNumber = "+91 98400 11223",
                    isOpen24Hours = true,
                    icuBedsAvailable = 0,
                    specialities = listOf("Generic Medicines", "Chronic Care", "Wellness Products", "Home Delivery"),
                    distanceKm = 0.8,
                    etaMinutes = 3,
                    hasEmergencyServices = false,
                    criticalMedsInStock = true
                ),
                MedicalFacility(
                    id = "meenakshi_clinic",
                    name = "Dr. Meenakshi Sundaram Clinic",
                    type = FacilityType.CLINIC,
                    latitude = baseLat + 0.018,
                    longitude = baseLng - 0.012,
                    address = "12, Cathedral Road, Gopalapuram, Chennai, Tamil Nadu 600086",
                    phoneNumber = "+91 44 2499 5566",
                    isOpen24Hours = false,
                    icuBedsAvailable = 0,
                    specialities = listOf("General Medicine", "Diabetology", "Hypertension", "Preventive Health Checkup"),
                    distanceKm = 1.8,
                    etaMinutes = 6,
                    hasEmergencyServices = false,
                    criticalMedsInStock = false
                )
            )
        }
    }
}

/**
 * Filter categories for medical facility filtering
 */
enum class MedicalFilter(val label: String, val icon: String, val types: List<FacilityType>) {
    ALL("All Medical", "medical_services", listOf(FacilityType.HOSPITAL, FacilityType.CLINIC, FacilityType.PHARMACY)),
    EMERGENCY_24_7("🚨 24/7 Emergency & ICU", "emergency", listOf(FacilityType.HOSPITAL)),
    MULTI_SPECIALITY("🏥 Multi-Speciality", "local_hospital", listOf(FacilityType.HOSPITAL)),
    CLINICS("🩺 Clinics", "medical_services", listOf(FacilityType.CLINIC)),
    PHARMACY_24_7("💊 24/7 Medical Shops", "pharmacy", listOf(FacilityType.PHARMACY));
    
    fun matches(facility: MedicalFacility): Boolean {
        return when (this) {
            ALL -> true
            EMERGENCY_24_7 -> facility.type == FacilityType.HOSPITAL && facility.hasEmergencyServices && facility.isOpen24Hours
            MULTI_SPECIALITY -> facility.type == FacilityType.HOSPITAL && facility.specialities.size >= 3
            CLINICS -> facility.type == FacilityType.CLINIC
            PHARMACY_24_7 -> facility.type == FacilityType.PHARMACY && facility.isOpen24Hours
        }
    }
}

/**
 * Navigation state for turn-by-turn simulation
 */
data class NavigationState(
    val isNavigating: Boolean = false,
    val currentStepIndex: Int = 0,
    val steps: List<NavigationStep> = emptyList(),
    val totalDistanceMeters: Int = 0,
    val totalDurationSeconds: Int = 0,
    val remainingDistanceMeters: Int = 0,
    val remainingDurationSeconds: Int = 0,
    val currentVehiclePosition: VehiclePosition? = null,
    val isMuted: Boolean = false,
    val destination: MedicalFacility? = null
)

/**
 * Vehicle position during navigation simulation
 */
@Stable
data class VehiclePosition(
    val latitude: Double,
    val longitude: Double,
    val bearing: Float = 0f,
    val progress: Float = 0f // 0.0 to 1.0 along current step
) {
    companion object {
        fun initial(lat: Double, lng: Double) = VehiclePosition(lat, lng, 0f, 0f)
    }
}

/**
 * Map display mode
 */
enum class MapDisplayMode {
    NORMAL,
    SATELLITE,
    HYBRID
}

/**
 * Mock navigation steps for Apollo Hospital route simulation
 */
object MockNavigationData {
    val apolloRouteSteps = listOf(
        NavigationStep(
            maneuver = ManeuverType.STRAIGHT,
            instruction = "Head north on Hospital Entrance Rd",
            distanceMeters = 200,
            streetName = "Hospital Entrance Rd",
            durationSeconds = 30
        ),
        NavigationStep(
            maneuver = ManeuverType.TURN_RIGHT,
            instruction = "Turn Right onto Anna Salai",
            distanceMeters = 400,
            streetName = "Anna Salai",
            durationSeconds = 60
        ),
        NavigationStep(
            maneuver = ManeuverType.TURN_LEFT,
            instruction = "Turn Left onto Greams Road",
            distanceMeters = 600,
            streetName = "Greams Road",
            durationSeconds = 90
        ),
        NavigationStep(
            maneuver = ManeuverType.SLIGHT_RIGHT,
            instruction = "Take slight right toward Casualty Gate",
            distanceMeters = 150,
            streetName = "Casualty Access Road",
            durationSeconds = 25
        ),
        NavigationStep(
            maneuver = ManeuverType.ARRIVE,
            instruction = "Arrived at Apollo Emergency Center on Right",
            distanceMeters = 0,
            streetName = "Apollo Emergency Center",
            durationSeconds = 0
        )
    )
    
    // Simulated route polyline points (Chennai area coordinates)
    val routePolylinePoints = listOf(
        // Start near user location
        13.0604 to 80.2496,
        13.0610 to 80.2498,
        13.0615 to 80.2500,
        13.0620 to 80.2502,
        // Turn right onto Anna Salai
        13.0625 to 80.2505,
        13.0630 to 80.2510,
        13.0635 to 80.2515,
        13.0640 to 80.2520,
        // Turn left onto Greams Road
        13.0645 to 80.2525,
        13.0650 to 80.2530,
        13.0655 to 80.2535,
        13.0660 to 80.2540,
        13.0665 to 80.2545,
        13.0670 to 80.2550,
        // Slight right to casualty
        13.0672 to 80.2553,
        13.0674 to 80.2556,
        // Arrive at Apollo
        13.0676 to 80.2558
    )
    
    val apolloDestination = MedicalFacility.createMockFacilities().first { it.id == "apollo_main" }
}