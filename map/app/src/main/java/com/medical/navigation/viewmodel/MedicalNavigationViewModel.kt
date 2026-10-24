package com.medical.navigation.viewmodel

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.Stable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.medical.navigation.model.FacilityType
import com.medical.navigation.model.MedicalFacility
import com.medical.navigation.model.MedicalFilter
import com.medical.navigation.model.MockNavigationData
import com.medical.navigation.model.NavigationState
import com.medical.navigation.model.VehiclePosition
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * ViewModel for Medical Navigation Map Screen
 * Handles all state management, filtering, and navigation simulation
 */
@Stable
class MedicalNavigationViewModel : ViewModel() {
    
    // All medical facilities
    private val _allFacilities = mutableStateListOf<MedicalFacility>().apply {
        addAll(MedicalFacility.createMockFacilities())
    }
    val allFacilities: List<MedicalFacility> = _allFacilities
    
    // Selected facility for bottom sheet
    var selectedFacility by mutableStateOf<MedicalFacility?>(null)
        private set
    
    // Current filter
    var selectedFilter by mutableStateOf<MedicalFilter>(MedicalFilter.ALL)
        private set
    
    // Map display mode
    var mapDisplayMode by mutableStateOf<com.medical.navigation.model.MapDisplayMode>(com.medical.navigation.model.MapDisplayMode.NORMAL)
        private set
    
    // Bottom sheet visibility
    var showBottomSheet by mutableStateOf(false)
        private set
    
    // Navigation state
    var navigationState by mutableStateOf(NavigationState())
        private set
    
    // Trigger for recentering map
    var recenterTrigger by mutableStateOf(0L)
        private set
    
    /**
     * Get filtered facilities based on current filter
     */
    fun getFilteredFacilities(): List<MedicalFacility> {
        return when (selectedFilter) {
            MedicalFilter.ALL -> allFacilities
            else -> allFacilities.filter { selectedFilter.matches(it) }
        }
    }
    
    /**
     * Handle filter change
     */
    fun onFilterChange(filter: MedicalFilter) {
        selectedFilter = filter
    }
    
    /**
     * Toggle map display mode: NORMAL -> HYBRID -> SATELLITE -> NORMAL
     */
    fun toggleMapDisplayMode() {
        mapDisplayMode = when (mapDisplayMode) {
            com.medical.navigation.model.MapDisplayMode.NORMAL -> com.medical.navigation.model.MapDisplayMode.HYBRID
            com.medical.navigation.model.MapDisplayMode.HYBRID -> com.medical.navigation.model.MapDisplayMode.SATELLITE
            com.medical.navigation.model.MapDisplayMode.SATELLITE -> com.medical.navigation.model.MapDisplayMode.NORMAL
        }
    }
    
    /**
     * Handle facility marker click
     */
    fun onFacilityClick(facility: MedicalFacility) {
        selectedFacility = facility
        showBottomSheet = true
    }
    
    /**
     * Handle map click (dismiss bottom sheet)
     */
    fun onMapClick(lat: Double = 0.0, lng: Double = 0.0) {
        if (showBottomSheet) {
            dismissBottomSheet()
        }
    }
    
    /**
     * Dismiss bottom sheet
     */
    fun dismissBottomSheet() {
        selectedFacility = null
        showBottomSheet = false
    }
    
    /**
     * Start navigation to a facility
     */
    fun startNavigationTo(facility: MedicalFacility) {
        val steps = MockNavigationData.apolloRouteSteps
        val totalDistance = steps.sumOf { it.distanceMeters }
        val totalDuration = steps.sumOf { it.durationSeconds }
        
        navigationState = NavigationState(
            isNavigating = true,
            currentStepIndex = 0,
            steps = steps,
            totalDistanceMeters = totalDistance,
            totalDurationSeconds = totalDuration,
            remainingDistanceMeters = totalDistance,
            remainingDurationSeconds = totalDuration,
            currentVehiclePosition = VehiclePosition.initial(13.0604, 80.2496),
            isMuted = false,
            destination = facility
        )
        
        dismissBottomSheet()
    }
    
    /**
     * End navigation and return to map view
     */
    fun endNavigation() {
        navigationState = NavigationState()
    }
    
    /**
     * Recenter map to current location
     */
    fun recenterMap() {
        recenterTrigger = System.currentTimeMillis()
    }
    
    /**
     * Toggle voice guidance mute
     */
    fun toggleMute() {
        navigationState = navigationState.copy(isMuted = !navigationState.isMuted)
    }
    
    /**
     * Start navigation simulation coroutine
     */
    fun startNavigationSimulation() {
        viewModelScope.launch {
            simulateNavigation()
        }
    }
    
    /**
     * Simulate vehicle movement along route
     */
    private suspend fun simulateNavigation() {
        val routePoints = MockNavigationData.routePolylinePoints
        val steps = navigationState.steps
        var currentStepIndex = 0
        var pointIndex = 0
        var stepProgress = 0.0f
        
        while (navigationState.isNavigating && currentStepIndex < steps.size) {
            val currentStep = steps[currentStepIndex]
            val stepDistance = currentStep.distanceMeters.toFloat()
            val stepPoints = getPointsForStep(currentStepIndex, routePoints, steps.size)
            
            if (stepPoints.size < 2) {
                currentStepIndex++
                pointIndex = 0
                stepProgress = 0f
                continue
            }
            
            // Simulate movement along this step
            for (i in 0 until stepPoints.size - 1) {
                if (!navigationState.isNavigating) break
                
                val startPoint = stepPoints[i]
                val endPoint = stepPoints[i + 1]
                
                // Interpolate position along segment
                val segmentDuration = (currentStep.durationSeconds.toFloat() / stepPoints.size).coerceAtLeast(1f)
                val frames = (segmentDuration * 10).toInt() // 10 updates per second
                
                for (frame in 0..frames) {
                    if (!navigationState.isNavigating) break
                    
                    val t = frame / frames.toFloat()
                    val lat = startPoint.first + (endPoint.first - startPoint.first) * t
                    val lng = startPoint.second + (endPoint.second - startPoint.second) * t
                    val bearing = calculateBearing(startPoint.first, startPoint.second, endPoint.first, endPoint.second)
                    
                    // Update vehicle position
                    val progress = (pointIndex + t) / routePoints.size
                    val remainingDistance = calculateRemainingDistance(currentStepIndex, stepProgress, steps)
                    val remainingDuration = calculateRemainingDuration(currentStepIndex, stepProgress, steps)
                    
                    navigationState = navigationState.copy(
                        currentVehiclePosition = VehiclePosition(lat, lng, bearing, progress),
                        remainingDistanceMeters = remainingDistance,
                        remainingDurationSeconds = remainingDuration
                    )
                    
                    delay(100) // 100ms per frame = 10 FPS
                }
                
                pointIndex++
                stepProgress = pointIndex / stepPoints.size.toFloat()
            }
            
            // Move to next step
            currentStepIndex++
            pointIndex = 0
            stepProgress = 0f
            
            if (currentStepIndex < steps.size) {
                navigationState = navigationState.copy(currentStepIndex = currentStepIndex)
                
                // Voice announcement for next maneuver (if not muted)
                if (!navigationState.isMuted) {
                    announceManeuver(steps[currentStepIndex])
                }
            } else {
                // Arrived at destination
                navigationState = navigationState.copy(
                    currentStepIndex = steps.size - 1,
                    remainingDistanceMeters = 0,
                    remainingDurationSeconds = 0
                )
                
                if (!navigationState.isMuted) {
                    announceArrival()
                }
                
                // Auto-end navigation after arrival delay
                delay(3000)
                if (navigationState.isNavigating) {
                    endNavigation()
                }
                break
            }
        }
    }
    
    /**
     * Get route points for a specific step
     */
    private fun getPointsForStep(stepIndex: Int, allPoints: List<Pair<Double, Double>>, totalSteps: Int): List<Pair<Double, Double>> {
        val pointsPerStep = (allPoints.size / totalSteps.coerceAtLeast(1)).coerceAtLeast(1)
        val start = stepIndex * pointsPerStep
        val end = if (stepIndex == totalSteps - 1) allPoints.size else (stepIndex + 1) * pointsPerStep + 1
        return allPoints.subList(start, end.coerceAtMost(allPoints.size))
    }
    
    /**
     * Calculate bearing between two points
     */
    private fun calculateBearing(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Float {
        val dLng = Math.toRadians(lng2 - lng1)
        val lat1Rad = Math.toRadians(lat1)
        val lat2Rad = Math.toRadians(lat2)
        
        val y = Math.sin(dLng) * Math.cos(lat2Rad)
        val x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)
        val bearing = Math.toDegrees(Math.atan2(y, x))
        return (((bearing + 360) % 360)).toFloat()
    }
    
    /**
     * Calculate remaining distance
     */
    private fun calculateRemainingDistance(currentStep: Int, progress: Float, steps: List<com.medical.navigation.model.NavigationStep>): Int {
        var remaining = 0
        for (i in currentStep until steps.size) {
            if (i == currentStep) {
                remaining += (steps[i].distanceMeters * (1 - progress)).toInt()
            } else {
                remaining += steps[i].distanceMeters
            }
        }
        return remaining.coerceAtLeast(0)
    }
    
    /**
     * Calculate remaining duration
     */
    private fun calculateRemainingDuration(currentStep: Int, progress: Float, steps: List<com.medical.navigation.model.NavigationStep>): Int {
        var remaining = 0
        for (i in currentStep until steps.size) {
            if (i == currentStep) {
                remaining += (steps[i].durationSeconds * (1 - progress)).toInt()
            } else {
                remaining += steps[i].durationSeconds
            }
        }
        return remaining.coerceAtLeast(0)
    }
    
    /**
     * Voice announcement for maneuver (placeholder for TTS integration)
     */
    private fun announceManeuver(step: com.medical.navigation.model.NavigationStep) {
        Log.d("NavigationTTS", "Maneuver: ${step.instruction} in ${step.distanceMeters}m")
        // TODO: Integrate with TextToSpeech for actual voice guidance
    }
    
    /**
     * Voice announcement for arrival
     */
    private fun announceArrival() {
        Log.d("NavigationTTS", "Arrived at destination")
        // TODO: Integrate with TextToSpeech
    }
}